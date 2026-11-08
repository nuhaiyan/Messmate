import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FinanceManagementClient } from './finance-management-client';
import { getFineFundSummary } from '@/app/actions/fine-fund';
import { getMonthAccountingData } from '@/app/actions/closing';

interface FinancePageProps {
  searchParams: Promise<{ month?: string; year?: string; tab?: string }>;
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const session = await requireAuth();
  const sp = await searchParams;

  const currentYear = sp.year ? parseInt(sp.year) : 2026;
  const currentMonth = sp.month ? parseInt(sp.month) : 11;
  const initialTab = sp.tab || 'fine-fund';

  const isManagement = session.isPrimaryAdmin || session.isAdmin || session.isManager;

  // General Members are restricted to their personal ledger if attempting unauthorized management
  if (!isManagement) {
    redirect('/my-ledger');
  }

  // 1. Fetch Fine Fund Summary
  const fineFund = await getFineFundSummary(session.messId);

  // 2. Fetch Mess Fund Accounting Data
  const accountsData = await getMonthAccountingData(session.messId, currentYear, currentMonth);

  // 3. Fetch all active members
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
      phone: true,
    },
    orderBy: { fullName: 'asc' },
  });

  const activeMembers = allMembers.filter((m) => m.isActive);

  // 4. Fetch deposits for the period
  const deposits = await prisma.deposit.findMany({
    where: {
      messId: session.messId,
      period: { year: currentYear, month: currentMonth },
    },
    include: { member: { select: { fullName: true } } },
    orderBy: { depositDate: 'desc' },
  });

  // 5. Fetch additional expenses for the period
  const additionalExpenses = await prisma.expense.findMany({
    where: {
      messId: session.messId,
      period: { year: currentYear, month: currentMonth },
      expenseType: { in: ['SHARED', 'INDIVIDUAL'] },
    },
    include: {
      payerMember: { select: { fullName: true } },
      targetMember: { select: { fullName: true } },
    },
    orderBy: { date: 'desc' },
  });

  const primaryAdmin = allMembers.find((m) => m.isPrimaryAdmin) || { fullName: 'Mohammad Tarek Hossen' };
  const currentManager = allMembers.find((m) => m.isManager) || { fullName: 'Tanvir' };

  return (
    <DashboardShell
      userRole={session.role}
      userName={session.name}
      activeMemberId={session.memberId}
      isPrimaryAdmin={session.isPrimaryAdmin}
      isAdmin={session.isAdmin}
      isManager={session.isManager}
      membersList={allMembers}
      currentManagerName={currentManager.fullName}
      primaryAdminName={primaryAdmin.fullName}
      selectedMonth={currentMonth}
      selectedYear={currentYear}
      currentMealRate={accountsData.calculationResult.mealRate.toFixed(2)}
    >
      <FinanceManagementClient
        fineFund={fineFund}
        messFund={{
          totalDeposits: accountsData.calculationResult.totalMemberDeposits.toNumber(),
          totalOpeningBalance: accountsData.calculationResult.totalOpeningBalance.toNumber(),
          totalOpeningAdvances: accountsData.calculationResult.totalOpeningAdvances.toNumber(),
          totalOpeningDues: accountsData.calculationResult.totalOpeningDues.toNumber(),
          totalSharedExpenses: accountsData.calculationResult.totalSharedExpenses.toNumber(),
          totalIndividualExpenses: accountsData.calculationResult.totalIndividualExpenses.toNumber(),
          totalPersonalPayments: accountsData.calculationResult.totalPersonalPayments.toNumber(),
          totalMessFundPayments: accountsData.calculationResult.totalMessFundPayments.toNumber(),
          availableMessFund: accountsData.calculationResult.availableMessFund.toNumber(),
          totalNetAdvances: accountsData.calculationResult.totalNetAdvances.toNumber(),
          totalNetDues: accountsData.calculationResult.totalNetDues.toNumber(),
        }}
        deposits={deposits.map((d) => ({
          id: d.id,
          memberName: d.member.fullName,
          memberId: d.memberId,
          amount: Number(d.amount),
          date: d.depositDate.toISOString().split('T')[0],
          method: d.paymentMethod,
          transactionId: d.transactionId,
          notes: d.notes,
        }))}
        additionalExpenses={additionalExpenses.map((e) => ({
          id: e.id,
          title: e.title,
          amount: Number(e.amount),
          date: e.date.toISOString().split('T')[0],
          category: e.category,
          type: e.expenseType,
          paymentSource: e.paymentSource,
          payerName: e.payerMember?.fullName || null,
          targetName: e.targetMember?.fullName || null,
        }))}
        members={activeMembers.map((m) => ({ id: m.id, fullName: m.fullName }))}
        initialTab={initialTab}
        isManager={isManagement}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />
    </DashboardShell>
  );
}
