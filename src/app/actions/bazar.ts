'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireManager } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

function safeRevalidate(path?: string) {
  try {
    revalidatePath('/', 'layout');
    if (path) revalidatePath(path);
    revalidatePath('/bazar');
    revalidatePath('/dashboard');
    revalidatePath('/reports');
    revalidatePath('/profile');
    revalidatePath('/members');
    revalidatePath('/finance');
    revalidatePath('/my-ledger');
  } catch {
    // Ignore outside request context
  }
}

export async function addBazarExpenseAction(data: {
  date: string;
  title: string;
  amount: number;
  category: string;
  paymentSource: 'PERSONAL' | 'MESS_FUND';
  payerMemberId?: string;
  description?: string;
}) {
  const session = await requireAuth();
  const isManagement = session.isPrimaryAdmin || session.isAdmin || session.isManager;

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

  // Determine payer member ID & approval status
  // If general member submits:
  // - Payer is automatically the member themselves
  // - Entry is set to isApproved: false (PENDING confirmation by Admin or Manager)
  // If Manager or Admin submits:
  // - Automatically approved (isApproved: true)
  let payerMemberId: string | null = null;
  const isApproved = isManagement ? true : false;

  if (isManagement) {
    if (data.paymentSource === 'PERSONAL') {
      if (!data.payerMemberId) {
        return {
          success: false,
          error: 'Purchaser member is required when payment source is Personal Payment.',
        };
      }
      payerMemberId = data.payerMemberId;
    }
  } else {
    // General member submitting their own bazar expense
    payerMemberId = session.memberId;
  }

  if (payerMemberId) {
    const payer = await prisma.messMember.findUnique({
      where: { id: payerMemberId },
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
      payerMemberId,
      description: data.description || null,
      isApproved,
      createdById: session.userId,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: isApproved ? 'BAZAR_EXPENSE_CREATED' : 'BAZAR_EXPENSE_SUBMITTED_PENDING',
    entity: 'EXPENSE',
    entityId: expense.id,
    details: {
      title: data.title,
      amount: data.amount,
      paymentSource: data.paymentSource,
      isApproved,
      submittedBy: session.name,
    },
  });

  safeRevalidate();
  return {
    success: true,
    expenseId: expense.id,
    isApproved,
    message: isApproved
      ? 'বাজার খরচ সফলভাবে যুক্ত হয়েছে।'
      : 'বাজার খরচের এন্ট্রি জমা হয়েছে! ম্যানেজার বা অ্যাডমিন অনুমোদন করলে এটি মূল খরচে যোগ হবে।',
  };
}

export async function approveBazarExpenseAction(expenseId: string) {
  const session = await requireManager();

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { period: true, payerMember: true },
  });

  if (!expense || expense.messId !== session.messId) {
    return { success: false, error: 'বাজার খরচের রেকর্ড পাওয়া যায়নি।' };
  }

  if (expense.period.isClosed) {
    return { success: false, error: 'বদ্ধ মাসের খরচ অনুমোদন করা সম্ভব নয়।' };
  }

  if (expense.isApproved) {
    return { success: true, message: 'এই খরচটি আগেই অনুমোদিত হয়েছে।' };
  }

  await prisma.expense.update({
    where: { id: expenseId },
    data: { isApproved: true },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'BAZAR_EXPENSE_APPROVED',
    entity: 'EXPENSE',
    entityId: expenseId,
    details: {
      title: expense.title,
      amount: Number(expense.amount),
      approvedBy: session.name,
    },
  });

  safeRevalidate();
  return { success: true, message: 'বাজার খরচ সফলভাবে অনুমোদিত হয়েছে।' };
}

export async function rejectBazarExpenseAction(expenseId: string, reason?: string) {
  const session = await requireManager();

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { period: true },
  });

  if (!expense || expense.messId !== session.messId) {
    return { success: false, error: 'বাজার খরচের রেকর্ড পাওয়া যায়নি।' };
  }

  if (expense.period.isClosed) {
    return { success: false, error: 'বদ্ধ মাসের রেকর্ড পরিবর্তন করা সম্ভব নয়।' };
  }

  await prisma.expense.delete({
    where: { id: expenseId },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'BAZAR_EXPENSE_REJECTED',
    entity: 'EXPENSE',
    entityId: expenseId,
    details: {
      title: expense.title,
      amount: Number(expense.amount),
      rejectedBy: session.name,
      reason,
    },
  });

  safeRevalidate();
  return { success: true, message: 'বাজার খরচ প্রত্যাখ্যান/বাতিল করা হয়েছে।' };
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

  safeRevalidate();
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

  safeRevalidate();
  return { success: true };
}
