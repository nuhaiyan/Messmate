import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { NoticesClient } from './notices-client';
import { getNoticesAction } from '@/app/actions/notices';
import { computeScheduleStatus, formatScheduleRange, toDhakaDateString } from '@/lib/bazar/schedule-utils';

interface NoticesPageProps {
  searchParams: Promise<{ month?: string; year?: string; category?: string }>;
}

export default async function NoticesPage({ searchParams }: NoticesPageProps) {
  const session = await requireAuth();
  const sp = await searchParams;

  const now = new Date();
  const selectedMonth = sp.month ? parseInt(sp.month) : 11;
  const selectedYear = sp.year ? parseInt(sp.year) : 2026;

  const data = await getNoticesAction({
    category: sp.category,
    month: selectedMonth,
    year: selectedYear,
  });

  // Query Bazar Schedules for live synchronization on Notice Board
  const rawSchedules = await prisma.bazarSchedule.findMany({
    where: {
      messId: session.messId,
    },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          phone: true,
        },
      },
    },
    orderBy: { startDate: 'asc' },
  });

  const bazarSchedules = rawSchedules.map((s) => ({
    id: s.id,
    memberName: s.member.fullName,
    memberPhone: s.member.phone,
    startDate: toDhakaDateString(s.startDate),
    endDate: toDhakaDateString(s.endDate),
    formattedRange: formatScheduleRange(s.startDate, s.endDate),
    status: computeScheduleStatus(s.startDate, s.endDate),
    notes: s.notes,
  }));

  const mess = await prisma.mess.findUnique({
    where: { id: session.messId },
    select: { name: true, logoUrl: true },
  });

  const allMembers = await prisma.messMember.findMany({
    where: { messId: session.messId, isActive: true },
    select: {
      id: true,
      fullName: true,
      isPrimaryAdmin: true,
      isAdmin: true,
      isManager: true,
      avatarUrl: true,
    },
    orderBy: { fullName: 'asc' },
  });

  const primaryAdmin = allMembers.find((m) => m.isPrimaryAdmin) || { fullName: 'Mohammad Tarek Hossen' };
  const currentManager = allMembers.find((m) => m.isManager) || { fullName: 'Tanvir' };

  return (
    <DashboardShell
      userRole={session.role}
      userName={session.name}
      messName={mess?.name || 'MessMate'}
      messLogoUrl={mess?.logoUrl}
      membersList={allMembers}
      activeMemberId={session.memberId}
      isPrimaryAdmin={session.isPrimaryAdmin}
      isAdmin={session.isAdmin}
      isManager={session.isManager}
      currentManagerName={currentManager.fullName}
      primaryAdminName={primaryAdmin.fullName}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
    >
      <NoticesClient
        initialNotices={data.notices}
        bazarSchedules={bazarSchedules}
        isManagerOrAdmin={data.isManagerOrAdmin}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    </DashboardShell>
  );
}
