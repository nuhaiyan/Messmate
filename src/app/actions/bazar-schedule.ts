'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireManager } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';
import { computeScheduleStatus, formatScheduleRange, getDhakaTodayString, toDhakaDateString } from '@/lib/bazar/schedule-utils';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside request context
  }
}

/**
 * Synchronizes the published Bazar Schedule Notice in the Mess Notice table
 * so it automatically stays up-to-date with current schedules.
 */
export async function syncBazarScheduleNotice(messId: string, month: number, year: number, userId?: string) {
  try {
    // Fetch all schedules for this month/year or surrounding
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const schedules = await prisma.bazarSchedule.findMany({
      where: {
        messId,
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      include: {
        member: { select: { fullName: true, phone: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthTitle = `${monthNames[month - 1]} ${year}`;
    const noticeTitle = `Bazar Schedule — ${monthTitle}`;

    let content = `### ${monthTitle} Bazar Schedule\n\n`;
    if (schedules.length === 0) {
      content += `No bazar schedule has been published for ${monthTitle} yet.`;
    } else {
      content += `| Date Range | Responsible Member | Status |\n`;
      content += `|---|---|---|\n`;
      for (const s of schedules) {
        const range = formatScheduleRange(s.startDate, s.endDate, 'en');
        const status = computeScheduleStatus(s.startDate, s.endDate);
        const statusBadge = status === 'ONGOING' ? '**Ongoing**' : status === 'UPCOMING' ? 'Upcoming' : 'Completed';
        content += `| ${range} | ${s.member.fullName} | ${statusBadge} |\n`;
      }
    }

    // Find existing notice for this month's bazar schedule
    const existingNotice = await prisma.notice.findFirst({
      where: {
        messId,
        category: 'BAZAR_SCHEDULE',
        month,
        year,
      },
    });

    if (existingNotice) {
      await prisma.notice.update({
        where: { id: existingNotice.id },
        data: {
          title: noticeTitle,
          content,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.notice.create({
        data: {
          messId,
          title: noticeTitle,
          content,
          category: 'BAZAR_SCHEDULE',
          month,
          year,
          isPinned: true,
          createdById: userId || null,
        },
      });
    }

    safeRevalidate('/notices');
    safeRevalidate('/dashboard');
  } catch (err) {
    console.error('Failed to auto-sync bazar schedule notice:', err);
  }
}

/**
 * Creates a new Date-Range Bazar Schedule
 * Requires Manager or Admin authority.
 */
export async function createBazarScheduleAction(data: {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  memberId: string;
  notes?: string;
  allowOverlapWarning?: boolean;
}) {
  const session = await requireManager();

  const startStr = toDhakaDateString(data.startDate);
  const endStr = toDhakaDateString(data.endDate);

  if (!startStr || !endStr) {
    return { success: false, error: 'Start Date and End Date are required.' };
  }

  if (endStr < startStr) {
    return { success: false, error: 'End Date cannot be earlier than Start Date.' };
  }

  // 1. Verify responsible member is active and not archived
  const member = await prisma.messMember.findUnique({
    where: { id: data.memberId },
  });

  if (!member || !member.isActive || member.isArchived) {
    return {
      success: false,
      error: 'Responsible member must be an active member of the mess.',
    };
  }

  const startDateObj = new Date(`${startStr}T00:00:00.000Z`);
  const endDateObj = new Date(`${endStr}T23:59:59.999Z`);

  // 2. Prevent overlapping schedules for the SAME member
  const sameMemberOverlap = await prisma.bazarSchedule.findFirst({
    where: {
      messId: session.messId,
      memberId: data.memberId,
      startDate: { lte: endDateObj },
      endDate: { gte: startDateObj },
    },
  });

  if (sameMemberOverlap) {
    const range = formatScheduleRange(sameMemberOverlap.startDate, sameMemberOverlap.endDate);
    return {
      success: false,
      error: `${member.fullName} already has a bazar schedule from ${range}. Schedules for the same member cannot overlap.`,
    };
  }

  // 3. Check if another member is already scheduled for overlapping dates (Warning)
  if (!data.allowOverlapWarning) {
    const otherMemberOverlap = await prisma.bazarSchedule.findFirst({
      where: {
        messId: session.messId,
        memberId: { not: data.memberId },
        startDate: { lte: endDateObj },
        endDate: { gte: startDateObj },
      },
      include: { member: { select: { fullName: true } } },
    });

    if (otherMemberOverlap) {
      const range = formatScheduleRange(otherMemberOverlap.startDate, otherMemberOverlap.endDate);
      return {
        success: false,
        warning: true,
        error: `Another member (${otherMemberOverlap.member.fullName}) already has a schedule from ${range}. Do you want to proceed anyway?`,
      };
    }
  }

  const status = computeScheduleStatus(startDateObj, endDateObj);

  const schedule = await prisma.bazarSchedule.create({
    data: {
      messId: session.messId,
      memberId: data.memberId,
      startDate: startDateObj,
      endDate: endDateObj,
      status,
      notes: data.notes || null,
      createdById: session.userId,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'BAZAR_SCHEDULE_CREATED',
    entity: 'BAZAR_SCHEDULE',
    entityId: schedule.id,
    details: {
      memberName: member.fullName,
      startDate: startStr,
      endDate: endStr,
      status,
    },
  });

  // Automatically synchronize notice
  const targetMonth = startDateObj.getUTCMonth() + 1;
  const targetYear = startDateObj.getUTCFullYear();
  await syncBazarScheduleNotice(session.messId, targetMonth, targetYear, session.userId);

  safeRevalidate('/bazar');
  safeRevalidate('/dashboard');
  safeRevalidate('/members');
  safeRevalidate(`/members/${member.id}`);
  safeRevalidate('/profile');
  return { success: true, scheduleId: schedule.id };
}

/**
 * Updates an existing Bazar Schedule
 */
export async function updateBazarScheduleAction(
  scheduleId: string,
  data: {
    startDate: string;
    endDate: string;
    memberId: string;
    notes?: string;
  }
) {
  const session = await requireManager();

  const existing = await prisma.bazarSchedule.findUnique({
    where: { id: scheduleId },
    include: { member: true },
  });

  if (!existing || existing.messId !== session.messId) {
    return { success: false, error: 'Bazar schedule not found.' };
  }

  const startStr = toDhakaDateString(data.startDate);
  const endStr = toDhakaDateString(data.endDate);

  if (endStr < startStr) {
    return { success: false, error: 'End Date cannot be earlier than Start Date.' };
  }

  const member = await prisma.messMember.findUnique({
    where: { id: data.memberId },
  });

  if (!member || !member.isActive || member.isArchived) {
    return { success: false, error: 'Responsible member must be active.' };
  }

  const startDateObj = new Date(`${startStr}T00:00:00.000Z`);
  const endDateObj = new Date(`${endStr}T23:59:59.999Z`);

  // Prevent overlapping schedules for the SAME member (excluding this schedule)
  const sameMemberOverlap = await prisma.bazarSchedule.findFirst({
    where: {
      id: { not: scheduleId },
      messId: session.messId,
      memberId: data.memberId,
      startDate: { lte: endDateObj },
      endDate: { gte: startDateObj },
    },
  });

  if (sameMemberOverlap) {
    const range = formatScheduleRange(sameMemberOverlap.startDate, sameMemberOverlap.endDate);
    return {
      success: false,
      error: `${member.fullName} already has an overlapping schedule from ${range}.`,
    };
  }

  const status = computeScheduleStatus(startDateObj, endDateObj);

  await prisma.bazarSchedule.update({
    where: { id: scheduleId },
    data: {
      memberId: data.memberId,
      startDate: startDateObj,
      endDate: endDateObj,
      status,
      notes: data.notes || null,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'BAZAR_SCHEDULE_UPDATED',
    entity: 'BAZAR_SCHEDULE',
    entityId: scheduleId,
    details: {
      previousMember: existing.member.fullName,
      newMember: member.fullName,
      startDate: startStr,
      endDate: endStr,
    },
  });

  const targetMonth = startDateObj.getUTCMonth() + 1;
  const targetYear = startDateObj.getUTCFullYear();
  await syncBazarScheduleNotice(session.messId, targetMonth, targetYear, session.userId);

  safeRevalidate('/bazar');
  safeRevalidate('/dashboard');
  safeRevalidate('/members');
  safeRevalidate(`/members/${member.id}`);
  safeRevalidate('/profile');
  return { success: true };
}

/**
 * Deletes a Bazar Schedule
 */
export async function deleteBazarScheduleAction(scheduleId: string) {
  const session = await requireManager();

  const existing = await prisma.bazarSchedule.findUnique({
    where: { id: scheduleId },
    include: { member: true },
  });

  if (!existing || existing.messId !== session.messId) {
    return { success: false, error: 'Bazar schedule not found.' };
  }

  await prisma.bazarSchedule.delete({
    where: { id: scheduleId },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'BAZAR_SCHEDULE_DELETED',
    entity: 'BAZAR_SCHEDULE',
    entityId: scheduleId,
    details: {
      member: existing.member.fullName,
      range: formatScheduleRange(existing.startDate, existing.endDate),
    },
  });

  const targetMonth = existing.startDate.getUTCMonth() + 1;
  const targetYear = existing.startDate.getUTCFullYear();
  await syncBazarScheduleNotice(session.messId, targetMonth, targetYear, session.userId);

  safeRevalidate('/bazar');
  safeRevalidate('/dashboard');
  safeRevalidate('/members');
  safeRevalidate(`/members/${existing.memberId}`);
  safeRevalidate('/profile');
  return { success: true };
}

/**
 * Gets all bazar schedules with status dynamically refreshed
 */
export async function getBazarSchedulesAction(messId: string, month?: number, year?: number) {
  const where: any = { messId };

  if (month && year) {
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    where.startDate = { lte: monthEnd };
    where.endDate = { gte: monthStart };
  }

  const schedules = await prisma.bazarSchedule.findMany({
    where,
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          phone: true,
          isActive: true,
        },
      },
    },
    orderBy: { startDate: 'asc' },
  });

  return schedules.map((s) => ({
    id: s.id,
    memberId: s.memberId,
    memberName: s.member.fullName,
    memberAvatar: s.member.avatarUrl,
    memberPhone: s.member.phone,
    startDate: toDhakaDateString(s.startDate),
    endDate: toDhakaDateString(s.endDate),
    status: computeScheduleStatus(s.startDate, s.endDate),
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
  }));
}
