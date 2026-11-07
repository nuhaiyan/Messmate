import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MemberProfileClient } from '@/app/profile/member-profile-client';
import { getMemberProfileDataAction } from '@/app/actions/profile';

interface MemberDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function MemberDetailPage({ params, searchParams }: MemberDetailPageProps) {
  const session = await requireAuth();
  const { id } = await params;
  const sp = await searchParams;

  const isManagement = session.isPrimaryAdmin || session.isAdmin || session.isManager;

  // General Members can ONLY view their own profile.
  // Attempting to view another member's profile redirects to their own profile.
  if (!isManagement && session.memberId !== id) {
    redirect('/profile');
  }

  const selectedMonth = sp.month ? parseInt(sp.month) : 11;
  const selectedYear = sp.year ? parseInt(sp.year) : 2026;

  let profileData;
  try {
    profileData = await getMemberProfileDataAction({
      memberId: id,
      month: selectedMonth,
      year: selectedYear,
    });
  } catch (err: any) {
    redirect('/members');
  }

  const mess = await prisma.mess.findUnique({
    where: { id: session.messId },
    select: { name: true, logoUrl: true },
  });

  const allMembers = await prisma.messMember.findMany({
    where: { messId: session.messId, isArchived: false },
    select: {
      id: true,
      fullName: true,
      isActive: true,
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
      messName={mess?.name || "Tarek's Residence"}
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
      currentMealRate={profileData.accounting.currentMealRate.toFixed(2)}
    >
      <MemberProfileClient
        member={profileData.member}
        accounting={profileData.accounting}
        bazarSchedules={profileData.bazarSchedules}
        fines={profileData.fines}
        recentMeals={profileData.recentMeals}
        recentDeposits={profileData.recentDeposits}
        recentBazar={profileData.recentBazar}
        recentExpenses={profileData.recentExpenses}
        isOwnProfile={session.memberId === id}
        canEdit={session.isPrimaryAdmin || session.isAdmin || session.isManager || session.memberId === id}
        includeBreakfast={profileData.includeBreakfast}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
      />
    </DashboardShell>
  );
}
