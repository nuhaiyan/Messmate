import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getMonthAccountingData } from '@/app/actions/closing';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { ClosingWorkflowClient } from './closing-workflow-client';

interface ClosingPageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function ClosingPage({ searchParams }: ClosingPageProps) {
  const session = await requireAuth();

  // Protect Admin/Manager panel
  if (!session.isPrimaryAdmin && !session.isAdmin && !session.isManager) {
    redirect('/my-ledger');
  }
  const sp = await searchParams;

  const currentYear = sp.year ? parseInt(sp.year) : 2026;
  const currentMonth = sp.month ? parseInt(sp.month) : 11;

  const allMembers = await prisma.messMember.findMany({
    where: { messId: session.messId },
    orderBy: { fullName: 'asc' },
  });

  const primaryAdmin = allMembers.find((m) => m.isPrimaryAdmin) || { fullName: 'Mohammad Tarek Hossen' };
  const currentManager = allMembers.find((m) => m.isManager) || { fullName: 'Tanvir' };

  const membersOptions = allMembers
    .filter((m) => !m.isArchived)
    .map((m) => ({
      id: m.id,
      fullName: m.fullName,
      isPrimaryAdmin: m.isPrimaryAdmin,
      isAdmin: m.isAdmin,
      isManager: m.isManager,
    }));

  const data = await getMonthAccountingData(session.messId, currentYear, currentMonth);
  const result = data.calculationResult;

  let closedByName: string | null = null;
  if (data.period.closedById) {
    const user = await prisma.user.findUnique({
      where: { id: data.period.closedById },
    });
    closedByName = user?.name || null;
  }

  const summary = {
    year: currentYear,
    month: currentMonth,
    isClosed: data.period.isClosed,
    closedAt: data.period.closedAt ? data.period.closedAt.toISOString() : null,
    closedByName,
    reopenReason: data.period.reopenReason,
    totalMeals: Number(result.totalMeals.toString()),
    totalBazarExpense: Number(result.totalBazarExpense.toString()),
    mealRate: Number(result.mealRate.toString()),
    totalDeposits: Number(result.totalDeposits.toString()),
    totalAdditionalExpenses: Number(result.totalAdditionalExpenses.toString()),
    totalPersonalPayments: Number(result.totalPersonalPayments.toString()),
    totalNetAdvances: Number(result.totalNetAdvances.toString()),
    totalNetDues: Number(result.totalNetDues.toString()),
    members: result.memberList.map((m) => ({
      memberId: m.memberId,
      fullName: m.fullName,
      totalMeals: Number(m.totalMeals.toString()),
      mealCost: Number(m.mealCost.toString()),
      sharedExpenseCost: Number(m.sharedExpenseCost.toString()),
      individualExpenseCost: Number(m.individualExpenseCost.toString()),
      totalCost: Number(m.totalCost.toString()),
      deposits: Number(m.deposits.toString()),
      personalPayments: Number(m.personalPayments.toString()),
      openingBalance: Number(m.openingBalance.toString()),
      closingBalance: Number(m.closingBalance.toString()),
      isAdvance: m.isAdvance,
      isDue: m.isDue,
    })),
  };

  const canManageClosing = session.isPrimaryAdmin || session.isAdmin || session.isManager;

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
      <ClosingWorkflowClient
        summary={summary}
        isManager={canManageClosing}
      />
    </DashboardShell>
  );
}