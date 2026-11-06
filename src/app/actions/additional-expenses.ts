'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireManager } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

export async function addAdditionalExpenseAction(data: {
  date: string;
  title: string;
  amount: number;
  category: string;
  expenseType: 'SHARED' | 'INDIVIDUAL';
  allocationMethod?: 'EQUAL' | 'CUSTOM' | 'PROPORTIONAL';
  targetMemberId?: string;
  description?: string;
}) {
  const session = await requireManager();
  const dateObj = new Date(`${data.date}T12:00:00Z`);
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth() + 1;

  let period = await prisma.monthlyPeriod.findUnique({
    where: {
      messId_year_month: {
        messId: session.messId,
        year,
        month,
      },
    },
  });

  if (!period) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    period = await prisma.monthlyPeriod.create({
      data: {
        messId: session.messId,
        year,
        month,
        startDate,
        endDate,
        isClosed: false,
      },
    });
  }

  if (period.isClosed) {
    return {
      success: false,
      error: `Cannot add expense. Period ${month}/${year} is CLOSED and locked.`,
    };
  }

  if (data.expenseType === 'INDIVIDUAL') {
    if (!data.targetMemberId) {
      return { success: false, error: 'Assigned member is required for Individual expense.' };
    }
    const target = await prisma.messMember.findUnique({
      where: { id: data.targetMemberId },
    });
    if (!target || !target.isActive || target.isArchived) {
      return {
        success: false,
        error: 'Cannot assign expense to a deactivated or archived member.',
      };
    }
  }

  const expense = await prisma.expense.create({
    data: {
      messId: session.messId,
      periodId: period.id,
      date: dateObj,
      title: data.title,
      amount: Number(data.amount),
      category: data.category,
      expenseType: data.expenseType,
      allocationMethod: data.expenseType === 'SHARED' ? (data.allocationMethod || 'EQUAL') : null,
      targetMemberId: data.expenseType === 'INDIVIDUAL' ? data.targetMemberId : null,
      paymentSource: 'MESS_FUND',
      description: data.description || null,
      createdById: session.userId,
    },
  });

  // If shared expense and equal distribution, pre-calculate allocation shares
  if (data.expenseType === 'SHARED') {
    const activeMembers = await prisma.messMember.findMany({
      where: { messId: session.messId, isActive: true, isArchived: false },
    });

    if (activeMembers.length > 0) {
      const perHead = Number((Number(data.amount) / activeMembers.length).toFixed(2));
      for (const m of activeMembers) {
        await prisma.sharedExpenseAllocation.create({
          data: {
            expenseId: expense.id,
            memberId: m.id,
            amount: perHead,
            sharePercentage: 100 / activeMembers.length,
          },
        });
      }
    }
  }

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'ADDITIONAL_EXPENSE_CREATED',
    entity: 'EXPENSE',
    entityId: expense.id,
    details: { title: data.title, amount: data.amount, type: data.expenseType },
  });

  revalidatePath('/additional-expenses');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { success: true, expenseId: expense.id };
}

export async function deleteAdditionalExpenseAction(expenseId: string) {
  const session = await requireManager();

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { period: true },
  });

  if (!expense) return { success: false, error: 'Expense record not found.' };
  if (expense.period.isClosed) {
    return { success: false, error: 'Cannot delete expense in a closed period.' };
  }

  // Cascades sharedAllocations
  await prisma.sharedExpenseAllocation.deleteMany({
    where: { expenseId },
  });

  await prisma.expense.delete({
    where: { id: expenseId },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'ADDITIONAL_EXPENSE_DELETED',
    entity: 'EXPENSE',
    entityId: expenseId,
    details: { title: expense.title, amount: expense.amount },
  });

  revalidatePath('/additional-expenses');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { success: true };
}
