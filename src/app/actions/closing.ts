'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireManager } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';
import { MessAccountingEngine, MemberMealData } from '@/lib/accounting/accounting-engine';

export async function getMonthAccountingData(messId: string, year: number, month: number) {
  // Find or create monthly period
  let period = await prisma.monthlyPeriod.findUnique({
    where: {
      messId_year_month: { messId, year, month },
    },
    include: {
      closing: {
        include: { details: { include: { member: true } } },
      },
    },
  });

  if (!period) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    period = await prisma.monthlyPeriod.create({
      data: {
        messId,
        year,
        month,
        startDate,
        endDate,
        isClosed: false,
      },
      include: {
        closing: {
          include: { details: { include: { member: true } } },
        },
      },
    });
  }

  // Fetch all active members
  const members = await prisma.messMember.findMany({
    where: { messId },
    orderBy: { fullName: 'asc' },
  });

  // Fetch meal entries for this period
  const mealEntries = await prisma.mealEntry.findMany({
    where: { periodId: period.id },
  });

  // Aggregate meals per member
  const mealsMap: Record<string, { b: number; l: number; d: number; total: number }> = {};
  for (const m of members) {
    mealsMap[m.id] = { b: 0, l: 0, d: 0, total: 0 };
  }
  for (const entry of mealEntries) {
    if (mealsMap[entry.memberId]) {
      mealsMap[entry.memberId].b += Number(entry.breakfast);
      mealsMap[entry.memberId].l += Number(entry.lunch);
      mealsMap[entry.memberId].d += Number(entry.dinner);
      mealsMap[entry.memberId].total += Number(entry.totalMeals);
    }
  }

  // Fetch bazar expenses
  const bazarExpenses = await prisma.expense.findMany({
    where: { periodId: period.id, expenseType: 'BAZAR' },
  });

  // Fetch additional expenses (shared and individual)
  const additionalExpenses = await prisma.expense.findMany({
    where: { periodId: period.id, expenseType: { in: ['SHARED', 'INDIVIDUAL'] } },
    include: { sharedAllocations: true },
  });

  // Fetch deposits
  const deposits = await prisma.deposit.findMany({
    where: { periodId: period.id },
  });

  // Prepare input for engine
  const memberInputs: MemberMealData[] = members.map((m) => ({
    memberId: m.id,
    fullName: m.fullName,
    breakfast: mealsMap[m.id].b,
    lunch: mealsMap[m.id].l,
    dinner: mealsMap[m.id].d,
    totalMeals: mealsMap[m.id].total,
    joiningDate: m.joiningDate,
    leavingDate: m.leavingDate,
    isActive: m.isActive && !m.isArchived,
    openingBalance: Number(m.initialOpeningBalance),
  }));

  const bazarInputs = bazarExpenses.map((b) => ({
    id: b.id,
    amount: Number(b.amount),
    category: b.category,
    paymentSource: b.paymentSource,
    payerMemberId: b.payerMemberId,
    date: b.date,
  }));

  const additionalInputs = additionalExpenses.map((a) => ({
    id: a.id,
    title: a.title,
    amount: Number(a.amount),
    category: a.category,
    expenseType: a.expenseType,
    allocationMethod: a.allocationMethod,
    targetMemberId: a.targetMemberId,
    sharedAllocations: a.sharedAllocations.map((sa) => ({
      memberId: sa.memberId,
      amount: Number(sa.amount),
    })),
  }));

  const depositInputs = deposits.map((d) => ({
    id: d.id,
    memberId: d.memberId,
    amount: Number(d.amount),
    depositDate: d.depositDate,
  }));

  // Days in month
  const daysInMonth = new Date(year, month, 0).getDate();

  const calculationResult = MessAccountingEngine.calculateMonthlyAccounts({
    members: memberInputs,
    bazarExpenses: bazarInputs,
    additionalExpenses: additionalInputs,
    deposits: depositInputs,
    daysInMonth,
  });

  return {
    period,
    members,
    bazarExpenses,
    additionalExpenses,
    deposits,
    calculationResult,
  };
}

export async function closeMonthlyAccountsAction(year: number, month: number, notes?: string) {
  const session = await requireManager();

  const data = await getMonthAccountingData(session.messId, year, month);
  if (data.period.isClosed) {
    return { success: false, error: 'This month is already closed.' };
  }

  const result = data.calculationResult;

  // Execute closing snapshot inside a database transaction
  await prisma.$transaction(async (tx) => {
    // 1. Create or overwrite closing snapshot
    const closing = await tx.monthlyClosing.upsert({
      where: { periodId: data.period.id },
      create: {
        messId: session.messId,
        periodId: data.period.id,
        closedById: session.userId,
        totalMeals: Number(result.totalMeals.toString()),
        totalBazarExpense: Number(result.totalBazarExpense.toString()),
        mealRate: Number(result.mealRate.toString()),
        totalDeposits: Number(result.totalDeposits.toString()),
        totalSharedExpenses: Number(result.totalSharedExpenses.toString()),
        totalIndividualExpenses: Number(result.totalIndividualExpenses.toString()),
        totalPersonalPayments: Number(result.totalPersonalPayments.toString()),
        totalMessFundPayments: Number(result.totalMessFundPayments.toString()),
        totalNetAdvances: Number(result.totalNetAdvances.toString()),
        totalNetDues: Number(result.totalNetDues.toString()),
        status: 'CLOSED',
        notes: notes || `Accounts closed by ${session.name}`,
      },
      update: {
        closedById: session.userId,
        totalMeals: Number(result.totalMeals.toString()),
        totalBazarExpense: Number(result.totalBazarExpense.toString()),
        mealRate: Number(result.mealRate.toString()),
        totalDeposits: Number(result.totalDeposits.toString()),
        totalSharedExpenses: Number(result.totalSharedExpenses.toString()),
        totalIndividualExpenses: Number(result.totalIndividualExpenses.toString()),
        totalPersonalPayments: Number(result.totalPersonalPayments.toString()),
        totalMessFundPayments: Number(result.totalMessFundPayments.toString()),
        totalNetAdvances: Number(result.totalNetAdvances.toString()),
        totalNetDues: Number(result.totalNetDues.toString()),
        status: 'CLOSED',
        notes: notes || `Accounts closed by ${session.name}`,
      },
    });

    // 2. Clear old closing details if any and write new details
    await tx.monthlyClosingDetail.deleteMany({
      where: { closingId: closing.id },
    });

    for (const item of result.memberList) {
      await tx.monthlyClosingDetail.create({
        data: {
          closingId: closing.id,
          memberId: item.memberId,
          totalMeals: Number(item.totalMeals.toString()),
          mealRate: Number(result.mealRate.toString()),
          mealCost: Number(item.mealCost.toString()),
          sharedExpenseCost: Number(item.sharedExpenseCost.toString()),
          individualExpenseCost: Number(item.individualExpenseCost.toString()),
          totalCost: Number(item.totalCost.toString()),
          deposits: Number(item.deposits.toString()),
          personalPayments: Number(item.personalPayments.toString()),
          openingBalance: Number(item.openingBalance.toString()),
          closingBalance: Number(item.closingBalance.toString()),
          isAdvance: item.isAdvance,
          isDue: item.isDue,
        },
      });

      // 3. Carry forward closing balance:
      // Update next month opening balance for member
      await tx.messMember.update({
        where: { id: item.memberId },
        data: {
          initialOpeningBalance: Number(item.closingBalance.toString()),
        },
      });
    }

    // 4. Lock the period
    await tx.monthlyPeriod.update({
      where: { id: data.period.id },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closedById: session.userId,
      },
    });
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MONTH_CLOSED',
    entity: 'PERIOD',
    entityId: data.period.id,
    details: {
      year,
      month,
      totalMeals: result.totalMeals.toString(),
      mealRate: result.mealRate.toString(),
      totalBazar: result.totalBazarExpense.toString(),
    },
    reason: notes,
  });

  revalidatePath('/closing');
  revalidatePath('/dashboard');
  revalidatePath('/members');
  return { success: true };
}

export async function reopenMonthlyAccountsAction(year: number, month: number, reason: string) {
  const session = await requireManager();

  if (!reason || reason.trim().length < 5) {
    return { success: false, error: 'A mandatory reason (at least 5 characters) is required to reopen accounts.' };
  }

  const period = await prisma.monthlyPeriod.findUnique({
    where: {
      messId_year_month: { messId: session.messId, year, month },
    },
  });

  if (!period) return { success: false, error: 'Period not found.' };
  if (!period.isClosed) return { success: false, error: 'Period is already open.' };

  await prisma.monthlyPeriod.update({
    where: { id: period.id },
    data: {
      isClosed: false,
      reopenedAt: new Date(),
      reopenedById: session.userId,
      reopenReason: reason.trim(),
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MONTH_REOPENED',
    entity: 'PERIOD',
    entityId: period.id,
    details: { year, month },
    reason: reason.trim(),
  });

  revalidatePath('/closing');
  revalidatePath('/dashboard');
  revalidatePath('/meals');
  revalidatePath('/bazar');
  return { success: true };
}
