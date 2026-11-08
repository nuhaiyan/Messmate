'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

function safeRevalidate() {
  try {
    revalidatePath('/', 'layout');
    revalidatePath('/dashboard');
    revalidatePath('/meals');
    revalidatePath('/bazar');
    revalidatePath('/finance');
    revalidatePath('/deposits');
    revalidatePath('/additional-expenses');
    revalidatePath('/closing');
    revalidatePath('/reports');
    revalidatePath('/my-ledger');
    revalidatePath('/profile');
    revalidatePath('/members');
    revalidatePath('/mess-profile');
  } catch {
    // Ignore outside request context
  }
}

export async function resetCompleteAccountingAction(data: {
  scope: 'CURRENT_MONTH' | 'ALL_TIME';
  year?: number;
  month?: number;
  resetMemberInitialBalances?: boolean;
  confirmationWord: string;
  reason?: string;
}) {
  const session = await requireAdmin();

  if (data.confirmationWord?.trim().toUpperCase() !== 'RESET') {
    return {
      success: false,
      error: 'নিশ্চিতকরণ ব্যর্থ হয়েছে। এগিয়ে যেতে আপনাকে অবশ্যই RESET লিখতে হবে (You must type RESET to confirm).',
    };
  }

  const now = new Date();
  const year = data.year || now.getUTCFullYear();
  const month = data.month || now.getUTCMonth() + 1;

  if (data.scope === 'CURRENT_MONTH') {
    // -------------------------------------------------------------
    // RESET SPECIFIC MONTH ACCOUNTING ONLY
    // -------------------------------------------------------------
    const period = await prisma.monthlyPeriod.findUnique({
      where: {
        messId_year_month: {
          messId: session.messId,
          year,
          month,
        },
      },
    });

    if (!period) {
      return {
        success: false,
        error: `${month}/${year} মাসের কোনো হিসাবের পিরিয়ড ডাটাবেজে পাওয়া যায়নি।`,
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete Meals for this period
      const deletedMeals = await tx.mealEntry.deleteMany({
        where: { periodId: period.id },
      });

      // 2. Delete Shared Expense Allocations for expenses in this period
      const periodExpenses = await tx.expense.findMany({
        where: { periodId: period.id },
        select: { id: true },
      });
      const expenseIds = periodExpenses.map((e) => e.id);

      if (expenseIds.length > 0) {
        await tx.sharedExpenseAllocation.deleteMany({
          where: { expenseId: { in: expenseIds } },
        });
      }

      // 3. Delete Expenses (Bazar, Shared, Individual)
      const deletedExpenses = await tx.expense.deleteMany({
        where: { periodId: period.id },
      });

      // 4. Delete Deposits
      const deletedDeposits = await tx.deposit.deleteMany({
        where: { periodId: period.id },
      });

      // 5. Delete Monthly Closing Details and Closings
      await tx.monthlyClosingDetail.deleteMany({
        where: { closing: { periodId: period.id } },
      });
      await tx.monthlyClosing.deleteMany({
        where: { periodId: period.id },
      });

      // 6. Delete Ledger Entries for this period
      await tx.memberLedgerEntry.deleteMany({
        where: {
          messId: session.messId,
          periodId: period.id,
        },
      });

      // 7. Reopen period and mark unclosed
      await tx.monthlyPeriod.update({
        where: { id: period.id },
        data: {
          isClosed: false,
          closedAt: null,
          closedById: null,
          reopenedAt: now,
          reopenedById: session.userId,
          reopenReason: 'Admin Full Monthly Reset',
        },
      });

      // 8. If requested, reset initial opening balances
      if (data.resetMemberInitialBalances) {
        await tx.messMember.updateMany({
          where: { messId: session.messId },
          data: { initialOpeningBalance: 0 },
        });
      }

      return {
        meals: deletedMeals.count,
        expenses: deletedExpenses.count,
        deposits: deletedDeposits.count,
      };
    });

    await logActivity({
      messId: session.messId,
      userId: session.userId,
      action: 'ADMIN_MONTHLY_ACCOUNTING_RESET',
      entity: 'ACCOUNTING',
      details: {
        period: `${year}-${month}`,
        scope: 'CURRENT_MONTH',
        recordsDeleted: result,
        resetInitialBalances: !!data.resetMemberInitialBalances,
        performedBy: session.name,
        role: session.role,
      },
      reason: data.reason || `Admin reset accounting for ${month}/${year} from settings`,
    });

    safeRevalidate();

    return {
      success: true,
      message: `${month}/${year} মাসের সকল হিসাব (মিল: ${result.meals}টি, খরচ: ${result.expenses}টি, জমা: ${result.deposits}টি) সফলভাবে রিসেট করা হয়েছে। চলতি মাসের হিসাব সম্পূর্ণ শূন্য (০.০০) থেকে নতুনভাবে শুরু হয়েছে।`,
      result,
    };
  } else {
    // -------------------------------------------------------------
    // COMPLETE ALL-TIME ACCOUNTING RESET
    // -------------------------------------------------------------
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete all Meal Entries
      const deletedMeals = await tx.mealEntry.deleteMany({
        where: { messId: session.messId },
      });

      // 2. Delete Shared Expense Allocations
      await tx.sharedExpenseAllocation.deleteMany({
        where: { expense: { messId: session.messId } },
      });

      // 3. Delete all Expenses (Bazar, Shared, Individual)
      const deletedExpenses = await tx.expense.deleteMany({
        where: { messId: session.messId },
      });

      // 4. Delete all Deposits
      const deletedDeposits = await tx.deposit.deleteMany({
        where: { messId: session.messId },
      });

      // 5. Delete all Monthly Closing Details and Closings
      await tx.monthlyClosingDetail.deleteMany({
        where: { closing: { messId: session.messId } },
      });
      await tx.monthlyClosing.deleteMany({
        where: { messId: session.messId },
      });

      // 6. Delete all Member Ledger Entries
      await tx.memberLedgerEntry.deleteMany({
        where: { messId: session.messId },
      });

      // 7. Delete Fine Fund Transactions & Maintenance Expenses
      await tx.fineFundTransaction.deleteMany({
        where: { messId: session.messId },
      });
      await tx.maintenanceExpense.deleteMany({
        where: { messId: session.messId },
      });

      // 8. Delete Fines
      const deletedFines = await tx.fine.deleteMany({
        where: { messId: session.messId },
      });

      // 9. Delete Bazar Schedules
      const deletedSchedules = await tx.bazarSchedule.deleteMany({
        where: { messId: session.messId },
      });

      // 10. Delete/Reset all Monthly Periods
      await tx.monthlyPeriod.deleteMany({
        where: { messId: session.messId },
      });

      // Create a clean active period for the current month
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
      await tx.monthlyPeriod.create({
        data: {
          messId: session.messId,
          year,
          month,
          startDate,
          endDate,
          isClosed: false,
        },
      });

      // 11. Reset member initial balances if requested
      if (data.resetMemberInitialBalances !== false) {
        await tx.messMember.updateMany({
          where: { messId: session.messId },
          data: { initialOpeningBalance: 0 },
        });
      }

      return {
        meals: deletedMeals.count,
        expenses: deletedExpenses.count,
        deposits: deletedDeposits.count,
        fines: deletedFines.count,
        schedules: deletedSchedules.count,
      };
    });

    await logActivity({
      messId: session.messId,
      userId: session.userId,
      action: 'ADMIN_FULL_ACCOUNTING_RESET',
      entity: 'ACCOUNTING',
      details: {
        scope: 'ALL_TIME',
        recordsDeleted: result,
        performedBy: session.name,
        role: session.role,
      },
      reason: data.reason || 'Admin complete mess accounting reset from settings',
    });

    safeRevalidate();

    return {
      success: true,
      message: `মেসের সমস্ত অতীত ও বর্তমান হিসাব সফলভাবে রিসেট করা হয়েছে! সকল মিল (${result.meals}টি), খরচ (${result.expenses}টি), জমা (${result.deposits}টি), জরিমানা (${result.fines}টি) ও শিডিউল মুছে মেস নতুনভাবে শুরু হয়েছে। সদস্যদের প্রোফাইল ও লগইন অক্ষত রয়েছে।`,
      result,
    };
  }
}
