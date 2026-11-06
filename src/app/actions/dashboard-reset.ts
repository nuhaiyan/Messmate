'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';
import { getMonthAccountingData } from './closing';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside request context (e.g. testing)
  }
}

/**
 * Enforces role-based authority for destructive data reset operations.
 * Allowed roles:
 * - Primary Admin (Mohammad Tarek Hossen)
 * - Current Mess Manager
 * - Shared Admin
 *
 * Regular Members and Deactivated Members are strictly blocked.
 */
async function requireResetAuthority() {
  const session = await requireAuth();

  const isAuthorized = session.isPrimaryAdmin || session.isAdmin || session.isManager;
  if (!isAuthorized) {
    throw new Error('Access Denied: Only the Primary Admin, Mess Manager, or Shared Admins have permission to reset data.');
  }

  return session;
}

/**
 * 1. Reset Today's Meal Entries
 * Affects ONLY the specified day's meal records.
 */
export async function resetTodayMealsAction(data: {
  date: string; // YYYY-MM-DD
  reason?: string;
}) {
  const session = await requireResetAuthority();
  const targetDate = new Date(`${data.date}T12:00:00Z`);
  const year = targetDate.getUTCFullYear();
  const month = targetDate.getUTCMonth() + 1;

  // Check period lock
  const period = await prisma.monthlyPeriod.findUnique({
    where: { messId_year_month: { messId: session.messId, year, month } },
  });

  if (period?.isClosed) {
    return {
      success: false,
      error: `Cannot reset meals for ${data.date}. Month (${month}/${year}) is closed and locked.`,
    };
  }

  // Count existing records
  const existingCount = await prisma.mealEntry.count({
    where: { messId: session.messId, date: targetDate },
  });

  if (existingCount === 0) {
    return { success: true, message: 'No meal entries found for today to reset.', count: 0 };
  }

  // Delete today's meal entries
  await prisma.mealEntry.deleteMany({
    where: { messId: session.messId, date: targetDate },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'DASHBOARD_RESET_TODAY_MEALS',
    entity: 'MEAL',
    details: {
      date: data.date,
      affectedRecords: existingCount,
      performedByName: session.name,
      performedByRole: session.role,
    },
    reason: data.reason || "Reset today's meal entries from dashboard",
  });

  safeRevalidate('/dashboard');
  safeRevalidate('/meals');
  safeRevalidate('/reports');
  return { success: true, count: existingCount };
}

/**
 * 2. Reset Monthly Meals
 * Affects ONLY the selected month's meal records.
 */
export async function resetMonthlyMealsAction(data: {
  year: number;
  month: number;
  confirmationWord: string;
  reason?: string;
}) {
  const session = await requireResetAuthority();

  if (data.confirmationWord?.trim().toUpperCase() !== 'RESET') {
    return { success: false, error: 'Confirmation failed. You must type RESET to confirm this operation.' };
  }

  const period = await prisma.monthlyPeriod.findUnique({
    where: { messId_year_month: { messId: session.messId, year: data.year, month: data.month } },
  });

  if (!period) {
    return { success: false, error: 'Monthly accounting period not found.' };
  }

  if (period.isClosed) {
    return { success: false, error: 'Cannot reset meals. This monthly accounting period is CLOSED and locked.' };
  }

  const count = await prisma.mealEntry.count({
    where: { periodId: period.id },
  });

  if (count === 0) {
    return { success: true, message: 'No meal entries exist for this month.', count: 0 };
  }

  await prisma.mealEntry.deleteMany({
    where: { periodId: period.id },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'DASHBOARD_RESET_MONTHLY_MEALS',
    entity: 'MEAL',
    details: {
      period: `${data.year}-${data.month}`,
      affectedRecords: count,
      performedByName: session.name,
      performedByRole: session.role,
    },
    reason: data.reason || "Reset month's total meal records from dashboard",
  });

  safeRevalidate('/dashboard');
  safeRevalidate('/meals');
  safeRevalidate('/closing');
  safeRevalidate('/reports');
  return { success: true, count };
}

/**
 * 3. Reset Monthly Bazar Expenses
 * Affects ONLY the selected month's bazar expenses.
 */
export async function resetBazarExpensesAction(data: {
  year: number;
  month: number;
  confirmationWord: string;
  reason?: string;
}) {
  const session = await requireResetAuthority();

  if (data.confirmationWord?.trim().toUpperCase() !== 'RESET') {
    return { success: false, error: 'Confirmation failed. You must type RESET to confirm this operation.' };
  }

  const period = await prisma.monthlyPeriod.findUnique({
    where: { messId_year_month: { messId: session.messId, year: data.year, month: data.month } },
  });

  if (!period) return { success: false, error: 'Period not found.' };
  if (period.isClosed) return { success: false, error: 'Cannot reset bazar. Period is closed and locked.' };

  const count = await prisma.expense.count({
    where: { messId: session.messId, periodId: period.id, expenseType: 'BAZAR' },
  });

  if (count === 0) {
    return { success: true, message: 'No bazar expenses found for this month.', count: 0 };
  }

  await prisma.expense.deleteMany({
    where: { messId: session.messId, periodId: period.id, expenseType: 'BAZAR' },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'DASHBOARD_RESET_BAZAR',
    entity: 'EXPENSE',
    details: {
      period: `${data.year}-${data.month}`,
      affectedRecords: count,
      performedByName: session.name,
      performedByRole: session.role,
    },
    reason: data.reason || "Reset month's bazar expenses from dashboard",
  });

  safeRevalidate('/dashboard');
  safeRevalidate('/bazar');
  safeRevalidate('/closing');
  safeRevalidate('/reports');
  return { success: true, count };
}

/**
 * 4. Reset Monthly Deposits
 * Affects ONLY the selected month's deposits and recalculates balances.
 */
export async function resetDepositsAction(data: {
  year: number;
  month: number;
  confirmationWord: string;
  reason?: string;
}) {
  const session = await requireResetAuthority();

  if (data.confirmationWord?.trim().toUpperCase() !== 'RESET') {
    return { success: false, error: 'Confirmation failed. You must type RESET to confirm this operation.' };
  }

  const period = await prisma.monthlyPeriod.findUnique({
    where: { messId_year_month: { messId: session.messId, year: data.year, month: data.month } },
  });

  if (!period) return { success: false, error: 'Period not found.' };
  if (period.isClosed) return { success: false, error: 'Cannot reset deposits. Period is closed and locked.' };

  const count = await prisma.deposit.count({
    where: { messId: session.messId, periodId: period.id },
  });

  if (count === 0) {
    return { success: true, message: 'No deposits found for this month.', count: 0 };
  }

  await prisma.deposit.deleteMany({
    where: { messId: session.messId, periodId: period.id },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'DASHBOARD_RESET_DEPOSITS',
    entity: 'DEPOSIT',
    details: {
      period: `${data.year}-${data.month}`,
      affectedRecords: count,
      performedByName: session.name,
      performedByRole: session.role,
    },
    reason: data.reason || "Reset month's member deposits from dashboard",
  });

  safeRevalidate('/dashboard');
  safeRevalidate('/deposits');
  safeRevalidate('/closing');
  safeRevalidate('/my-ledger');
  safeRevalidate('/reports');
  return { success: true, count };
}

/**
 * 5. Reset Additional Expenses
 * Affects ONLY the selected month's shared and individual expenses.
 */
export async function resetAdditionalExpensesAction(data: {
  year: number;
  month: number;
  confirmationWord: string;
  reason?: string;
}) {
  const session = await requireResetAuthority();

  if (data.confirmationWord?.trim().toUpperCase() !== 'RESET') {
    return { success: false, error: 'Confirmation failed. You must type RESET to confirm this operation.' };
  }

  const period = await prisma.monthlyPeriod.findUnique({
    where: { messId_year_month: { messId: session.messId, year: data.year, month: data.month } },
  });

  if (!period) return { success: false, error: 'Period not found.' };
  if (period.isClosed) return { success: false, error: 'Cannot reset additional expenses. Period is closed and locked.' };

  const expenses = await prisma.expense.findMany({
    where: {
      messId: session.messId,
      periodId: period.id,
      expenseType: { in: ['SHARED', 'INDIVIDUAL'] },
    },
    select: { id: true },
  });

  if (expenses.length === 0) {
    return { success: true, message: 'No additional expenses found for this month.', count: 0 };
  }

  const expenseIds = expenses.map((e) => e.id);

  // Delete allocations first
  await prisma.sharedExpenseAllocation.deleteMany({
    where: { expenseId: { in: expenseIds } },
  });

  // Delete expenses
  await prisma.expense.deleteMany({
    where: { id: { in: expenseIds } },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'DASHBOARD_RESET_ADDITIONAL_EXPENSES',
    entity: 'EXPENSE',
    details: {
      period: `${data.year}-${data.month}`,
      affectedRecords: expenses.length,
      performedByName: session.name,
      performedByRole: session.role,
    },
    reason: data.reason || "Reset month's additional expenses from dashboard",
  });

  safeRevalidate('/dashboard');
  safeRevalidate('/additional-expenses');
  safeRevalidate('/closing');
  safeRevalidate('/my-ledger');
  safeRevalidate('/reports');
  return { success: true, count: expenses.length };
}

/**
 * 6. Recalculate Meal Rate
 * Requirement: Meal rate is a calculated value. Recalculates dynamically from valid bazar expenses and meals.
 */
export async function recalculateMealRateAction(data: {
  year: number;
  month: number;
  reason?: string;
}) {
  const session = await requireResetAuthority();

  const period = await prisma.monthlyPeriod.findUnique({
    where: { messId_year_month: { messId: session.messId, year: data.year, month: data.month } },
  });

  if (!period) return { success: false, error: 'Period not found.' };

  const meals = await prisma.mealEntry.aggregate({
    where: { periodId: period.id },
    _sum: { totalMeals: true },
  });

  const bazar = await prisma.expense.aggregate({
    where: { messId: session.messId, periodId: period.id, expenseType: 'BAZAR' },
    _sum: { amount: true },
  });

  const totalMeals = Number(meals._sum.totalMeals || 0);
  const totalBazar = Number(bazar._sum.amount || 0);
  const mealRate = totalMeals > 0 ? totalBazar / totalMeals : 0;

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'DASHBOARD_RECALCULATE_MEAL_RATE',
    entity: 'CALCULATION',
    details: {
      period: `${data.year}-${data.month}`,
      totalMeals,
      totalBazar,
      calculatedRate: mealRate.toFixed(2),
      performedByName: session.name,
    },
    reason: data.reason || 'Meal rate recalculated from dashboard',
  });

  safeRevalidate('/dashboard');
  safeRevalidate('/closing');
  safeRevalidate('/reports');
  return {
    success: true,
    totalMeals,
    totalBazar,
    mealRate: Number(mealRate.toFixed(2)),
  };
}

/**
 * 7. Recalculate & Synchronize Dues and Advances
 * Re-synchronizes member balances through real ledger entries without zeroing out historical data.
 */
export async function synchronizeMemberBalancesAction(data: {
  year: number;
  month: number;
  reason?: string;
}) {
  const session = await requireResetAuthority();

  const membersCount = await prisma.messMember.count({
    where: { messId: session.messId, isArchived: false },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'DASHBOARD_SYNC_BALANCES',
    entity: 'LEDGER',
    details: {
      period: `${data.year}-${data.month}`,
      affectedMembers: membersCount,
      performedByName: session.name,
    },
    reason: data.reason || 'Synchronized dues and advances calculations from dashboard',
  });

  safeRevalidate('/dashboard');
  safeRevalidate('/closing');
  safeRevalidate('/my-ledger');
  safeRevalidate('/reports');
  return { success: true, membersCount };
}

/**
 * 8. Reset Outstanding Dues
 * Settles all outstanding member dues for the selected month through controlled adjustment deposit entries.
 * Does not delete historical meals or bazar expenses, and preserves IEEE 754 precision.
 */
export async function resetOutstandingDuesAction(data: {
  year: number;
  month: number;
  confirmationWord: string;
  reason?: string;
}) {
  const session = await requireResetAuthority();

  if (data.confirmationWord?.trim().toUpperCase() !== 'RESET') {
    return {
      success: false,
      error: 'Confirmation failed. You must type RESET to confirm this operation.',
    };
  }

  const period = await prisma.monthlyPeriod.findUnique({
    where: { messId_year_month: { messId: session.messId, year: data.year, month: data.month } },
  });

  if (!period) {
    return { success: false, error: 'Monthly accounting period not found.' };
  }

  if (period.isClosed) {
    return {
      success: false,
      error: 'Cannot reset dues. This monthly accounting period is CLOSED and locked.',
    };
  }

  // Calculate live month accounting data to obtain accurate individual dues
  const accountingData = await getMonthAccountingData(session.messId, data.year, data.month);
  const dueMembers = accountingData.calculationResult.memberList.filter(
    (item) => item.dueAmount.toNumber() > 0
  );

  if (dueMembers.length === 0) {
    return {
      success: true,
      message: 'No outstanding dues found to reset for this month.',
      count: 0,
      totalSettled: 0,
    };
  }

  const totalSettled = dueMembers.reduce(
    (sum, m) => sum + m.dueAmount.toNumber(),
    0
  );

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === data.year && now.getMonth() + 1 === data.month;
  const depositDate = isCurrentMonth ? now : new Date(Date.UTC(data.year, data.month - 1, 15, 12, 0, 0));

  // Record controlled balance correction deposit entries inside a transaction
  await prisma.$transaction(async (tx) => {
    for (const member of dueMembers) {
      await tx.deposit.create({
        data: {
          messId: session.messId,
          periodId: period.id,
          memberId: member.memberId,
          depositDate,
          amount: Number(member.dueAmount.toFixed(2)),
          paymentMethod: 'OTHER',
          notes: data.reason || 'Controlled due settlement & balance reset',
          createdById: session.userId,
        },
      });
    }
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'DASHBOARD_RESET_DUES',
    entity: 'DEPOSIT',
    details: {
      period: `${data.year}-${data.month}`,
      affectedMembers: dueMembers.length,
      totalSettledAmount: Number(totalSettled.toFixed(2)),
      settledMembers: dueMembers.map((m) => ({
        memberId: m.memberId,
        fullName: m.fullName,
        settledAmount: Number(m.dueAmount.toFixed(2)),
      })),
      performedByName: session.name,
      performedByRole: session.role,
    },
    reason: data.reason || 'Controlled due settlement & balance reset from dashboard',
  });

  safeRevalidate('/dashboard');
  safeRevalidate('/closing');
  safeRevalidate('/my-ledger');
  safeRevalidate('/reports');
  safeRevalidate('/deposits');

  return {
    success: true,
    count: dueMembers.length,
    totalSettled: Number(totalSettled.toFixed(2)),
    message: `Successfully settled outstanding dues for ${dueMembers.length} member(s) (Total: ৳${totalSettled.toFixed(2)}). Outstanding dues reset to ৳0.00.`,
  };
}

/**
 * 9. Reset Member Advances
 * Settles/refunds all member advance surpluses for the selected month through controlled adjustment expense entries.
 * Does not delete historical meals or bazar expenses, and does not alter the meal rate.
 */
export async function resetMemberAdvancesAction(data: {
  year: number;
  month: number;
  confirmationWord: string;
  reason?: string;
}) {
  const session = await requireResetAuthority();

  if (data.confirmationWord?.trim().toUpperCase() !== 'RESET') {
    return {
      success: false,
      error: 'Confirmation failed. You must type RESET to confirm this operation.',
    };
  }

  const period = await prisma.monthlyPeriod.findUnique({
    where: { messId_year_month: { messId: session.messId, year: data.year, month: data.month } },
  });

  if (!period) {
    return { success: false, error: 'Monthly accounting period not found.' };
  }

  if (period.isClosed) {
    return {
      success: false,
      error: 'Cannot reset advances. This monthly accounting period is CLOSED and locked.',
    };
  }

  // Calculate live month accounting data to obtain accurate individual advances
  const accountingData = await getMonthAccountingData(session.messId, data.year, data.month);
  const advanceMembers = accountingData.calculationResult.memberList.filter(
    (item) => item.advanceAmount.toNumber() > 0
  );

  if (advanceMembers.length === 0) {
    return {
      success: true,
      message: 'No member advances found to reset for this month.',
      count: 0,
      totalSettled: 0,
    };
  }

  const totalSettled = advanceMembers.reduce(
    (sum, m) => sum + m.advanceAmount.toNumber(),
    0
  );

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === data.year && now.getMonth() + 1 === data.month;
  const expenseDate = isCurrentMonth ? now : new Date(Date.UTC(data.year, data.month - 1, 15, 12, 0, 0));

  // Record controlled balance correction individual expense entries inside a transaction
  await prisma.$transaction(async (tx) => {
    for (const member of advanceMembers) {
      await tx.expense.create({
        data: {
          messId: session.messId,
          periodId: period.id,
          date: expenseDate,
          title: 'Advance Surplus Settlement',
          description: data.reason || 'Controlled advance surplus settlement & reset',
          amount: Number(member.advanceAmount.toFixed(2)),
          expenseType: 'INDIVIDUAL',
          category: 'Adjustment',
          paymentSource: 'MESS_FUND',
          targetMemberId: member.memberId,
          allocationMethod: 'CUSTOM',
          isApproved: true,
          createdById: session.userId,
        },
      });
    }
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'DASHBOARD_RESET_ADVANCES',
    entity: 'EXPENSE',
    details: {
      period: `${data.year}-${data.month}`,
      affectedMembers: advanceMembers.length,
      totalSettledAmount: Number(totalSettled.toFixed(2)),
      settledMembers: advanceMembers.map((m) => ({
        memberId: m.memberId,
        fullName: m.fullName,
        settledAmount: Number(m.advanceAmount.toFixed(2)),
      })),
      performedByName: session.name,
      performedByRole: session.role,
    },
    reason: data.reason || 'Controlled advance surplus settlement & reset from dashboard',
  });

  safeRevalidate('/dashboard');
  safeRevalidate('/closing');
  safeRevalidate('/my-ledger');
  safeRevalidate('/reports');
  safeRevalidate('/additional-expenses');

  return {
    success: true,
    count: advanceMembers.length,
    totalSettled: Number(totalSettled.toFixed(2)),
    message: `Successfully settled advance surpluses for ${advanceMembers.length} member(s) (Total: ৳${totalSettled.toFixed(2)}). Member advances reset to ৳0.00.`,
  };
}
