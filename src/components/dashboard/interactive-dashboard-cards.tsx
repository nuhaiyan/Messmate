'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Utensils,
  Users,
  UserX,
  CalendarCheck,
  TrendingUp,
  ShoppingCart,
  Wallet,
  Receipt,
  AlertCircle,
  PiggyBank,
  RotateCcw,
  ExternalLink,
  X,
  Check,
  AlertTriangle,
  Lock,
  Edit2,
  Save,
  Search,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  resetTodayMealsAction,
  resetMonthlyMealsAction,
  resetBazarExpensesAction,
  resetDepositsAction,
  resetAdditionalExpensesAction,
  recalculateMealRateAction,
  synchronizeMemberBalancesAction,
  resetOutstandingDuesAction,
  resetMemberAdvancesAction,
} from '@/app/actions/dashboard-reset';
import { saveBulkMealsAction } from '@/app/actions/meals';
import { activateMemberAction } from '@/app/actions/members';

export type DashboardCardType =
  | 'today_meals'
  | 'active_members'
  | 'deactivated_members'
  | 'monthly_meals'
  | 'meal_rate'
  | 'bazar'
  | 'deposits'
  | 'additional_expenses'
  | 'dues'
  | 'advances';

export interface TodayMealItem {
  memberId: string;
  fullName: string;
  roomNumber: string | null;
  breakfast: number;
  lunch: number;
  dinner: number;
  total: number;
}

export interface MemberSummaryItem {
  id: string;
  fullName: string;
  roomNumber: string | null;
  phone: string;
  joiningDate: string;
  isActive: boolean;
  totalMeals: number;
  balance: number;
}

export interface BazarItem {
  id: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  paymentSource: string;
  payerName: string | null;
}

export interface DepositItem {
  id: string;
  depositDate: string;
  memberName: string;
  amount: number;
  paymentMethod: string;
  transactionId: string | null;
}

export interface AdditionalExpenseItem {
  id: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  expenseType: string;
  targetMemberName: string | null;
}

export interface DueAdvanceItem {
  memberId: string;
  fullName: string;
  meals: number;
  mealCost: number;
  otherCost: number;
  totalCost: number;
  deposits: number;
  balance: number;
  dueAmount: number;
  advanceAmount: number;
}

interface InteractiveDashboardCardsProps {
  currentYear: number;
  currentMonth: number;
  todayDateStr: string;
  isPeriodClosed: boolean;
  userPermissions: {
    isPrimaryAdmin: boolean;
    isAdmin: boolean;
    isManager: boolean;
    role: string;
    name: string;
  };
  metrics: {
    todayTotalMeals: number;
    activeMembersCount: number;
    deactivatedMembersCount: number;
    monthTotalMeals: number;
    monthBazarExpense: number;
    mealRate: number;
    isMealRateAvailable: boolean;
    totalDeposits: number;
    totalAdditionalExpenses: number;
    totalNetDues: number;
    totalNetAdvances: number;
  };
  todayMeals: TodayMealItem[];
  allMembers: MemberSummaryItem[];
  bazarExpenses: BazarItem[];
  deposits: DepositItem[];
  additionalExpenses: AdditionalExpenseItem[];
  memberBalances: DueAdvanceItem[];
}

export function InteractiveDashboardCards({
  currentYear,
  currentMonth,
  todayDateStr,
  isPeriodClosed,
  userPermissions,
  metrics,
  todayMeals,
  allMembers,
  bazarExpenses,
  deposits,
  additionalExpenses,
  memberBalances,
}: InteractiveDashboardCardsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Drilldown modal state
  const [activeDrilldown, setActiveDrilldown] = useState<DashboardCardType | null>(null);

  // Reset confirmation modal state
  const [resetModalCard, setResetModalCard] = useState<DashboardCardType | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Quick inline edit state for Today's Meals
  const [editingTodayMeals, setEditingTodayMeals] = useState<TodayMealItem[]>(todayMeals);
  const [isEditingMeals, setIsEditingMeals] = useState(false);

  // Search filter inside drill-down modals
  const [searchQuery, setSearchQuery] = useState('');

  const canEdit = userPermissions.isPrimaryAdmin || userPermissions.isAdmin || userPermissions.isManager;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  // Open reset dialog with safety checks
  const handleOpenReset = (e: React.MouseEvent, cardType: DashboardCardType) => {
    e.stopPropagation(); // CRITICAL: Stop card click from triggering navigation / drilldown
    setConfirmationInput('');
    setResetReason('');
    setResetModalCard(cardType);
  };

  // Execute section-specific reset
  const handleConfirmReset = async () => {
    if (!resetModalCard) return;

    if (!canEdit) {
      showNotification('error', 'Permission denied: Only Primary Admin, Manager, or Admins can perform data resets.');
      setResetModalCard(null);
      return;
    }

    startTransition(async () => {
      try {
        let res: { success: boolean; error?: string; message?: string; count?: number } = { success: false };

        switch (resetModalCard) {
          case 'today_meals':
            res = await resetTodayMealsAction({
              date: todayDateStr,
              reason: resetReason || "Reset today's meal entries",
            });
            break;

          case 'active_members':
          case 'deactivated_members':
            // Non-destructive filter reset
            setSearchQuery('');
            res = { success: true, message: 'Member list view & filters reset.' };
            break;

          case 'monthly_meals':
            res = await resetMonthlyMealsAction({
              year: currentYear,
              month: currentMonth,
              confirmationWord: confirmationInput,
              reason: resetReason || "Reset monthly meal records",
            });
            break;

          case 'bazar':
            res = await resetBazarExpensesAction({
              year: currentYear,
              month: currentMonth,
              confirmationWord: confirmationInput,
              reason: resetReason || "Reset monthly bazar expenses",
            });
            break;

          case 'deposits':
            res = await resetDepositsAction({
              year: currentYear,
              month: currentMonth,
              confirmationWord: confirmationInput,
              reason: resetReason || "Reset monthly member deposits",
            });
            break;

          case 'additional_expenses':
            res = await resetAdditionalExpensesAction({
              year: currentYear,
              month: currentMonth,
              confirmationWord: confirmationInput,
              reason: resetReason || "Reset monthly additional expenses",
            });
            break;

          case 'meal_rate':
            res = await recalculateMealRateAction({
              year: currentYear,
              month: currentMonth,
              reason: resetReason || 'Recalculated meal rate from remaining expenses and meals',
            });
            break;

          case 'dues':
            res = await resetOutstandingDuesAction({
              year: currentYear,
              month: currentMonth,
              confirmationWord: confirmationInput,
              reason: resetReason || 'Controlled due settlement & balance reset',
            });
            break;

          case 'advances':
            res = await resetMemberAdvancesAction({
              year: currentYear,
              month: currentMonth,
              confirmationWord: confirmationInput,
              reason: resetReason || 'Controlled advance surplus settlement & reset',
            });
            break;
        }

        if (res.success) {
          showNotification('success', res.message || `Section reset completed successfully.`);
          setResetModalCard(null);
          router.refresh();
        } else {
          showNotification('error', res.error || 'Failed to execute reset operation.');
        }
      } catch (err: any) {
        showNotification('error', err?.message || 'An unexpected error occurred during reset.');
      }
    });
  };

  // Save Today's Meals from inline edit
  const handleSaveTodayMeals = async () => {
    startTransition(async () => {
      const res = await saveBulkMealsAction({
        date: todayDateStr,
        meals: editingTodayMeals.map((m) => ({
          memberId: m.memberId,
          breakfast: m.breakfast,
          lunch: m.lunch,
          dinner: m.dinner,
        })),
      });

      if (res.success) {
        showNotification('success', `Today's meal entries updated successfully (${res.count} members).`);
        setIsEditingMeals(false);
        router.refresh();
      } else {
        showNotification('error', res.error || 'Failed to update meals.');
      }
    });
  };

  // Reactivate a member directly from Deactivated drilldown
  const handleReactivateMember = async (memberId: string, memberName: string) => {
    startTransition(async () => {
      const res = await activateMemberAction(memberId);
      if (res.success) {
        showNotification('success', `${memberName} reactivated for active mess operations.`);
        router.refresh();
      } else {
        showNotification('error', res.error || 'Failed to reactivate member.');
      }
    });
  };

  // Filter helpers
  const activeMembersList = allMembers.filter((m) => m.isActive);
  const deactivatedMembersList = allMembers.filter((m) => !m.isActive);

  // Cards definitions
  const cards = [
    {
      type: 'today_meals' as DashboardCardType,
      title: "Today's Total Meals",
      value: metrics.todayTotalMeals,
      subtitle: `Breakfast, lunch & dinner (${formatDate(todayDateStr)})`,
      icon: Utensils,
      variant: 'bg-orange-50/80 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/50 hover:border-orange-300',
      badgeColor: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300',
      destinationLabel: 'Daily Meals Sheet',
      destinationHref: `/meals?date=${todayDateStr}`,
    },
    {
      type: 'active_members' as DashboardCardType,
      title: 'Active Members',
      value: metrics.activeMembersCount,
      subtitle: 'Registered roommates participating in meals',
      icon: Users,
      variant: 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 hover:border-slate-300',
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
      destinationLabel: 'Members Directory',
      destinationHref: '/members',
    },
    {
      type: 'deactivated_members' as DashboardCardType,
      title: 'Deactivated Members',
      value: metrics.deactivatedMembersCount,
      subtitle: 'Inactive members with preserved history',
      icon: UserX,
      variant: 'bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200 hover:border-slate-300',
      badgeColor: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      destinationLabel: 'Deactivated Members List',
      destinationHref: '/members',
    },
    {
      type: 'monthly_meals' as DashboardCardType,
      title: 'Current Month Total Meals',
      value: metrics.monthTotalMeals,
      subtitle: 'Total meals consumed this month',
      icon: CalendarCheck,
      variant: 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 hover:border-slate-300',
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
      destinationLabel: 'Monthly Meal Reports',
      destinationHref: '/reports',
    },
    {
      type: 'bazar' as DashboardCardType,
      title: 'Current Month Bazar',
      value: formatCurrency(metrics.monthBazarExpense),
      subtitle: 'Total grocery & food expenses',
      icon: ShoppingCart,
      variant: 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50 hover:border-amber-300',
      badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
      destinationLabel: 'Bazar Management',
      destinationHref: '/bazar',
    },
    {
      type: 'meal_rate' as DashboardCardType,
      title: 'Current Meal Rate',
      value: metrics.isMealRateAvailable ? `৳${metrics.mealRate}` : 'N/A',
      subtitle: 'Total Bazar / Total Meals',
      icon: TrendingUp,
      variant: 'bg-orange-500/15 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/80 hover:border-orange-400',
      badgeColor: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300',
      destinationLabel: 'Meal Rate Breakdown',
      destinationHref: '/closing',
    },
    {
      type: 'deposits' as DashboardCardType,
      title: 'Total Member Deposits',
      value: formatCurrency(metrics.totalDeposits),
      subtitle: 'Common mess fund contributions',
      icon: Wallet,
      variant: 'bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/50 hover:border-sky-300',
      badgeColor: 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300',
      destinationLabel: 'Deposits Management',
      destinationHref: '/deposits',
    },
    {
      type: 'additional_expenses' as DashboardCardType,
      title: 'Other Mess Expenses',
      value: formatCurrency(metrics.totalAdditionalExpenses),
      subtitle: 'Cook, Electricity, Internet & WiFi',
      icon: Receipt,
      variant: 'bg-violet-50/80 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-100 dark:border-violet-900/50 hover:border-violet-300',
      badgeColor: 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300',
      destinationLabel: 'Additional Expenses',
      destinationHref: '/additional-expenses',
    },
    {
      type: 'dues' as DashboardCardType,
      title: 'Total Outstanding Dues',
      value: formatCurrency(metrics.totalNetDues),
      subtitle: 'Owed by members to mess fund',
      icon: AlertCircle,
      variant: 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/50 hover:border-rose-300',
      badgeColor: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300',
      destinationLabel: 'Dues & Advances Report',
      destinationHref: '/reports',
    },
    {
      type: 'advances' as DashboardCardType,
      title: 'Total Member Advances',
      value: formatCurrency(metrics.totalNetAdvances),
      subtitle: 'Surplus credit held by mess fund',
      icon: PiggyBank,
      variant: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-300',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300',
      destinationLabel: 'Member Advance Statements',
      destinationHref: '/reports',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-medium shadow-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 10 Interactive Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.type}
              onClick={() => {
                setSearchQuery('');
                setActiveDrilldown(card.type);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setActiveDrilldown(card.type);
                }
              }}
              className="relative group p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md hover:-translate-y-0.5 hover:border-orange-300 dark:hover:border-orange-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Top header: Title, Reset Button, and Icon */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 line-clamp-1">
                    {card.title}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Reset Button (Stop Propagation!) */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenReset(e, card.type)}
                      title={canEdit ? `Reset ${card.title}` : 'Reset info (Managers & Admins only)'}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <div className={`p-2 rounded-xl ${card.variant}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Main Metric Value */}
                <div className="mt-3">
                  <h4 className="text-xl xl:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                    {card.value}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {card.subtitle}
                  </p>
                </div>
              </div>

              {/* Bottom interactive hint */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                <span className="font-semibold flex items-center gap-1">
                  View details <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="text-[10px] text-slate-400">Interactive</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          INTERACTIVE DRILLDOWN MODAL (FOR ALL 10 CARDS)
      ========================================================================= */}
      {activeDrilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  {cards.find((c) => c.type === activeDrilldown)?.icon &&
                    React.createElement(cards.find((c) => c.type === activeDrilldown)!.icon, { className: 'w-5 h-5' })}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {cards.find((c) => c.type === activeDrilldown)?.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Drill-down details for {formatDate(todayDateStr)} • Period {currentMonth}/{currentYear}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Link to full dedicated module */}
                <Link
                  href={cards.find((c) => c.type === activeDrilldown)?.destinationHref || '/dashboard'}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                >
                  <span>Open Full Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => {
                    setActiveDrilldown(null);
                    setIsEditingMeals(false);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* ---------------- A. TODAY'S TOTAL MEALS DRILLDOWN ---------------- */}
              {activeDrilldown === 'today_meals' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50 p-4 rounded-xl border border-sky-100">
                    <div>
                      <span className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                        Today&apos;s Meal Consumption
                      </span>
                      <p className="text-2xl font-bold text-sky-950 mt-0.5">
                        {todayMeals.reduce((acc, m) => acc + m.total, 0)} Total Meals
                      </p>
                      <p className="text-xs text-sky-700 mt-1">
                        Recorded on {formatDate(todayDateStr)}. Active members participating: {todayMeals.length}.
                      </p>
                    </div>

                    {canEdit && !isPeriodClosed && (
                      <div className="flex items-center gap-2">
                        {isEditingMeals ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingTodayMeals(todayMeals);
                                setIsEditingMeals(false);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveTodayMeals}
                              disabled={isPending}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isPending ? 'Saving...' : 'Save Changes'}</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setIsEditingMeals(true)}
                            className="bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Quick Edit Today&apos;s Meals</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Members Today Meals Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Member</th>
                          <th className="px-4 py-3">Room</th>
                          <th className="px-4 py-3 text-center">Breakfast</th>
                          <th className="px-4 py-3 text-center">Lunch</th>
                          <th className="px-4 py-3 text-center">Dinner</th>
                          <th className="px-4 py-3 text-right">Today&apos;s Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                        {editingTodayMeals.map((m, idx) => (
                          <tr key={m.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{m.fullName}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">{m.roomNumber || '—'}</td>

                            {isEditingMeals ? (
                              <>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="5"
                                    value={m.breakfast}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const next = [...editingTodayMeals];
                                      next[idx] = {
                                        ...next[idx],
                                        breakfast: val,
                                        total: val + next[idx].lunch + next[idx].dinner,
                                      };
                                      setEditingTodayMeals(next);
                                    }}
                                    className="w-16 px-2 py-1 text-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded font-bold text-slate-900 dark:text-slate-100"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="5"
                                    value={m.lunch}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const next = [...editingTodayMeals];
                                      next[idx] = {
                                        ...next[idx],
                                        lunch: val,
                                        total: next[idx].breakfast + val + next[idx].dinner,
                                      };
                                      setEditingTodayMeals(next);
                                    }}
                                    className="w-16 px-2 py-1 text-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded font-bold text-slate-900 dark:text-slate-100"
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="5"
                                    value={m.dinner}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const next = [...editingTodayMeals];
                                      next[idx] = {
                                        ...next[idx],
                                        dinner: val,
                                        total: next[idx].breakfast + next[idx].lunch + val,
                                      };
                                      setEditingTodayMeals(next);
                                    }}
                                    className="w-16 px-2 py-1 text-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded font-bold text-slate-900 dark:text-slate-100"
                                  />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 text-center font-mono font-medium">{m.breakfast}</td>
                                <td className="px-4 py-3 text-center font-mono font-medium">{m.lunch}</td>
                                <td className="px-4 py-3 text-center font-mono font-medium">{m.dinner}</td>
                              </>
                            )}

                            <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100 font-mono text-sm">
                              {m.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- B. ACTIVE MEMBERS DRILLDOWN ---------------- */}
              {activeDrilldown === 'active_members' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search active members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Showing {activeMembersList.length} Active Members
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Member Name</th>
                          <th className="px-4 py-3">Room</th>
                          <th className="px-4 py-3">Phone</th>
                          <th className="px-4 py-3">Joining Date</th>
                          <th className="px-4 py-3 text-center">Month Meals</th>
                          <th className="px-4 py-3 text-right">Balance</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                        {activeMembersList
                          .filter((m) => m.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{m.fullName}</td>
                              <td className="px-4 py-3 font-mono">{m.roomNumber || '—'}</td>
                              <td className="px-4 py-3 font-mono">{m.phone}</td>
                              <td className="px-4 py-3">{formatDate(m.joiningDate)}</td>
                              <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-slate-100">{m.totalMeals}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold">
                                <span className={m.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                  ৳{m.balance.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Link
                                  href={`/my-ledger?memberId=${m.id}`}
                                  className="text-xs text-emerald-600 hover:text-emerald-800 font-medium underline"
                                >
                                  View Ledger
                                </Link>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- C. DEACTIVATED MEMBERS DRILLDOWN ---------------- */}
              {activeDrilldown === 'deactivated_members' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    <strong>Deactivated Members Policy:</strong> All previous meal counts, deposits, and account balances are permanently preserved. Deactivated members are excluded from daily meal entries. Authorized managers can reactivate them anytime.
                  </div>

                  {deactivatedMembersList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No deactivated members currently. All mess roommates are active.
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Member Name</th>
                            <th className="px-4 py-3">Phone</th>
                            <th className="px-4 py-3 text-center">Past Meals</th>
                            <th className="px-4 py-3 text-right">Historical Balance</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                          {deactivatedMembersList.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{m.fullName}</td>
                              <td className="px-4 py-3 font-mono">{m.phone}</td>
                              <td className="px-4 py-3 text-center font-bold">{m.totalMeals}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold">
                                ৳{m.balance.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {canEdit && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleReactivateMember(m.id, m.fullName)}
                                    disabled={isPending}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5"
                                  >
                                    Reactivate
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- D. TOTAL MONTHLY MEALS DRILLDOWN ---------------- */}
              {activeDrilldown === 'monthly_meals' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div>
                      <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                        Current Month Total Meals
                      </span>
                      <p className="text-2xl font-bold text-indigo-950 mt-0.5">
                        {metrics.monthTotalMeals} Meals
                      </p>
                      <p className="text-xs text-indigo-700 mt-1">
                        Accounting Cycle: {currentMonth}/{currentYear}
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Member</th>
                          <th className="px-4 py-3 text-center">Meals Count</th>
                          <th className="px-4 py-3 text-center">Meal Share %</th>
                          <th className="px-4 py-3 text-right">Meal Cost (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                        {memberBalances.map((mb) => {
                          const sharePct = metrics.monthTotalMeals > 0
                            ? ((mb.meals / metrics.monthTotalMeals) * 100).toFixed(1)
                            : '0';
                          return (
                            <tr key={mb.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{mb.fullName}</td>
                              <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-slate-100">{mb.meals}</td>
                              <td className="px-4 py-3 text-center font-mono">{sharePct}%</td>
                              <td className="px-4 py-3 text-right font-mono font-bold">
                                ৳{mb.mealCost.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- E. CURRENT MEAL RATE DRILLDOWN ---------------- */}
              {activeDrilldown === 'meal_rate' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-xl bg-linear-to-r from-emerald-900 to-slate-900 text-white shadow-md">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Traditional Mess Meal Rate Formula
                    </span>
                    <div className="my-3 p-3 rounded-lg bg-white/10 font-mono text-sm sm:text-base border border-white/20">
                      Meal Rate = Total Bazar Expenses ÷ Total Meals
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-3">
                      <div className="bg-white/10 p-2.5 rounded-lg">
                        <span className="text-slate-300 block">Total Bazar:</span>
                        <strong className="text-base text-white">৳{metrics.monthBazarExpense.toFixed(2)}</strong>
                      </div>
                      <div className="bg-white/10 p-2.5 rounded-lg">
                        <span className="text-slate-300 block">Total Meals:</span>
                        <strong className="text-base text-white">{metrics.monthTotalMeals}</strong>
                      </div>
                      <div className="bg-emerald-500/30 p-2.5 rounded-lg border border-emerald-400/40">
                        <span className="text-emerald-200 block">Calculated Rate:</span>
                        <strong className="text-base text-emerald-300">
                          {metrics.isMealRateAvailable ? `৳${metrics.mealRate}` : 'N/A'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-emerald-600" />
                      Financial Integrity Guarantee:
                    </p>
                    <p>
                      Fixed additional expenses (such as house cook salary, electricity cards, and high-speed fiber internet) are <strong>strictly excluded</strong> from the meal rate. They are distributed equally among members in accordance with bachelor mess accounting conventions.
                    </p>
                  </div>
                </div>
              )}

              {/* ---------------- F. BAZAR EXPENSES DRILLDOWN ---------------- */}
              {activeDrilldown === 'bazar' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search bazar items or categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Total: <strong>৳{metrics.monthBazarExpense.toFixed(2)}</strong>
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Item / Description</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Payment Source</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                        {bazarExpenses
                          .filter(
                            (b) =>
                              b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              b.category.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-3 font-mono">{formatDate(b.date)}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{b.title}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                                  {b.category}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {b.paymentSource === 'PERSONAL' ? (
                                  <span className="text-amber-700 font-medium">
                                    Personal ({b.payerName || 'Member'})
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-medium">Mess Common Fund</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                ৳{b.amount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- G. DEPOSITS DRILLDOWN ---------------- */}
              {activeDrilldown === 'deposits' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search deposits by member..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Total Deposits: <strong>৳{metrics.totalDeposits.toFixed(2)}</strong>
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Deposit Date</th>
                          <th className="px-4 py-3">Member</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Transaction ID</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                        {deposits
                          .filter((d) => d.memberName.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-3 font-mono">{formatDate(d.depositDate)}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{d.memberName}</td>
                              <td className="px-4 py-3 font-medium text-slate-700">{d.paymentMethod}</td>
                              <td className="px-4 py-3 font-mono text-slate-500">{d.transactionId || '—'}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                                ৳{d.amount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- H. ADDITIONAL EXPENSES DRILLDOWN ---------------- */}
              {activeDrilldown === 'additional_expenses' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Fixed Shared & Individual Expenses
                      </span>
                      <p className="text-xl font-bold text-amber-950 mt-0.5">
                        ৳{metrics.totalAdditionalExpenses.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Expense Title</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                        {additionalExpenses.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 font-mono">{formatDate(e.date)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{e.title}</td>
                            <td className="px-4 py-3 text-slate-600">{e.category}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  e.expenseType === 'SHARED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {e.expenseType} {e.targetMemberName ? `(${e.targetMemberName})` : ''}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                              ৳{e.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- I. DUES & ADVANCES DRILLDOWN ---------------- */}
              {(activeDrilldown === 'dues' || activeDrilldown === 'advances') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                        Total Outstanding Dues
                      </span>
                      <p className="text-xl font-bold text-rose-950 mt-1">
                        ৳{metrics.totalNetDues.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Total Member Advances
                      </span>
                      <p className="text-xl font-bold text-emerald-950 mt-1">
                        ৳{metrics.totalNetAdvances.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Member</th>
                          <th className="px-4 py-3 text-center">Meals</th>
                          <th className="px-4 py-3 text-right">Total Cost</th>
                          <th className="px-4 py-3 text-right">Deposits</th>
                          <th className="px-4 py-3 text-right">Closing Balance</th>
                          <th className="px-4 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                        {memberBalances
                          .filter((mb) => (activeDrilldown === 'dues' ? mb.dueAmount > 0 : mb.advanceAmount > 0))
                          .map((mb) => (
                            <tr key={mb.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{mb.fullName}</td>
                              <td className="px-4 py-3 text-center font-bold">{mb.meals}</td>
                              <td className="px-4 py-3 text-right font-mono">৳{mb.totalCost.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">৳{mb.deposits.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold">
                                ৳{mb.balance.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {mb.dueAmount > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Due: ৳{mb.dueAmount.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Advance: ৳{mb.advanceAmount.toFixed(2)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Section: {cards.find((c) => c.type === activeDrilldown)?.title}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveDrilldown(null);
                  setIsEditingMeals(false);
                }}
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RESET CONFIRMATION MODAL (SECTION-SPECIFIC & ROLE-CONTROLLED)
      ========================================================================= */}
      {resetModalCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-rose-950">
                  Reset {cards.find((c) => c.type === resetModalCard)?.title}?
                </h3>
              </div>
              <button
                onClick={() => setResetModalCard(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs text-slate-600">
              {!canEdit ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <span>Permission Required</span>
                  </div>
                  <p>
                    Only the <strong>Permanent Primary Admin (Mohammad Tarek Hossen)</strong>, the <strong>Current Mess Manager</strong>, or an authorized <strong>Shared Admin</strong> can reset data.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Regular members and deactivated members have read-only access.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 leading-relaxed space-y-1">
                    <p className="font-bold text-sm">Section-Specific Reset Warning</p>
                    <p>
                      Are you sure you want to reset the data associated with{' '}
                      <strong>{cards.find((c) => c.type === resetModalCard)?.title}</strong>?
                    </p>
                    {resetModalCard === 'dues' ? (
                      <p className="text-[11px] text-rose-700">
                        • This will record controlled adjustment deposit entries to settle all member outstanding dues for{' '}
                        <strong>{currentMonth}/{currentYear}</strong> (Total: <strong>৳{metrics.totalNetDues.toFixed(2)}</strong>).
                        <br />• Historical meal entries and bazar expenses are preserved. Net outstanding dues will reset to ৳0.00.
                      </p>
                    ) : resetModalCard === 'advances' ? (
                      <p className="text-[11px] text-rose-700">
                        • This will record controlled adjustment settlement entries for all member advance surpluses for{' '}
                        <strong>{currentMonth}/{currentYear}</strong> (Total: <strong>৳{metrics.totalNetAdvances.toFixed(2)}</strong>).
                        <br />• Meal rate is unaffected. Historical records are preserved. Net member advances will reset to ৳0.00.
                      </p>
                    ) : (
                      <p className="text-[11px] text-rose-700">
                        • Scope: Selected period <strong>{currentMonth}/{currentYear}</strong> only.
                        <br />• All reset actions are permanently recorded in the immutable audit trail.
                      </p>
                    )}
                  </div>

                  {/* Impact & Scope Information */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Section:</span>
                      <strong className="text-slate-800">{cards.find((c) => c.type === resetModalCard)?.title}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Period:</span>
                      <strong className="text-slate-800">{currentMonth}/{currentYear}</strong>
                    </div>
                    {resetModalCard === 'dues' && (
                      <div className="flex justify-between text-rose-700">
                        <span>Total Dues to Settle:</span>
                        <strong>৳{metrics.totalNetDues.toFixed(2)} ({memberBalances.filter((m) => m.dueAmount > 0).length} members)</strong>
                      </div>
                    )}
                    {resetModalCard === 'advances' && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Total Advances to Settle:</span>
                        <strong>৳{metrics.totalNetAdvances.toFixed(2)} ({memberBalances.filter((m) => m.advanceAmount > 0).length} members)</strong>
                      </div>
                    )}
                    {resetModalCard === 'today_meals' && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date Affected:</span>
                        <strong className="text-slate-800">{formatDate(todayDateStr)}</strong>
                      </div>
                    )}
                  </div>

                  {/* Explicit Confirmation Word for Financial / Destructive Resets */}
                  {(resetModalCard === 'monthly_meals' ||
                    resetModalCard === 'bazar' ||
                    resetModalCard === 'deposits' ||
                    resetModalCard === 'additional_expenses' ||
                    resetModalCard === 'dues' ||
                    resetModalCard === 'advances') && (
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Type <span className="font-mono text-rose-600 bg-rose-50 px-1 py-0.5 rounded">RESET</span> to confirm:
                      </label>
                      <input
                        type="text"
                        placeholder="Type RESET"
                        value={confirmationInput}
                        onChange={(e) => setConfirmationInput(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono tracking-wider focus:ring-2 focus:ring-rose-500 outline-hidden"
                      />
                    </div>
                  )}

                  {/* Reset Reason */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason for Reset (Audit Log):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Data correction requested by mess members"
                      value={resetReason}
                      onChange={(e) => setResetReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetModalCard(null)}
              >
                Cancel
              </Button>

              {canEdit && (
                <Button
                  size="sm"
                  onClick={handleConfirmReset}
                  disabled={
                    isPending ||
                    ((resetModalCard === 'monthly_meals' ||
                      resetModalCard === 'bazar' ||
                      resetModalCard === 'deposits' ||
                      resetModalCard === 'additional_expenses' ||
                      resetModalCard === 'dues' ||
                      resetModalCard === 'advances') &&
                      confirmationInput.trim().toUpperCase() !== 'RESET')
                  }
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  {isPending ? 'Processing Reset...' : 'Confirm Reset'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
