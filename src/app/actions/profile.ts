'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { getMonthAccountingData } from '@/app/actions/closing';
import { logActivity } from '@/lib/audit/audit-logger';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside request context
  }
}

export async function getMemberProfileDataAction(params?: {
  memberId?: string;
  month?: number;
  year?: number;
}) {
  const session = await requireAuth();
  const targetMemberId = params?.memberId || session.memberId;

  // Verify permission: Members can view their own or roommates in the same mess
  const member = await prisma.messMember.findFirst({
    where: {
      id: targetMemberId,
      messId: session.messId,
    },
    include: {
      user: true,
      mess: true,
    },
  });

  if (!member) {
    throw new Error('Member not found');
  }

  const now = new Date();
  const currentMonth = params?.month || now.getUTCMonth() + 1;
  const currentYear = params?.year || now.getUTCFullYear();

  // Run official accounting engine for complete mathematical consistency
  const monthAccounts = await getMonthAccountingData(
    session.messId,
    currentYear,
    currentMonth
  );

  const personalAccount = monthAccounts.calculationResult.memberList.find(
    (ma) => ma.memberId === targetMemberId
  );

  // Fetch recent meal entries for the current month
  const mealEntries = await prisma.mealEntry.findMany({
    where: {
      memberId: targetMemberId,
      period: {
        year: currentYear,
        month: currentMonth,
      },
    },
    orderBy: { date: 'desc' },
    take: 31,
  });

  const bfSum = mealEntries.reduce((sum, m) => sum + Number(m.breakfast), 0);
  const lnSum = mealEntries.reduce((sum, m) => sum + Number(m.lunch), 0);
  const dnSum = mealEntries.reduce((sum, m) => sum + Number(m.dinner), 0);

  // Fetch recent deposits
  const deposits = await prisma.deposit.findMany({
    where: {
      memberId: targetMemberId,
      messId: session.messId,
    },
    orderBy: { depositDate: 'desc' },
    take: 10,
  });

  // Fetch bazar purchases paid by this member
  const bazarEntries = await prisma.expense.findMany({
    where: {
      messId: session.messId,
      payerMemberId: targetMemberId,
      expenseType: 'BAZAR',
      isApproved: true,
    },
    orderBy: { date: 'desc' },
    take: 10,
  });

  // Fetch individual expenses assigned specifically to this member
  const individualExpenses = await prisma.expense.findMany({
    where: {
      messId: session.messId,
      targetMemberId: targetMemberId,
      expenseType: 'INDIVIDUAL',
    },
    orderBy: { date: 'desc' },
    take: 10,
  });

  const isOwnProfile = session.memberId === targetMemberId;
  const canEdit = isOwnProfile || session.isPrimaryAdmin || session.isAdmin || session.isManager;

  return {
    member: {
      id: member.id,
      fullName: member.fullName,
      phone: member.phone,
      email: member.email,
      roomNumber: member.roomNumber || '',
      bio: member.bio || '',
      avatarUrl: member.avatarUrl || null,
      isActive: member.isActive,
      joinedAt: member.joiningDate.toISOString(),
      isPrimaryAdmin: member.isPrimaryAdmin,
      isAdmin: member.isAdmin,
      isManager: member.isManager,
    },
    isOwnProfile,
    canEdit,
    currentMonth,
    currentYear,
    accounting: {
      totalMeals: personalAccount ? Number(personalAccount.totalMeals.toString()) : 0,
      breakfast: bfSum,
      lunch: lnSum,
      dinner: dnSum,
      mealCost: personalAccount ? Number(personalAccount.mealCost.toString()) : 0,
      currentMealRate: monthAccounts.calculationResult.isMealRateAvailable
        ? Number(monthAccounts.calculationResult.mealRate.toString())
        : 0,
      bazarContribution: personalAccount ? Number(personalAccount.personalPayments.toString()) : 0,
      deposits: personalAccount ? Number(personalAccount.deposits.toString()) : 0,
      individualExpenseCost: personalAccount ? Number(personalAccount.individualExpenseCost.toString()) : 0,
      sharedExpenseCost: personalAccount ? Number(personalAccount.sharedExpenseCost.toString()) : 0,
      totalCost: personalAccount ? Number(personalAccount.totalCost.toString()) : 0,
      netBalance: personalAccount ? Number(personalAccount.closingBalance.toString()) : 0,
      dueAmount: personalAccount ? Number(personalAccount.dueAmount.toString()) : 0,
      advanceAmount: personalAccount ? Number(personalAccount.advanceAmount.toString()) : 0,
      balanceStatus: personalAccount?.isDue
        ? 'DUE'
        : personalAccount?.isAdvance
        ? 'ADVANCE'
        : 'BALANCED',
    },
    recentMeals: mealEntries.map((m) => ({
      id: m.id,
      date: m.date.toISOString(),
      breakfast: Number(m.breakfast),
      lunch: Number(m.lunch),
      dinner: Number(m.dinner),
      totalMeals: Number(m.totalMeals),
    })),
    recentDeposits: deposits.map((d) => ({
      id: d.id,
      date: d.depositDate.toISOString(),
      amount: Number(d.amount),
      method: d.paymentMethod,
      notes: d.notes,
    })),
    recentBazar: bazarEntries.map((b) => ({
      id: b.id,
      date: b.date.toISOString(),
      title: b.title,
      amount: Number(b.amount),
    })),
    recentExpenses: individualExpenses.map((e) => ({
      id: e.id,
      date: e.date.toISOString(),
      title: e.title,
      amount: Number(e.amount),
      category: e.category,
    })),
  };
}

export async function updateMemberProfileAction(data: {
  memberId?: string;
  fullName: string;
  phone: string;
  bio?: string;
  avatarUrl?: string | null;
}) {
  const session = await requireAuth();
  const targetMemberId = data.memberId || session.memberId;

  // Security check: Only manager/admin can edit other members' profiles
  if (targetMemberId !== session.memberId) {
    const hasAuthority = session.isPrimaryAdmin || session.isAdmin || session.isManager;
    if (!hasAuthority) {
      return { success: false, error: 'Access Denied: You cannot modify other members’ profiles.' };
    }
  }

  const trimmedName = data.fullName.trim();
  const trimmedPhone = data.phone.trim();

  if (!trimmedName) {
    return { success: false, error: 'Name cannot be empty.' };
  }
  if (!trimmedPhone) {
    return { success: false, error: 'Phone number cannot be empty.' };
  }

  const member = await prisma.messMember.findUnique({
    where: { id: targetMemberId },
  });

  if (!member || member.messId !== session.messId) {
    return { success: false, error: 'Member record not found.' };
  }

  // Update MessMember and associated User
  await prisma.$transaction(async (tx) => {
    await tx.messMember.update({
      where: { id: targetMemberId },
      data: {
        fullName: trimmedName,
        phone: trimmedPhone,
        bio: data.bio !== undefined ? data.bio.trim() : member.bio,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : member.avatarUrl,
      },
    });

    await tx.user.update({
      where: { id: member.userId },
      data: {
        name: trimmedName,
        phone: trimmedPhone,
      },
    });
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MEMBER_UPDATE',
    entity: 'MEMBER',
    details: {
      targetMemberId,
      name: trimmedName,
      isSelfUpdate: targetMemberId === session.memberId,
    },
  });

  safeRevalidate('/profile');
  safeRevalidate('/members');
  safeRevalidate('/dashboard');

  return { success: true };
}

export async function submitIndividualMealAction(data: {
  date: string; // YYYY-MM-DD
  breakfast: number;
  lunch: number;
  dinner: number;
}) {
  const session = await requireAuth();

  // Validate member status
  const member = await prisma.messMember.findUnique({
    where: { id: session.memberId },
  });

  if (!member || !member.isActive || member.isArchived) {
    return { success: false, error: 'Deactivated or archived members cannot record meal entries.' };
  }

  const mealDate = new Date(`${data.date}T12:00:00Z`);
  const year = mealDate.getUTCFullYear();
  const month = mealDate.getUTCMonth() + 1;

  // Find or create monthly period
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
      error: `Cannot modify meals for ${data.date}. This month (${month}/${year}) is CLOSED and locked.`,
    };
  }

  const bf = Math.max(0, Number(data.breakfast) || 0);
  const ln = Math.max(0, Number(data.lunch) || 0);
  const dn = Math.max(0, Number(data.dinner) || 0);
  const total = bf + ln + dn;

  // Upsert meal entry (replaces or creates for the date)
  const entry = await prisma.mealEntry.upsert({
    where: {
      memberId_date: {
        memberId: session.memberId,
        date: mealDate,
      },
    },
    create: {
      messId: session.messId,
      periodId: period.id,
      memberId: session.memberId,
      date: mealDate,
      breakfast: bf,
      lunch: ln,
      dinner: dn,
      totalMeals: total,
      createdById: session.userId,
    },
    update: {
      breakfast: bf,
      lunch: ln,
      dinner: dn,
      totalMeals: total,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MEAL_DAILY_UPDATE',
    entity: 'MEAL',
    details: {
      date: data.date,
      memberId: session.memberId,
      memberName: session.name,
      breakfast: bf,
      lunch: ln,
      dinner: dn,
      total,
    },
  });

  safeRevalidate('/profile');
  safeRevalidate('/meals');
  safeRevalidate('/dashboard');
  safeRevalidate('/reports');

  return {
    success: true,
    entry: {
      id: entry.id,
      date: entry.date.toISOString(),
      breakfast: Number(entry.breakfast),
      lunch: Number(entry.lunch),
      dinner: Number(entry.dinner),
      totalMeals: Number(entry.totalMeals),
    },
  };
}
