import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getMonthAccountingData } from '@/app/actions/closing';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { InteractiveDashboardCards } from '@/components/dashboard/interactive-dashboard-cards';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { LatestNoticeBanner } from '@/components/dashboard/latest-notice-banner';
import { NoticeCategory } from '@/app/actions/notices';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  Users,
  Utensils,
  CalendarCheck,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Receipt,
  AlertCircle,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  User,
  History,
  Crown,
  Shield,
  ArrowRight,
  Building2,
  MapPin,
  Megaphone,
  MessageSquare,
  Clock,
  Sparkles,
} from 'lucide-react';

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
      <div className="mb-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 md:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                {messName}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                {messLocation}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back, {session.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Financial and meal overview for{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </strong>{' '}
              • Timezone: Asia/Dhaka
            </p>
          </div>

          {/* Quick Authority & Action Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                <Crown className="w-3.5 h-3.5 text-amber-500" /> Admin: {primaryAdmin.fullName.split(' ')[0]}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500" /> Manager: {currentManager.fullName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/mess-profile"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-orange-600 bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
              >
                <Building2 className="w-3.5 h-3.5 text-orange-500" />
                <span>Mess Profile</span>
              </Link>
              {accountingData.period.isClosed ? (
                <Badge variant="destructive" className="px-3 py-1.5 text-xs font-semibold rounded-xl">
                  Locked Month
                </Badge>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Cycle
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LATEST BILLBOARD NOTICE HIGHLIGHT BANNER */}
      <LatestNoticeBanner latestNotice={latestNoticeItem} />

      {/* 2. 10 INTERACTIVE STATISTICS CARDS (Warm Orange Accent & Clean SaaS Hierarchy) */}
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

      {/* 4. ADDITIONAL SECTIONS: Billboard Highlights & Community Chat Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Monthly Notice Highlights */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900 transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-orange-500" />
                Monthly Notice Highlights
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Announcements, bazar schedules, and mess rules
              </p>
            </div>
            <Link
              href="/notices"
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1"
            >
              <span>View Billboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentNotices.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No active notices posted yet.</p>
              ) : (
                recentNotices.map((n) => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300">
                          {n.category.replace('_', ' ')}
                        </span>
                        {n.isPinned && (
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            ★ Pinned
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {n.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {n.content}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatDate(n.publishedAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Community Room & Messages Preview */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900 transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-500" />
                Community Room
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time discussions and roommate coordination
              </p>
            </div>
            <Link
              href="/messages"
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1"
            >
              <span>Open Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMessages.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No community messages yet. Start the conversation!</p>
              ) : (
                recentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {msg.sender.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {msg.sender.fullName}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. MEMBER DUE & ADVANCE OVERVIEW TABLE */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900 my-6">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Member Due &amp; Advance Summary
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Net balances: Meal cost + Shared expenses vs Deposits + Personal payments
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold rounded-xl border border-emerald-200 dark:border-emerald-800">
              Total Advance: {formatCurrency(result.totalNetAdvances.toString())}
            </span>
            <span className="text-xs px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold rounded-xl border border-rose-200 dark:border-rose-800">
              Total Due: {formatCurrency(result.totalNetDues.toString())}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4 text-center">Total Meals</th>
                  <th className="py-3 px-4">Meal Cost</th>
                  <th className="py-3 px-4">Other Costs</th>
                  <th className="py-3 px-4">Deposits</th>
                  <th className="py-3 px-4">Personal Paid</th>
                  <th className="py-3 px-4 text-right">Current Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {result.memberList.map((m) => {
                  const otherCosts = m.sharedExpenseCost.plus(m.individualExpenseCost);
                  return (
                    <tr key={m.memberId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {m.fullName}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-orange-600 dark:text-orange-400">
                        {m.totalMeals.toString()}
                      </td>
                      <td className="py-3 px-4">{formatCurrency(m.mealCost.toString())}</td>
                      <td className="py-3 px-4">{formatCurrency(otherCosts.toString())}</td>
                      <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatCurrency(m.deposits.toString())}
                      </td>
                      <td className="py-3 px-4 text-sky-600 dark:text-sky-400 font-semibold">
                        {formatCurrency(m.personalPayments.toString())}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(m.closingBalance.abs().toString())}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {m.isAdvance ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <ArrowUpRight className="w-3 h-3" /> Advance
                          </span>
                        ) : m.isDue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <ArrowDownRight className="w-3 h-3" /> Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 6. TWO-COLUMN GRID: RECENT TRANSACTIONS (Bazar & Member Deposits) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 my-6">
        {/* Recent Bazar Transactions */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-orange-500" />
              Recent Bazar Purchases
            </CardTitle>
            <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">Affects Meal Rate</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentBazar.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{b.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{formatDate(b.date)}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-600 dark:text-slate-300">{b.category}</span>
                      {b.paymentSource === 'PERSONAL' && (
                        <span className="px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded font-medium text-[10px]">
                          Paid by {b.payerMember?.fullName?.split(' ')[0] || 'Member'}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-orange-600 dark:text-orange-400">
                    {formatCurrency(b.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Member Deposits */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-500" />
              Recent Member Deposits
            </CardTitle>
            <span className="text-xs text-slate-400">Mess Fund</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDeposits.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{d.member.fullName}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{formatDate(d.depositDate)}</span>
                      <span>•</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{d.paymentMethod}</span>
                      {d.transactionId && (
                        <span className="font-mono text-[10px] text-slate-400">
                          TX: {d.transactionId}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(d.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7. RECENT ACTIVITIES AUDIT LOG */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900 my-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-orange-500" />
            Recent Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {act.user?.name || 'System'}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono text-[10px]">
                    {act.action}
                  </span>
                  {act.reason && (
                    <span className="text-slate-500 italic hidden sm:inline">“{act.reason}”</span>
                  )}
                </div>
                <span className="text-slate-400 text-[11px]">
                  {new Date(act.createdAt).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
