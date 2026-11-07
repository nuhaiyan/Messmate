'use server';

import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { requireManager } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside request context
  }
}

/**
 * 1. Add Fine against a member
 * Authority: Admin or Manager
 */
export async function addFineAction(data: {
  memberId: string;
  amount: number;
  reason: string;
  fineDate: string; // YYYY-MM-DD
  isPaid?: boolean;
  paymentMethod?: 'CASH' | 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'OTHER';
  transactionId?: string;
  notes?: string;
}) {
  const session = await requireManager();

  if (!data.memberId) {
    return { success: false, error: 'Member is required.' };
  }

  const amt = new Decimal(data.amount || 0);
  if (amt.lessThanOrEqualTo(0)) {
    return { success: false, error: 'Fine amount must be greater than zero.' };
  }

  const reason = data.reason?.trim();
  if (!reason) {
    return { success: false, error: 'Fine reason is required.' };
  }

  const member = await prisma.messMember.findUnique({
    where: { id: data.memberId },
  });

  if (!member || member.messId !== session.messId) {
    return { success: false, error: 'Member not found.' };
  }

  const fineDate = new Date(`${data.fineDate}T12:00:00.000Z`);
  const isPaid = Boolean(data.isPaid);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Fine record
    const fine = await tx.fine.create({
      data: {
        messId: session.messId,
        memberId: data.memberId,
        amount: amt.toNumber(),
        reason,
        fineDate,
        isPaid,
        paidAt: isPaid ? new Date() : null,
        paymentMethod: isPaid ? (data.paymentMethod || 'CASH') : null,
        transactionId: isPaid ? (data.transactionId || null) : null,
        notes: data.notes || null,
        createdById: session.userId,
      },
    });

    // 2. If already paid, record in FineFundTransaction as FINE_COLLECTION
    if (isPaid) {
      await tx.fineFundTransaction.create({
        data: {
          messId: session.messId,
          type: 'FINE_COLLECTION',
          amount: amt.toNumber(),
          date: fineDate,
          description: `Fine collected: ${reason} (${member.fullName})`,
          memberId: member.id,
          fineId: fine.id,
          createdById: session.userId,
        },
      });
    }

    return fine;
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'FINE_ADDED',
    entity: 'FINE',
    entityId: result.id,
    details: {
      memberName: member.fullName,
      amount: amt.toNumber(),
      reason,
      isPaid,
    },
  });

  safeRevalidate('/finance');
  safeRevalidate('/members');
  safeRevalidate(`/members/${member.id}`);
  safeRevalidate('/dashboard');
  safeRevalidate('/reports');
  return { success: true, fineId: result.id };
}

/**
 * 2. Mark an existing fine as Paid
 * Authority: Admin or Manager
 */
export async function markFineAsPaidAction(data: {
  fineId: string;
  paymentMethod?: 'CASH' | 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'OTHER';
  transactionId?: string;
  paidDate?: string;
  notes?: string;
}) {
  const session = await requireManager();

  const fine = await prisma.fine.findUnique({
    where: { id: data.fineId },
    include: { member: true },
  });

  if (!fine || fine.messId !== session.messId) {
    return { success: false, error: 'Fine record not found.' };
  }

  if (fine.isPaid) {
    return { success: false, error: 'This fine has already been marked as paid.' };
  }

  const paidDate = data.paidDate ? new Date(`${data.paidDate}T12:00:00.000Z`) : new Date();

  await prisma.$transaction(async (tx) => {
    // 1. Update Fine
    await tx.fine.update({
      where: { id: data.fineId },
      data: {
        isPaid: true,
        paidAt: paidDate,
        paymentMethod: data.paymentMethod || 'CASH',
        transactionId: data.transactionId || null,
        notes: data.notes ? `${fine.notes ? fine.notes + ' | ' : ''}${data.notes}` : fine.notes,
      },
    });

    // 2. Add to FineFundTransaction
    await tx.fineFundTransaction.create({
      data: {
        messId: session.messId,
        type: 'FINE_COLLECTION',
        amount: fine.amount,
        date: paidDate,
        description: `Fine collected: ${fine.reason} (${fine.member.fullName})`,
        memberId: fine.memberId,
        fineId: fine.id,
        createdById: session.userId,
      },
    });
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'FINE_MARKED_PAID',
    entity: 'FINE',
    entityId: data.fineId,
    details: {
      memberName: fine.member.fullName,
      amount: Number(fine.amount),
      reason: fine.reason,
    },
  });

  safeRevalidate('/finance');
  safeRevalidate('/members');
  safeRevalidate(`/members/${fine.memberId}`);
  safeRevalidate('/dashboard');
  safeRevalidate('/reports');
  return { success: true };
}

/**
 * 3. Update Fine Record
 */
export async function updateFineAction(fineId: string, data: {
  amount: number;
  reason: string;
  fineDate: string;
  notes?: string;
}) {
  const session = await requireManager();

  const existing = await prisma.fine.findUnique({
    where: { id: fineId },
    include: { member: true },
  });

  if (!existing || existing.messId !== session.messId) {
    return { success: false, error: 'Fine record not found.' };
  }

  const amt = new Decimal(data.amount || 0);
  if (amt.lessThanOrEqualTo(0)) {
    return { success: false, error: 'Amount must be greater than zero.' };
  }

  const fineDate = new Date(`${data.fineDate}T12:00:00.000Z`);

  await prisma.$transaction(async (tx) => {
    await tx.fine.update({
      where: { id: fineId },
      data: {
        amount: amt.toNumber(),
        reason: data.reason.trim(),
        fineDate,
        notes: data.notes || null,
      },
    });

    // If already paid, also update related FineFundTransaction amount
    if (existing.isPaid) {
      await tx.fineFundTransaction.updateMany({
        where: { fineId },
        data: {
          amount: amt.toNumber(),
          date: fineDate,
          description: `Fine collected: ${data.reason.trim()} (${existing.member.fullName})`,
        },
      });
    }
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'FINE_UPDATED',
    entity: 'FINE',
    entityId: fineId,
    details: { previousAmount: Number(existing.amount), newAmount: amt.toNumber() },
  });

  safeRevalidate('/finance');
  safeRevalidate('/members');
  safeRevalidate(`/members/${existing.memberId}`);
  safeRevalidate('/dashboard');
  return { success: true };
}

/**
 * 4. Delete Fine Record
 */
export async function deleteFineAction(fineId: string) {
  const session = await requireManager();

  const existing = await prisma.fine.findUnique({
    where: { id: fineId },
    include: { member: true },
  });

  if (!existing || existing.messId !== session.messId) {
    return { success: false, error: 'Fine record not found.' };
  }

  await prisma.$transaction(async (tx) => {
    // Remove linked fine fund transactions first
    await tx.fineFundTransaction.deleteMany({
      where: { fineId },
    });

    await tx.fine.delete({
      where: { id: fineId },
    });
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'FINE_DELETED',
    entity: 'FINE',
    entityId: fineId,
    details: { member: existing.member.fullName, amount: Number(existing.amount), reason: existing.reason },
  });

  safeRevalidate('/finance');
  safeRevalidate('/members');
  safeRevalidate(`/members/${existing.memberId}`);
  safeRevalidate('/dashboard');
  return { success: true };
}

/**
 * 5. Add Maintenance Expense (Paid from Fine Fund)
 * Deducted exclusively from Fine Fund.
 */
export async function addMaintenanceExpenseAction(data: {
  title: string;
  amount: number;
  expenseDate: string; // YYYY-MM-DD
  description?: string;
  category?: string;
  receiptUrl?: string;
}) {
  const session = await requireManager();

  const title = data.title?.trim();
  if (!title) {
    return { success: false, error: 'Expense title is required.' };
  }

  const amt = new Decimal(data.amount || 0);
  if (amt.lessThanOrEqualTo(0)) {
    return { success: false, error: 'Amount must be greater than zero.' };
  }

  const expenseDate = new Date(`${data.expenseDate}T12:00:00.000Z`);

  const result = await prisma.$transaction(async (tx) => {
    const expense = await tx.maintenanceExpense.create({
      data: {
        messId: session.messId,
        title,
        amount: amt.toNumber(),
        expenseDate,
        description: data.description || null,
        category: data.category || 'MAINTENANCE',
        paidFromFineFund: true,
        receiptUrl: data.receiptUrl || null,
        createdById: session.userId,
      },
    });

    // Create FineFundTransaction
    await tx.fineFundTransaction.create({
      data: {
        messId: session.messId,
        type: 'MAINTENANCE_EXPENSE',
        amount: amt.toNumber(),
        date: expenseDate,
        description: `Maintenance expense: ${title}`,
        maintenanceExpenseId: expense.id,
        createdById: session.userId,
      },
    });

    return expense;
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MAINTENANCE_EXPENSE_CREATED',
    entity: 'MAINTENANCE_EXPENSE',
    entityId: result.id,
    details: { title, amount: amt.toNumber() },
    reason: 'Paid from Fine Fund for mess maintenance',
  });

  safeRevalidate('/finance');
  safeRevalidate('/dashboard');
  safeRevalidate('/reports');
  return { success: true, expenseId: result.id };
}

/**
 * 6. Update Maintenance Expense
 */
export async function updateMaintenanceExpenseAction(id: string, data: {
  title: string;
  amount: number;
  expenseDate: string;
  description?: string;
}) {
  const session = await requireManager();

  const existing = await prisma.maintenanceExpense.findUnique({
    where: { id },
  });

  if (!existing || existing.messId !== session.messId) {
    return { success: false, error: 'Maintenance expense not found.' };
  }

  const amt = new Decimal(data.amount || 0);
  if (amt.lessThanOrEqualTo(0)) {
    return { success: false, error: 'Amount must be greater than zero.' };
  }

  const expenseDate = new Date(`${data.expenseDate}T12:00:00.000Z`);

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceExpense.update({
      where: { id },
      data: {
        title: data.title.trim(),
        amount: amt.toNumber(),
        expenseDate,
        description: data.description || null,
      },
    });

    await tx.fineFundTransaction.updateMany({
      where: { maintenanceExpenseId: id },
      data: {
        amount: amt.toNumber(),
        date: expenseDate,
        description: `Maintenance expense: ${data.title.trim()}`,
      },
    });
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MAINTENANCE_EXPENSE_UPDATED',
    entity: 'MAINTENANCE_EXPENSE',
    entityId: id,
    details: { previousAmount: Number(existing.amount), newAmount: amt.toNumber() },
  });

  safeRevalidate('/finance');
  safeRevalidate('/dashboard');
  return { success: true };
}

/**
 * 7. Delete Maintenance Expense
 */
export async function deleteMaintenanceExpenseAction(id: string) {
  const session = await requireManager();

  const existing = await prisma.maintenanceExpense.findUnique({
    where: { id },
  });

  if (!existing || existing.messId !== session.messId) {
    return { success: false, error: 'Maintenance expense not found.' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.fineFundTransaction.deleteMany({
      where: { maintenanceExpenseId: id },
    });

    await tx.maintenanceExpense.delete({
      where: { id },
    });
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MAINTENANCE_EXPENSE_DELETED',
    entity: 'MAINTENANCE_EXPENSE',
    entityId: id,
    details: { title: existing.title, amount: Number(existing.amount) },
  });

  safeRevalidate('/finance');
  safeRevalidate('/dashboard');
  return { success: true };
}

/**
 * 8. Comprehensive Fine Fund Accounting Summary
 * Safe decimal arithmetic, 100% separate from normal mess fund and meal rate.
 */
export async function getFineFundSummary(messId: string) {
  const [fines, maintenanceExpenses, transactions] = await Promise.all([
    prisma.fine.findMany({
      where: { messId },
      include: {
        member: { select: { id: true, fullName: true, avatarUrl: true, phone: true } },
      },
      orderBy: { fineDate: 'desc' },
    }),
    prisma.maintenanceExpense.findMany({
      where: { messId },
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.fineFundTransaction.findMany({
      where: { messId },
      include: {
        member: { select: { fullName: true } },
      },
      orderBy: { date: 'desc' },
    }),
  ]);

  let totalCollectedFine = new Decimal(0);
  let outstandingFineAmount = new Decimal(0);

  for (const f of fines) {
    const amt = new Decimal(f.amount.toString());
    if (f.isPaid) {
      totalCollectedFine = totalCollectedFine.plus(amt);
    } else {
      outstandingFineAmount = outstandingFineAmount.plus(amt);
    }
  }

  let totalMaintenanceExpenses = new Decimal(0);
  for (const m of maintenanceExpenses) {
    totalMaintenanceExpenses = totalMaintenanceExpenses.plus(new Decimal(m.amount.toString()));
  }

  // Current Fine Fund Balance = Total Fine Collected - Total Maintenance Expenses Paid from Fine Fund
  const currentFineFundBalance = totalCollectedFine.minus(totalMaintenanceExpenses);

  return {
    totalFineCollected: totalCollectedFine.toNumber(),
    totalMaintenanceExpenses: totalMaintenanceExpenses.toNumber(),
    currentFineFundBalance: currentFineFundBalance.toNumber(),
    outstandingFineAmount: outstandingFineAmount.toNumber(),
    fines: fines.map((f) => ({
      id: f.id,
      memberId: f.memberId,
      memberName: f.member.fullName,
      memberAvatar: f.member.avatarUrl,
      memberPhone: f.member.phone,
      amount: Number(f.amount),
      reason: f.reason,
      fineDate: f.fineDate.toISOString().split('T')[0],
      isPaid: f.isPaid,
      paidAt: f.paidAt ? f.paidAt.toISOString() : null,
      paymentMethod: f.paymentMethod || 'CASH',
      transactionId: f.transactionId,
      notes: f.notes,
      createdAt: f.createdAt.toISOString(),
    })),
    maintenanceExpenses: maintenanceExpenses.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      amount: Number(m.amount),
      expenseDate: m.expenseDate.toISOString().split('T')[0],
      category: m.category,
      receiptUrl: m.receiptUrl,
      createdAt: m.createdAt.toISOString(),
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      date: t.date.toISOString().split('T')[0],
      description: t.description,
      memberName: t.member?.fullName || null,
      fineId: t.fineId,
      maintenanceExpenseId: t.maintenanceExpenseId,
    })),
  };
}
