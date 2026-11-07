import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { ReportsClient } from './reports-client';
import { getMonthAccountingData } from '@/app/actions/closing';
import { formatDate } from '@/lib/utils';

interface ReportsPageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await requireAuth();
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

  // Snapshot meal rate if closed, otherwise active calculation meal rate
  const monthlyMealRate = data.period.closing
    ? Number(data.period.closing.mealRate.toString())
    : Number(result.mealRate.toString());

  // 1. Meals Data
  const mealEntries = await prisma.mealEntry.findMany({
    where: { periodId: data.period.id },
    include: { member: true },
    orderBy: { date: 'asc' },
  });

  const mealsData = mealEntries.map((m) => ({
    date: formatDate(m.date),
    member: m.member.fullName,
    bf: Number(m.breakfast),
    ln: Number(m.lunch),
    dn: Number(m.dinner),
    total: Number(m.totalMeals),
  }));

  // 2. Monthly Meals Summary
  const monthlyMealsSummary = result.memberList.map((m) => ({
    member: m.fullName,
    totalMeals: Number(m.totalMeals.toString()),
    mealRate: monthlyMealRate,
    mealCost: Number(m.mealCost.toString()),
  }));

  // 3. Bazar Data
  const bazarData = data.bazarExpenses.map((b) => ({
    date: formatDate(b.date),
    item: b.title,
    category: b.category,
    amount: Number(b.amount),
    source: b.paymentSource === 'PERSONAL' ? 'Personal' : 'Mess Fund',
    payer: b.payerMemberId
      ? data.members.find((m) => m.id === b.payerMemberId)?.fullName || 'Member'
      : 'Mess Common Fund',
  }));

  // 4. Expenses Data
  const allExpenses = await prisma.expense.findMany({
    where: { periodId: data.period.id },
    orderBy: { date: 'asc' },
  });

  const expensesData = allExpenses.map((e) => ({
    date: formatDate(e.date),
    title: e.title,
    category: e.category,
    type: e.expenseType,
    amount: Number(e.amount),
  }));

  // 5. Deposits Data
  const depositsData = data.deposits.map((d) => ({
    date: formatDate(d.depositDate),
    member: data.members.find((m) => m.id === d.memberId)?.fullName || 'Member',
    method: d.paymentMethod,
    tx: d.transactionId || '',
    amount: Number(d.amount),
  }));

  // 6. Dues & Advances Data
  const duesAdvancesData = result.memberList.map((m) => ({
    member: m.fullName,
    balance: Number(m.closingBalance.toString()),
    status: m.isAdvance ? 'Advance' : m.isDue ? 'Due' : 'Settled',
    advance: Number(m.advanceAmount.toString()),
    due: Number(m.dueAmount.toString()),
  }));

  // 7. Category Expenses
  const categoryMap: Record<string, number> = {};
  for (const e of allExpenses) {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount);
  }
  const categoryExpenses = Object.entries(categoryMap).map(([category, amount]) => ({
    category,
    amount,
  }));

  // 8. Closing Statement
  const closingStatement = {
    totalMeals: Number(result.totalMeals.toString()),
    totalBazar: Number(result.totalBazarExpense.toString()),
    mealRate: monthlyMealRate,
    totalDeposits: Number(result.totalDeposits.toString()),
    totalOther: Number(result.totalAdditionalExpenses.toString()),
    members: result.memberList.map((m) => ({
      member: m.fullName,
      meals: Number(m.totalMeals.toString()),
      mealRate: monthlyMealRate,
      mealCost: Number(m.mealCost.toString()),
      otherCost: Number(m.sharedExpenseCost.plus(m.individualExpenseCost).toString()),
      totalCost: Number(m.totalCost.toString()),
      deposits: Number(m.deposits.toString()),
      balance: Number(m.closingBalance.toString()),
      isAdvance: m.isAdvance,
      isDue: m.isDue,
    })),
  };

  const reportsPayload = {
    year: currentYear,
    month: currentMonth,
    mealsData,
    monthlyMealsSummary,
    bazarData,
    expensesData,
    depositsData,
    duesAdvancesData,
    categoryExpenses,
    closingStatement,
  };

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
      <ReportsClient data={reportsPayload} />
    </DashboardShell>
  );
}