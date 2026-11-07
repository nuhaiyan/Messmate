import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getMonthAccountingData } from '@/app/actions/closing';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { DashboardHeroBanner } from '@/components/dashboard/dashboard-hero-banner';
import { InteractiveDashboardCards } from '@/components/dashboard/interactive-dashboard-cards';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { LatestNoticeBanner } from '@/components/dashboard/latest-notice-banner';
import { PhoneNotificationBanner } from '@/components/notifications/phone-notification-button';
import { DashboardSummaryTables } from '@/components/dashboard/dashboard-summary-tables';
import { NoticeCategory } from '@/app/actions/notices';

interface DashboardPageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await requireAuth();
  const sp = await searchParams;

  const currentYear = sp.year ? parseInt(sp.year) : 2026;
  const currentMonth = sp.month ? parseInt(sp.month) : 11;

  // Fetch all members for Persona Switcher and Admin/Manager info
  const allMembers = await prisma.messMember.findMany({
    where: { messId: session.messId, isArchived: false },
    orderBy: { fullName: 'asc' },
  });

  // Fetch Mess entity and dedicated MessProfile for global dynamic branding
  const mess = await prisma.mess.findUnique({
    where: { id: session.messId },
    include: { profile: true },
  });

  const messName = mess?.profile?.messName || mess?.name || "Tarek's Residence";
  const messLogoUrl = mess?.profile?.logoUrl || mess?.logoUrl || null;
  const messLocation = mess?.profile?.location || mess?.profile?.fullAddress || mess?.address || 'Chattogram, Bangladesh';

  const primaryAdmin = allMembers.find((m) => m.isPrimaryAdmin) || { fullName: 'Mohammad Tarek Hossen' };
  const currentManager = allMembers.find((m) => m.isManager) || { fullName: 'Tanvir' };

  const membersList = allMembers.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    isPrimaryAdmin: m.isPrimaryAdmin,
    isAdmin: m.isAdmin,
    isManager: m.isManager,
    avatarUrl: m.avatarUrl,
  }));

  // 1. Fetch complete accounting calculation from real DB records
  const accountingData = await getMonthAccountingData(session.messId, currentYear, currentMonth);
  const result = accountingData.calculationResult;

  // 2. Compute today's meals
  const today = new Date('2026-11-07T12:00:00Z');
  const todayMealsRecords = await prisma.mealEntry.findMany({
    where: {
      messId: session.messId,
      date: today,
    },
  });
  const todayMeals = todayMealsRecords.reduce((sum, item) => sum + Number(item.totalMeals), 0);

  // 3. Prepare Chart Data
  const periodMealEntries = await prisma.mealEntry.findMany({
    where: { periodId: accountingData.period.id },
    orderBy: { date: 'asc' },
  });

  const dailyMealMap: Record<string, { meals: number; breakfast: number; lunch: number; dinner: number }> = {};
  for (const m of periodMealEntries) {
    const key = new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    if (!dailyMealMap[key]) {
      dailyMealMap[key] = { meals: 0, breakfast: 0, lunch: 0, dinner: 0 };
    }
    dailyMealMap[key].meals += Number(m.totalMeals);
    dailyMealMap[key].breakfast += Number(m.breakfast);
    dailyMealMap[key].lunch += Number(m.lunch);
    dailyMealMap[key].dinner += Number(m.dinner);
  }

  const dailyMealsData = Object.entries(dailyMealMap).map(([date, vals]) => ({
    date,
    meals: vals.meals,
    breakfast: vals.breakfast,
    lunch: vals.lunch,
    dinner: vals.dinner,
  }));

  const bazarExpensesData = accountingData.bazarExpenses.map((b) => ({
    date: new Date(b.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    amount: Number(b.amount),
    category: b.category,
  }));

  const memberMealsData = result.memberList.map((m) => ({
    name: m.fullName.split(' ')[0],
    meals: Number(m.totalMeals.toString()),
  }));

  // 4. Fetch recent activities
  const recentActivities = await prisma.auditLog.findMany({
    where: { messId: session.messId },
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: { user: true },
  });

  // Recent Bazar Entries
  const recentBazar = await prisma.expense.findMany({
    where: { messId: session.messId, expenseType: 'BAZAR' },
    orderBy: { date: 'desc' },
    take: 5,
    include: { payerMember: true },
  });

  // Recent Deposits
  const recentDeposits = await prisma.deposit.findMany({
    where: { messId: session.messId },
    orderBy: { depositDate: 'desc' },
    take: 5,
    include: { member: true },
  });

  // Recent Notices (Notice Highlights)
  const recentNotices = await prisma.notice.findMany({
    where: { messId: session.messId, isArchived: false },
    orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    take: 3,
    include: { creator: { select: { name: true } } },
  });

  const latestNoticeItem = recentNotices.length > 0 ? {
    id: recentNotices[0].id,
    title: recentNotices[0].title,
    content: recentNotices[0].content,
    category: recentNotices[0].category as NoticeCategory,
    isPinned: recentNotices[0].isPinned,
    publishedAt: recentNotices[0].publishedAt.toISOString(),
    creatorName: recentNotices[0].creator?.name || 'Mess Administration',
  } : null;

  // Recent Community Messages
  const recentMessages = await prisma.message.findMany({
    where: { conversation: { messId: session.messId }, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { sender: { select: { fullName: true, avatarUrl: true } } },
  });

  const activeMembersCount = accountingData.members.filter((m) => m.isActive).length;
  const deactivatedMembersCount = allMembers.filter((m) => !m.isActive).length;

  const todayMealsMap = new Map(todayMealsRecords.map((r) => [r.memberId, r]));
  const todayMealItems = allMembers
    .filter((m) => m.isActive)
    .map((m) => {
      const rec = todayMealsMap.get(m.id);
      const bf = Number(rec?.breakfast || 0);
      const ln = Number(rec?.lunch || 0);
      const dn = Number(rec?.dinner || 0);
      return {
        memberId: m.id,
        fullName: m.fullName,
        roomNumber: m.roomNumber,
        breakfast: bf,
        lunch: ln,
        dinner: dn,
        total: Number(rec?.totalMeals ?? (bf + ln + dn)),
      };
    });

  const memberBalancesMap = result.membersSummary;
  const allMembersSummaries = allMembers.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    roomNumber: m.roomNumber,
    phone: m.phone,
    joiningDate: m.joiningDate.toISOString(),
    isActive: m.isActive,
    totalMeals: memberBalancesMap[m.id] ? Number(memberBalancesMap[m.id].totalMeals.toString()) : 0,
    balance: memberBalancesMap[m.id] ? Number(memberBalancesMap[m.id].closingBalance.toString()) : Number(m.initialOpeningBalance),
  }));

  const memberNameMap = new Map(allMembers.map((m) => [m.id, m.fullName]));

  const bazarItems = accountingData.bazarExpenses.map((b) => ({
    id: b.id,
    date: b.date.toISOString(),
    title: b.title,
    category: b.category,
    amount: Number(b.amount),
    paymentSource: b.paymentSource,
    payerName: b.payerMemberId ? (memberNameMap.get(b.payerMemberId) || 'Member') : null,
  }));

  const depositItems = accountingData.deposits.map((d) => ({
    id: d.id,
    depositDate: d.depositDate.toISOString(),
    memberName: memberNameMap.get(d.memberId) || 'Member',
    amount: Number(d.amount),
    paymentMethod: d.paymentMethod,
    transactionId: d.transactionId,
  }));

  const additionalExpenseItems = accountingData.additionalExpenses.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    title: e.title,
    category: e.category,
    amount: Number(e.amount),
    expenseType: e.expenseType,
    targetMemberName: e.targetMemberId ? (memberNameMap.get(e.targetMemberId) || 'Member') : null,
  }));

  const memberBalanceItems = result.memberList.map((m) => ({
    memberId: m.memberId,
    fullName: m.fullName,
    meals: Number(m.totalMeals.toString()),
    mealCost: Number(m.mealCost.toString()),
    otherCost: Number(m.sharedExpenseCost.plus(m.individualExpenseCost).toString()),
    totalCost: Number(m.totalCost.toString()),
    deposits: Number(m.deposits.toString()),
    balance: Number(m.closingBalance.toString()),
    dueAmount: Number(m.dueAmount.toString()),
    advanceAmount: Number(m.advanceAmount.toString()),
  }));

  const summaryMembers = result.memberList.map((m) => ({
    memberId: m.memberId,
    fullName: m.fullName,
    totalMeals: Number(m.totalMeals.toString()),
    mealCost: Number(m.mealCost.toString()),
    otherCosts: Number(m.sharedExpenseCost.plus(m.individualExpenseCost).toString()),
    deposits: Number(m.deposits.toString()),
    personalPayments: Number(m.personalPayments.toString()),
    closingBalance: Number(m.closingBalance.toString()),
    isAdvance: m.isAdvance,
    isDue: m.isDue,
  }));

  const summaryBazar = recentBazar.map((b) => ({
    id: b.id,
    title: b.title,
    date: b.date.toISOString(),
    category: b.category,
    amount: Number(b.amount),
    paymentSource: b.paymentSource,
    payerName: b.payerMember?.fullName || null,
  }));

  const summaryDeposits = recentDeposits.map((d) => ({
    id: d.id,
    memberName: d.member.fullName,
    depositDate: d.depositDate.toISOString(),
    amount: Number(d.amount),
    paymentMethod: d.paymentMethod,
    transactionId: d.transactionId,
  }));

  const summaryActivities = recentActivities.map((act) => ({
    id: act.id,
    userName: act.user?.name || 'System',
    action: act.action,
    reason: act.reason,
    createdAt: act.createdAt.toISOString(),
  }));

  const summaryNotices = recentNotices.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    category: n.category,
    isPinned: n.isPinned,
    publishedAt: n.publishedAt.toISOString(),
  }));

  const summaryMessages = recentMessages.map((msg) => ({
    id: msg.id,
    senderName: msg.sender.fullName,
    senderInitial: msg.sender.fullName.charAt(0),
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
  }));

  return (
    <DashboardShell
      userRole={session.role}
      userName={session.name}
      messName={messName}
      messLogoUrl={messLogoUrl}
      activeMemberId={session.memberId}
      isPrimaryAdmin={session.isPrimaryAdmin}
      isAdmin={session.isAdmin}
      isManager={session.isManager}
      membersList={membersList}
      currentManagerName={currentManager.fullName}
      primaryAdminName={primaryAdmin.fullName}
      currentMealRate={result.isMealRateAvailable ? result.mealRate.toString() : '0.00'}
      selectedMonth={currentMonth}
      selectedYear={currentYear}
    >
      {/* 1. OVERVIEW & WELCOME HERO BANNER */}
      <DashboardHeroBanner
        userName={session.name}
        messName={messName}
        messLocation={messLocation}
        primaryAdminName={primaryAdmin.fullName}
        currentManagerName={currentManager.fullName}
        currentYear={currentYear}
        currentMonth={currentMonth}
        isPeriodClosed={accountingData.period.isClosed}
      />

      {/* LATEST BILLBOARD NOTICE HIGHLIGHT BANNER */}
      <LatestNoticeBanner latestNotice={latestNoticeItem} />

      {/* PHONE PUSH NOTIFICATION PROMPT */}
      <div className="mb-6">
        <PhoneNotificationBanner />
      </div>

      {/* 2. REDESIGNED TWO-SECTION DASHBOARD CARDS */}
      <div className="mb-6">
        <InteractiveDashboardCards
          currentYear={currentYear}
          currentMonth={currentMonth}
          todayDateStr="2026-11-07"
          isPeriodClosed={accountingData.period.isClosed}
          userPermissions={{
            isPrimaryAdmin: session.isPrimaryAdmin,
            isAdmin: session.isAdmin,
            isManager: session.isManager,
            role: session.role,
            name: session.name,
          }}
          metrics={{
            todayTotalMeals: todayMeals,
            activeMembersCount,
            deactivatedMembersCount,
            monthTotalMeals: Number(result.totalMeals.toString()),
            monthBazarExpense: Number(result.totalBazarExpense.toString()),
            mealRate: result.isMealRateAvailable ? Number(result.mealRate.toString()) : 0,
            isMealRateAvailable: result.isMealRateAvailable,
            totalDeposits: Number(result.totalDeposits.toString()),
            totalAdditionalExpenses: Number(result.totalAdditionalExpenses.toString()),
            availableMessFund: Number(result.availableMessFund.toString()),
            totalNetDues: Number(result.totalNetDues.toString()),
            totalNetAdvances: Number(result.totalNetAdvances.toString()),
          }}
          todayMeals={todayMealItems}
          allMembers={allMembersSummaries}
          bazarExpenses={bazarItems}
          deposits={depositItems}
          additionalExpenses={additionalExpenseItems}
          memberBalances={memberBalanceItems}
        />
      </div>

      {/* 3. VISUAL ANALYTICS CHARTS */}
      <DashboardCharts
        dailyMealsData={dailyMealsData}
        bazarExpensesData={bazarExpensesData}
        memberMealsData={memberMealsData}
        depositVsExpense={{
          deposits: Number(result.totalDeposits.toString()),
          bazar: Number(result.totalBazarExpense.toString()),
          additional: Number(result.totalAdditionalExpenses.toString()),
        }}
      />

      {/* 4. SUMMARY TABLES, NOTICES & COMMUNITY */}
      <DashboardSummaryTables
        memberList={summaryMembers}
        totalNetAdvances={Number(result.totalNetAdvances.toString())}
        totalNetDues={Number(result.totalNetDues.toString())}
        recentBazar={summaryBazar}
        recentDeposits={summaryDeposits}
        recentActivities={summaryActivities}
        recentNotices={summaryNotices}
        recentMessages={summaryMessages}
      />
    </DashboardShell>
  );
}
