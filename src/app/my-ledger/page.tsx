import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MemberLedgerClient } from './member-ledger-client';
import { getMonthAccountingData } from '@/app/actions/closing';
import { MessAccountingEngine } from '@/lib/accounting/accounting-engine';
import Decimal from 'decimal.js';
import { formatDate } from '@/lib/utils';

interface MyLedgerPageProps {
  searchParams: Promise<{ memberId?: string; month?: string; year?: string }>;
}

export default async function MyLedgerPage({ searchParams }: MyLedgerPageProps) {
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

  const canViewAll = session.isPrimaryAdmin || session.isAdmin || session.isManager;

  // Determine target member:
  // If admin/manager, can specify ?memberId=..., else member sees their own ledger!
  const targetMemberId =
    canViewAll && sp.memberId ? sp.memberId : session.memberId;

  const currentMember = allMembers.find((m) => m.id === targetMemberId) || allMembers[0];

  // Fetch full accounting data for calculations
  const data = await getMonthAccountingData(session.messId, currentYear, currentMonth);
  const result = data.calculationResult;

  const memberSummary = result.membersSummary[currentMember.id];

  // Fetch deposits by this member
  const memberDeposits = await prisma.deposit.findMany({
    where: { messId: session.messId, memberId: currentMember.id },
    orderBy: { depositDate: 'asc' },
  });

  // Fetch personal bazar purchases by this member
  const memberPersonalBazar = await prisma.expense.findMany({
    where: {
      messId: session.messId,
      expenseType: 'BAZAR',
      payerMemberId: currentMember.id,
      paymentSource: 'PERSONAL',
    },
    orderBy: { date: 'asc' },
  });

  // Fetch shared expense allocations for this member
  const memberSharedAllocations = await prisma.sharedExpenseAllocation.findMany({
    where: { memberId: currentMember.id },
    include: { expense: true },
  });

  // Fetch individual expenses assigned to this member
  const memberIndividualExpenses = await prisma.expense.findMany({
    where: {
      messId: session.messId,
      expenseType: 'INDIVIDUAL',
      targetMemberId: currentMember.id,
    },
    orderBy: { date: 'asc' },
  });

  const generatedRows = MessAccountingEngine.generateLedgerEntries({
    openingBalance: memberSummary?.openingBalance || new Decimal(currentMember.initialOpeningBalance),
    deposits: memberDeposits.map((d) => ({
      id: d.id,
      date: d.depositDate,
      amount: new Decimal(d.amount.toString()),
      notes: d.notes || undefined,
      method: d.paymentMethod,
    })),
    personalBazar: memberPersonalBazar.map((b) => ({
      id: b.id,
      date: b.date,
      amount: new Decimal(b.amount.toString()),
      title: b.title,
    })),
    mealCosts: {
      date: new Date('2026-11-07T12:00:00Z'),
      totalMeals: memberSummary?.totalMeals || new Decimal(0),
      mealRate: result.mealRate,
      cost: memberSummary?.mealCost || new Decimal(0),
    },
    sharedExpenses: memberSharedAllocations.map((sa) => ({
      id: sa.expenseId,
      date: sa.expense.date,
      amount: new Decimal(sa.amount.toString()),
      title: sa.expense.title,
    })),
    individualExpenses: memberIndividualExpenses.map((ie) => ({
      id: ie.id,
      date: ie.date,
      amount: new Decimal(ie.amount.toString()),
      title: ie.title,
    })),
  });

  const ledgerRows = generatedRows.map((r) => ({
    date: r.date.getTime() === 0 ? 'Month Start' : formatDate(r.date),
    type: r.type.replace(/_/g, ' '),
    description: r.description,
    debit: Number(r.debit.toString()),
    credit: Number(r.credit.toString()),
    balance: Number(r.balance.toString()),
  }));

  const currentBalance = memberSummary ? Number(memberSummary.closingBalance.toString()) : Number(currentMember.initialOpeningBalance);

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
      <MemberLedgerClient
        selectedMemberId={currentMember.id}
        selectedMemberName={currentMember.fullName}
        members={allMembers.map((m) => ({ id: m.id, fullName: m.fullName }))}
        isManager={canViewAll}
        ledgerRows={ledgerRows}
        currentBalance={currentBalance}
      />
    </DashboardShell>
  );
}