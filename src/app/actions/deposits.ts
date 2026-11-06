'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireManager } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

export async function addDepositAction(data: {
  memberId: string;
  depositDate: string;
  amount: number;
  paymentMethod: 'CASH' | 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'OTHER';
  transactionId?: string;
  notes?: string;
}) {
  const session = await requireManager();
  const dateObj = new Date(`${data.depositDate}T12:00:00Z`);
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth() + 1;

  // Verify member is active and not archived
  const member = await prisma.messMember.findUnique({
    where: { id: data.memberId },
  });

  if (!member || !member.isActive || member.isArchived) {
    return {
      success: false,
      error: 'Cannot record deposit. Deactivated or archived members cannot receive new financial transactions.',
    };
  }

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
      error: `Cannot record deposit. Period ${month}/${year} is CLOSED and locked.`,
    };
  }

  const deposit = await prisma.deposit.create({
    data: {
      messId: session.messId,
      periodId: period.id,
      memberId: data.memberId,
      depositDate: dateObj,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId || null,
      notes: data.notes || null,
      createdById: session.userId,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'DEPOSIT_RECEIVED',
    entity: 'DEPOSIT',
    entityId: deposit.id,
    details: { memberId: data.memberId, amount: data.amount, method: data.paymentMethod },
  });

  revalidatePath('/deposits');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  revalidatePath('/my-ledger');
  return { success: true, depositId: deposit.id };
}

export async function deleteDepositAction(depositId: string) {
  const session = await requireManager();

  const deposit = await prisma.deposit.findUnique({
    where: { id: depositId },
    include: { period: true },
  });

  if (!deposit) return { success: false, error: 'Deposit not found.' };
  if (deposit.period.isClosed) {
    return { success: false, error: 'Cannot delete deposit in a closed month.' };
  }

  await prisma.deposit.delete({
    where: { id: depositId },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'DEPOSIT_DELETED',
    entity: 'DEPOSIT',
    entityId: depositId,
    details: { amount: deposit.amount, memberId: deposit.memberId },
  });

  revalidatePath('/deposits');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { success: true };
}
