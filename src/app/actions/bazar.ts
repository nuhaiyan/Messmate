'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireManager } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

export async function addBazarExpenseAction(data: {
  date: string;
  title: string;
  amount: number;
  category: string;
  paymentSource: 'PERSONAL' | 'MESS_FUND';
  payerMemberId?: string;
  description?: string;
}) {
  const session = await requireManager();
  const expenseDate = new Date(`${data.date}T12:00:00Z`);
  const year = expenseDate.getUTCFullYear();
  const month = expenseDate.getUTCMonth() + 1;

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

  if (data.paymentSource === 'PERSONAL') {
    if (!data.payerMemberId) {
      return {
        success: false,
        error: 'Purchaser member is required when payment source is Personal Payment.',
      };
    }
    const payer = await prisma.messMember.findUnique({
      where: { id: data.payerMemberId },
    });
    if (!payer || !payer.isActive || payer.isArchived) {
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
      date: expenseDate,
      title: data.title,
      amount: Number(data.amount),
      category: data.category,
      expenseType: 'BAZAR',
      paymentSource: data.paymentSource,
      payerMemberId: data.paymentSource === 'PERSONAL' ? data.payerMemberId : null,
      description: data.description || null,
      createdById: session.userId,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'BAZAR_EXPENSE_CREATED',
    entity: 'EXPENSE',
    entityId: expense.id,
    details: { title: data.title, amount: data.amount, paymentSource: data.paymentSource },
  });

  revalidatePath('/bazar');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { success: true, expenseId: expense.id };
}

export async function updateBazarExpenseAction(expenseId: string, data: {
  date: string;
  title: string;
  amount: number;
  category: string;
  paymentSource: 'PERSONAL' | 'MESS_FUND';
  payerMemberId?: string;
  description?: string;
}) {
  const session = await requireManager();

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { period: true },
  });

  if (!expense) return { success: false, error: 'Expense record not found.' };
  if (expense.period.isClosed) {
    return { success: false, error: 'Cannot edit expense. This monthly period is closed.' };
  }

  await prisma.expense.update({
    where: { id: expenseId },
    data: {
      date: new Date(`${data.date}T12:00:00Z`),
      title: data.title,
      amount: Number(data.amount),
      category: data.category,
      paymentSource: data.paymentSource,
      payerMemberId: data.paymentSource === 'PERSONAL' ? data.payerMemberId : null,
      description: data.description || null,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'BAZAR_EXPENSE_UPDATED',
    entity: 'EXPENSE',
    entityId: expenseId,
    details: { previousAmount: expense.amount, newAmount: data.amount },
    reason: 'Manager edit of bazar expense',
  });

  revalidatePath('/bazar');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { success: true };
}

export async function deleteBazarExpenseAction(expenseId: string) {
  const session = await requireManager();

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { period: true },
  });

  if (!expense) return { success: false, error: 'Expense record not found.' };
  if (expense.period.isClosed) {
    return { success: false, error: 'Cannot delete expense from a closed period.' };
  }

  await prisma.expense.delete({
    where: { id: expenseId },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'BAZAR_EXPENSE_DELETED',
    entity: 'EXPENSE',
    entityId: expenseId,
    details: { title: expense.title, amount: expense.amount },
  });

  revalidatePath('/bazar');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { success: true };
}
