import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DepositManagementClient } from './deposit-management-client';

interface DepositsPageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function DepositsPage({ searchParams }: DepositsPageProps) {
  const session = await requireAuth();
  const sp = await searchParams;

  const currentYear = sp.year ? parseInt(sp.year) : 2026;
  const currentMonth = sp.month ? parseInt(sp.month) : 11;

  const period = await prisma.monthlyPeriod.findUnique({
    where: {
      messId_year_month: { messId: session.messId, year: currentYear, month: currentMonth },
    },
  });

  const isClosed = period?.isClosed ?? false;

  const deposits = await prisma.deposit.findMany({
    where: {
      messId: session.messId,
      periodId: period?.id,
    },
    include: { member: true },
    orderBy: { depositDate: 'desc' },
  });

  const allMembers = await prisma.messMember.findMany({
    where: { messId: session.messId },
    orderBy: { fullName: 'asc' },
  });

  const primaryAdmin = allMembers.find((m) => m.isPrimaryAdmin) || { fullName: 'Mohammad Tarek Hossen' };
  const currentManager = allMembers.find((m) => m.isManager) || { fullName: 'Tanvir' };

  // Only active members can make new deposits
  const activeMembers = allMembers.filter((m) => m.isActive && !m.isArchived);

  const depositItems = deposits.map((d) => ({
    id: d.id,
    memberId: d.memberId,
    memberName: d.member.fullName,
    depositDate: d.depositDate,
    amount: Number(d.amount),
    paymentMethod: d.paymentMethod,
    transactionId: d.transactionId,
    notes: d.notes,
  }));

  const memberOptions = activeMembers.map((m) => ({
    id: m.id,
    fullName: m.fullName,
  }));

  const membersOptions = allMembers
    .filter((m) => !m.isArchived)
    .map((m) => ({
      id: m.id,
      fullName: m.fullName,
      isPrimaryAdmin: m.isPrimaryAdmin,
      isAdmin: m.isAdmin,
      isManager: m.isManager,
    }));

  const canManageDeposits = session.isPrimaryAdmin || session.isAdmin || session.isManager;

  return (
    <DashboardShell
      userRole={session.role}
      userName={session.name}
      activeMemberId={session.memberId}
      isPrimaryAdmin={session.isPrimaryAdmin}
      isAdmin={session.isAdmin}
      isManager={session.isManager}
      membersList={membersOptions}
      currentManagerName={currentManager.fullName}
      primaryAdminName={primaryAdmin.fullName}
      selectedMonth={currentMonth}
      selectedYear={currentYear}
    >
      <DepositManagementClient
        deposits={depositItems}
        members={memberOptions}
        isManager={canManageDeposits}
        isClosed={isClosed}
      />
    </DashboardShell>
  );
}