'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireManager } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside request context (e.g. testing)
  }
}

export interface BulkMealInput {
  memberId: string;
  breakfast: number;
  lunch: number;
  dinner: number;
}

export async function saveBulkMealsAction(data: {
  date: string; // YYYY-MM-DD
  meals: BulkMealInput[];
}) {
  const session = await requireManager();
  const mealDate = new Date(`${data.date}T12:00:00Z`);
  const year = mealDate.getUTCFullYear();
  const month = mealDate.getUTCMonth() + 1;

  // Find or create monthly period
  let period = await prisma.monthlyPeriod.findUnique({
    where: {
      messId_year_month: {
        messId: session.messId,
        year,
        month,
      },
    },
  });

  if (!period) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    period = await prisma.monthlyPeriod.create({
      data: {
        messId: session.messId,
        year,
        month,
        startDate,
        endDate,
        isClosed: false,
      },
    });
  }

  if (period.isClosed) {
    return {
      success: false,
      error: `Cannot modify meals for ${data.date}. This month (${month}/${year}) is CLOSED and locked.`,
    };
  }

  // Active eligible members check: Deactivated/Archived members cannot receive new meal entries
  const activeMembers = await prisma.messMember.findMany({
    where: { messId: session.messId, isActive: true, isArchived: false },
    select: { id: true, fullName: true },
  });
  const activeMap = new Map(activeMembers.map((m) => [m.id, m.fullName]));

  let totalUpdated = 0;

  // Execute in database transaction
  await prisma.$transaction(async (tx) => {
    for (const item of data.meals) {
      if (!activeMap.has(item.memberId)) {
        // Skip or ignore inactive/archived members
        continue;
      }

      const bf = Math.max(0, Number(item.breakfast) || 0);
      const ln = Math.max(0, Number(item.lunch) || 0);
      const dn = Math.max(0, Number(item.dinner) || 0);
      const total = bf + ln + dn;

      // Upsert meal entry
      await tx.mealEntry.upsert({
        where: {
          memberId_date: {
            memberId: item.memberId,
            date: mealDate,
          },
        },
        create: {
          messId: session.messId,
          periodId: period.id,
          memberId: item.memberId,
          date: mealDate,
          breakfast: bf,
          lunch: ln,
          dinner: dn,
          totalMeals: total,
          createdById: session.userId,
        },
        update: {
          breakfast: bf,
          lunch: ln,
          dinner: dn,
          totalMeals: total,
        },
      });
      totalUpdated++;
    }
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MEAL_BULK_ENTRY',
    entity: 'MEAL',
    details: { date: data.date, memberCount: totalUpdated },
  });

  safeRevalidate('/meals');
  safeRevalidate('/dashboard');
  safeRevalidate('/reports');
  return { success: true, count: totalUpdated };
}

export async function copyPreviousDayMealsAction(targetDateStr: string) {
  const session = await requireManager();
  const targetDate = new Date(`${targetDateStr}T12:00:00Z`);
  const prevDate = new Date(targetDate);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);

  // Fetch only active, non-archived members
  const activeMembers = await prisma.messMember.findMany({
    where: { messId: session.messId, isActive: true, isArchived: false },
    select: { id: true },
  });
  const activeIds = activeMembers.map((m) => m.id);

  // Fetch previous day's meals
  const prevMeals = await prisma.mealEntry.findMany({
    where: {
      messId: session.messId,
      date: prevDate,
      memberId: { in: activeIds },
    },
  });

  if (prevMeals.length === 0) {
    return { success: false, error: 'No meal records found for yesterday to copy.' };
  }

  const mealInputs: BulkMealInput[] = prevMeals.map((m) => ({
    memberId: m.memberId,
    breakfast: Number(m.breakfast),
    lunch: Number(m.lunch),
    dinner: Number(m.dinner),
  }));

  return await saveBulkMealsAction({
    date: targetDateStr,
    meals: mealInputs,
  });
}

/**
 * 3. Update Individual Member Meal Entry
 * - Regular members can ONLY edit their OWN meal entries.
 * - Admin and Manager can edit ANY member's meal entry.
 * - Month lock policy is strictly enforced.
 */
export async function updateMemberMealEntryAction(data: {
  memberId: string;
  date: string; // YYYY-MM-DD
  breakfast: number;
  lunch: number;
  dinner: number;
}) {
  const session = await requireAuth();

  const isManagement = session.isPrimaryAdmin || session.isAdmin || session.isManager;
  const isSelf = session.memberId === data.memberId;

  if (!isManagement && !isSelf) {
    return {
      success: false,
      error: 'অননুমোদিত: আপনি শুধুমাত্র নিজের মিল এন্ট্রি পরিবর্তন করতে পারবেন (Unauthorized: You can only edit your own meals).',
    };
  }

  // Active member check
  const targetMember = await prisma.messMember.findUnique({
    where: { id: data.memberId },
  });

  if (!targetMember || !targetMember.isActive || targetMember.isArchived) {
    return { success: false, error: 'Cannot update meals for a deactivated or archived member.' };
  }

  const mealDate = new Date(`${data.date}T12:00:00Z`);
  const year = mealDate.getUTCFullYear();
  const month = mealDate.getUTCMonth() + 1;

  let period = await prisma.monthlyPeriod.findUnique({
    where: {
      messId_year_month: {
        messId: session.messId,
        year,
        month,
      },
    },
  });

  if (!period) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    period = await prisma.monthlyPeriod.create({
      data: {
        messId: session.messId,
        year,
        month,
        startDate,
        endDate,
        isClosed: false,
      },
    });
  }

  if (period.isClosed) {
    return {
      success: false,
      error: `Cannot modify meals for ${data.date}. This month (${month}/${year}) is CLOSED and locked.`,
    };
  }

  const bf = Math.max(0, Number(data.breakfast) || 0);
  const ln = Math.max(0, Number(data.lunch) || 0);
  const dn = Math.max(0, Number(data.dinner) || 0);
  const total = bf + ln + dn;

  // Find existing meal entry to record previous values in audit log
  const existing = await prisma.mealEntry.findUnique({
    where: {
      memberId_date: {
        memberId: data.memberId,
        date: mealDate,
      },
    },
  });

  const entry = await prisma.mealEntry.upsert({
    where: {
      memberId_date: {
        memberId: data.memberId,
        date: mealDate,
      },
    },
    create: {
      messId: session.messId,
      periodId: period.id,
      memberId: data.memberId,
      date: mealDate,
      breakfast: bf,
      lunch: ln,
      dinner: dn,
      totalMeals: total,
      createdById: session.userId,
    },
    update: {
      breakfast: bf,
      lunch: ln,
      dinner: dn,
      totalMeals: total,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: isSelf ? 'MEMBER_MEAL_SELF_EDIT' : 'ADMIN_MEAL_EDIT',
    entity: 'MEAL',
    entityId: entry.id,
    details: {
      memberId: data.memberId,
      memberName: targetMember.fullName,
      date: data.date,
      previous: existing
        ? {
            breakfast: Number(existing.breakfast),
            lunch: Number(existing.lunch),
            dinner: Number(existing.dinner),
            totalMeals: Number(existing.totalMeals),
          }
        : null,
      updated: { breakfast: bf, lunch: ln, dinner: dn, totalMeals: total },
      editedBy: session.name,
      isSelf,
    },
    reason: isSelf
      ? `Member ${session.name} updated own meal entry for ${data.date}`
      : `Manager/Admin ${session.name} updated meal entry for ${targetMember.fullName} on ${data.date}`,
  });

  safeRevalidate('/meals');
  safeRevalidate('/profile');
  safeRevalidate('/dashboard');
  safeRevalidate('/reports');
  safeRevalidate('/my-ledger');

  return {
    success: true,
    entry: {
      id: entry.id,
      date: entry.date.toISOString(),
      breakfast: Number(entry.breakfast),
      lunch: Number(entry.lunch),
      dinner: Number(entry.dinner),
      totalMeals: Number(entry.totalMeals),
    },
  };
}

export async function toggleBreakfastSettingAction(includeBreakfast: boolean) {
  const session = await requireAuth();
  const isManagement = session.isPrimaryAdmin || session.isAdmin || session.isManager;
  if (!isManagement) {
    return { success: false, error: 'Unauthorized: Only Managers and Admins can configure meal settings.' };
  }

  await prisma.messSetting.upsert({
    where: { messId: session.messId },
    update: { includeBreakfast },
    create: {
      messId: session.messId,
      includeBreakfast,
    },
  });

  safeRevalidate('/meals');
  safeRevalidate('/profile');
  safeRevalidate('/dashboard');
  safeRevalidate('/reports');

  return { success: true, includeBreakfast };
}

export async function getBreakfastSettingAction() {
  try {
    const session = await requireAuth();
    const setting = await prisma.messSetting.findUnique({
      where: { messId: session.messId },
      select: { includeBreakfast: true },
    });
    return setting?.includeBreakfast ?? false;
  } catch {
    return false;
  }
}
