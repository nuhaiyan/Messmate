import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AdditionalExpensesClient } from './additional-expenses-client';

interface AdditionalExpensesPageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function AdditionalExpensesPage({ searchParams }: AdditionalExpensesPageProps) {
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

  const expenses = await prisma.expense.findMany({
    where: {
      messId: session.messId,
      periodId: period?.id,
      expenseType: { in: ['SHARED', 'INDIVIDUAL'] },
    },
    include: {
      targetMember: true,
    },
    orderBy: { date: 'desc' },
  });

  const allMembers = await prisma.messMember.findMany({
    where: { messId: session.messId },
    orderBy: { fullName: 'asc' },
  });

  const primaryAdmin = allMembers.find((m) => m.isPrimaryAdmin) || { fullName: 'Mohammad Tarek Hossen' };
  const currentManager = allMembers.find((m) => m.isManager) || { fullName: 'Tanvir' };

  // Only active members can be targeted for individual expenses
  const activeMembers = allMembers.filter((m) => m.isActive && !m.isArchived);

  const expenseItems = expenses.map((e) => ({
    id: e.id,
    date: e.date,
    title: e.title,
    amount: Number(e.amount),
    category: e.category,
    expenseType: e.expenseType,
    allocationMethod: e.allocationMethod,
    targetMemberId: e.targetMemberId,
    targetMemberName: e.targetMember?.fullName || null,
    description: e.description,
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

  const canManageExpenses = session.isPrimaryAdmin || session.isAdmin || session.isManager;

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
      <AdditionalExpensesClient
        expenses={expenseItems}
        members={memberOptions}
        isManager={canManageExpenses}
        isClosed={isClosed}
      />
    </DashboardShell>
  );
}