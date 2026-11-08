'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';
import { getMonthAccountingData } from '@/app/actions/closing';
import { logActivity } from '@/lib/audit/audit-logger';
import { computeScheduleStatus, formatScheduleRange, toDhakaDateString, getDhakaTodayString } from '@/lib/bazar/schedule-utils';

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
  const isManagement = session.isPrimaryAdmin || session.isAdmin || session.isManager;

  // Security Check: General Members can ONLY view their own profile and financial records
  if (!isManagement && targetMemberId !== session.memberId) {
    throw new Error('Access Denied: General Members can only view their own personal profile.');
  }

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

  // Fetch Bazar Schedules for this member
  const rawSchedules = await prisma.bazarSchedule.findMany({
    where: {
      messId: session.messId,
      memberId: targetMemberId,
    },
    orderBy: { startDate: 'desc' },
  });

  const schedules = rawSchedules.map((s) => ({
    id: s.id,
    startDate: toDhakaDateString(s.startDate),
    endDate: toDhakaDateString(s.endDate),
    formattedRange: formatScheduleRange(s.startDate, s.endDate),
    status: computeScheduleStatus(s.startDate, s.endDate),
    notes: s.notes,
  }));

  const upcomingSchedules = schedules.filter((s) => s.status === 'UPCOMING');
  const currentSchedules = schedules.filter((s) => s.status === 'ONGOING');
  const completedSchedules = schedules.filter((s) => s.status === 'COMPLETED');

  // Fetch Fines for this member
  const memberFines = await prisma.fine.findMany({
    where: {
      messId: session.messId,
      memberId: targetMemberId,
    },
    orderBy: { fineDate: 'desc' },
  });

  const totalFineAmount = memberFines.reduce((sum, f) => sum + Number(f.amount), 0);
  const paidFineAmount = memberFines.filter((f) => f.isPaid).reduce((sum, f) => sum + Number(f.amount), 0);
  const unpaidFineAmount = memberFines.filter((f) => !f.isPaid).reduce((sum, f) => sum + Number(f.amount), 0);

  // Fetch pending bazar approvals:
  // If Admin or Manager: fetch all pending bazar expenses for this mess
  // If general member: fetch their own pending bazar submissions
  const pendingBazarExpenses = await prisma.expense.findMany({
    where: {
      messId: session.messId,
      expenseType: 'BAZAR',
      isApproved: false,
      ...(isManagement ? {} : { payerMemberId: targetMemberId }),
    },
    include: {
      payerMember: {
        select: { id: true, fullName: true, avatarUrl: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  const isOwnProfile = session.memberId === targetMemberId;
  const canEdit = isOwnProfile || session.isPrimaryAdmin || session.isAdmin || session.isManager;

  const messSetting = await prisma.messSetting.findUnique({
    where: { messId: session.messId },
    select: { includeBreakfast: true },
  });
  const includeBreakfast = messSetting?.includeBreakfast ?? false;

  return {
    includeBreakfast,
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
      initialOpeningBalance: Number(member.initialOpeningBalance || 0),
    },
    isOwnProfile,
    canEdit,
    currentMonth,
    currentYear,
    bazarSchedules: {
      all: schedules,
      upcoming: upcomingSchedules,
      current: currentSchedules,
      completed: completedSchedules,
    },
    fines: {
      totalFineAmount,
      paidFineAmount,
      unpaidFineAmount,
      list: memberFines.map((f) => ({
        id: f.id,
        amount: Number(f.amount),
        reason: f.reason,
        fineDate: f.fineDate.toISOString().split('T')[0],
        isPaid: f.isPaid,
        paidAt: f.paidAt ? f.paidAt.toISOString() : null,
        paymentMethod: f.paymentMethod || 'CASH',
        notes: f.notes,
      })),
    },
    accounting: (() => {
      const dhakaTodayStr = getDhakaTodayString();
      const todayMeal = mealEntries.find(
        (m) => toDhakaDateString(m.date) === dhakaTodayStr
      );
      const todayMealsCount = todayMeal ? Number(todayMeal.totalMeals) : 0;

      const initialOpeningBalance = Number(member.initialOpeningBalance || 0);
      const memberDeposits = personalAccount ? Number(personalAccount.deposits.toString()) : 0;
      const memberBazarContribution = personalAccount ? Number(personalAccount.personalPayments.toString()) : 0;
      const memberMealCost = personalAccount ? Number(personalAccount.mealCost.toString()) : 0;
      const memberSharedExpenseCost = personalAccount ? Number(personalAccount.sharedExpenseCost.toString()) : 0;
      const memberIndividualExpenseCost = personalAccount ? Number(personalAccount.individualExpenseCost.toString()) : 0;
      const memberTotalCost = personalAccount ? Number(personalAccount.totalCost.toString()) : 0;
      const memberPreviousBalance = personalAccount ? Number(personalAccount.openingBalance.toString()) : initialOpeningBalance;

      // Exact Formula: Total Joma = Initial Balance + Deposits + Eligible Own-Pocket Bazar Payments
      const totalJoma = initialOpeningBalance + memberDeposits + memberBazarContribution;

      // Monthly Balance: Current month additions (Deposits + Own-Pocket Bazar) minus Current month costs
      const monthlyBalance = (memberDeposits + memberBazarContribution) - memberTotalCost;

      // Overall Balance: Cumulative balance across months (incorporating carry-forward)
      const overallBalance = personalAccount ? Number(personalAccount.closingBalance.toString()) : initialOpeningBalance;

      const activeOrNextSchedule = currentSchedules[0] || upcomingSchedules[0] || null;
      const bazarDateRange = activeOrNextSchedule ? activeOrNextSchedule.formattedRange : 'No assigned schedule';

      return {
        // 9 Key Overview Fields
        totalJoma,
        initialBalance: initialOpeningBalance,
        totalMeals: personalAccount ? Number(personalAccount.totalMeals.toString()) : 0,
        todayMeals: todayMealsCount,
        totalCost: memberTotalCost,
        bazarDateRange,
        bazarStatus: activeOrNextSchedule ? activeOrNextSchedule.status : null,
        totalFine: totalFineAmount,
        unpaidFine: unpaidFineAmount,
        monthlyBalance,
        overallBalance,

        // Additional detailed breakdown fields
        breakfast: bfSum,
        lunch: lnSum,
        dinner: dnSum,
        mealCost: memberMealCost,
        currentMealRate: monthAccounts.calculationResult.isMealRateAvailable
          ? Number(monthAccounts.calculationResult.mealRate.toString())
          : 0,
        bazarContribution: memberBazarContribution,
        deposits: memberDeposits,
        individualExpenseCost: memberIndividualExpenseCost,
        sharedExpenseCost: memberSharedExpenseCost,
        netBalance: overallBalance,
        previousBalance: memberPreviousBalance,
        dueAmount: personalAccount ? Number(personalAccount.dueAmount.toString()) : 0,
        advanceAmount: personalAccount ? Number(personalAccount.advanceAmount.toString()) : 0,
        balanceStatus: personalAccount?.isDue
          ? 'DUE'
          : personalAccount?.isAdvance
          ? 'ADVANCE'
          : 'BALANCED',
      };
    })(),
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
    pendingBazarApprovals: pendingBazarExpenses.map((p) => ({
      id: p.id,
      date: p.date.toISOString().split('T')[0],
      title: p.title,
      amount: Number(p.amount),
      category: p.category,
      paymentSource: p.paymentSource,
      description: p.description,
      isApproved: p.isApproved,
      payerMemberId: p.payerMemberId,
      payerMemberName: p.payerMember?.fullName || 'সদস্য',
      payerMemberAvatar: p.payerMember?.avatarUrl || null,
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
  const isManagement = session.isPrimaryAdmin || session.isAdmin || session.isManager;
  const isSelf = targetMemberId === session.memberId;

  // Permission Check: Members can edit their OWN profile; Management can edit any member's profile
  if (!isManagement && !isSelf) {
    return { success: false, error: 'Access Denied: You can only edit your own profile information.' };
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
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
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
      isSelfUpdate: isSelf,
    },
  });

  safeRevalidate('/profile');
  safeRevalidate('/members');
  safeRevalidate(`/members/${targetMemberId}`);
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
