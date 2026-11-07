import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MemberProfileClient } from './member-profile-client';
import { getMemberProfileDataAction } from '@/app/actions/profile';

interface ProfilePageProps {
  searchParams: Promise<{ memberId?: string }>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const session = await requireAuth();
  const sp = await searchParams;
  const targetMemberId = sp.memberId || session.memberId;

  const data = await getMemberProfileDataAction({
    memberId: targetMemberId,
  });

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
      currentMealRate={data.accounting.currentMealRate.toFixed(2)}
    >
      <MemberProfileClient
        member={data.member}
        accounting={data.accounting}
        bazarSchedules={data.bazarSchedules}
        fines={data.fines}
        recentMeals={data.recentMeals}
        recentDeposits={data.recentDeposits}
        recentBazar={data.recentBazar}
        recentExpenses={data.recentExpenses}
        isOwnProfile={data.isOwnProfile}
        canEdit={data.canEdit}
        includeBreakfast={data.includeBreakfast}
        currentMonth={data.currentMonth}
        currentYear={data.currentYear}
      />
    </DashboardShell>
  );
}
