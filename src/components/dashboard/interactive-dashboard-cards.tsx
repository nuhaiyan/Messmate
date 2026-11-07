'use client';

import React, { useState, useRef, useTransition } from 'react';
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
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
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
    availableMessFund: number;
    totalNetDues: number;
    totalNetAdvances: number;
  };
  todayMeals: TodayMealItem[];
  allMembers: MemberSummaryItem[];
  bazarExpenses: BazarItem[];
  deposits: DepositItem[];
  additionalExpenses: AdditionalExpenseItem[];
  memberBalances: DueAdvanceItem[];
  includeBreakfast?: boolean;
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
  includeBreakfast = false,
}: InteractiveDashboardCardsProps) {
  const router = useRouter();
  const { language, t } = useI18n();
  const [isPending, startTransition] = useTransition();

  // Carousel scroll ref and active index
  const carouselRef = useRef<HTMLDivElement>(null);
  const [scrollIndex, setScrollIndex] = useState(0);

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

  const handleOpenReset = (e: React.MouseEvent, cardType: DashboardCardType) => {
    e.stopPropagation(); // Stop card click from triggering navigation / drilldown
    setConfirmationInput('');
    setResetReason('');
    setResetModalCard(cardType);
  };

  const handleConfirmReset = async () => {
    if (!resetModalCard) return;

    if (!canEdit) {
      showNotification('error', language === 'bn' ? 'অনুমতি নেই: শুধুমাত্র এডমিন বা ম্যানেজার রিসেট করতে পারবেন।' : 'Permission denied: Only Primary Admin, Manager, or Admins can perform data resets.');
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
            setSearchQuery('');
            res = { success: true, message: language === 'bn' ? 'সদস্য তালিকা ও ফিল্টার রিসেট করা হয়েছে।' : 'Member list view & filters reset.' };
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
          showNotification('success', res.message || (language === 'bn' ? 'রিসেট সফলভাবে সম্পন্ন হয়েছে।' : 'Section reset completed successfully.'));
          setResetModalCard(null);
          router.refresh();
        } else {
          showNotification('error', res.error || (language === 'bn' ? 'রিসেট প্রক্রিয়া ব্যর্থ হয়েছে।' : 'Failed to execute reset operation.'));
        }
      } catch (err: any) {
        showNotification('error', err?.message || (language === 'bn' ? 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।' : 'An unexpected error occurred during reset.'));
      }
    });
  };

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
        showNotification('success', language === 'bn' ? `আজকের মিল সংরক্ষিত হয়েছে (${res.count} জন সদস্য)।` : `Today's meal entries updated successfully (${res.count} members).`);
        setIsEditingMeals(false);
        router.refresh();
      } else {
        showNotification('error', res.error || 'Failed to update meals.');
      }
    });
  };

  const handleReactivateMember = async (memberId: string, memberName: string) => {
    startTransition(async () => {
      const res = await activateMemberAction(memberId);
      if (res.success) {
        showNotification('success', language === 'bn' ? `${memberName} পুনরায় সক্রিয় করা হয়েছে।` : `${memberName} reactivated for active mess operations.`);
        router.refresh();
      } else {
        showNotification('error', res.error || 'Failed to reactivate member.');
      }
    });
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleCarouselScroll = () => {
    if (carouselRef.current) {
      const sLeft = carouselRef.current.scrollLeft;
      const idx = Math.round(sLeft / 290);
      setScrollIndex(idx);
    }
  };

  const scrollToCard = (index: number) => {
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: index * 290, behavior: 'smooth' });
      setScrollIndex(index);
    }
  };

  // -------------------------------------------------------------------------
  // SECTION 1: MAIN DASHBOARD OVERVIEW CARDS (ONLY 4 IMPORTANT METRICS)
  // -------------------------------------------------------------------------
  const totalExpensesValue = metrics.monthBazarExpense + metrics.totalAdditionalExpenses;

  const section1Cards = [
    {
      type: 'monthly_meals' as DashboardCardType,
      title: language === 'bn' ? 'মোট মিল' : (t.dashboard?.totalMeals || 'Total Meals'),
      value: metrics.monthTotalMeals.toString(),
      subtitle: language === 'bn' ? 'চলতি মাসে সর্বমোট গ্রহণকৃত মিল' : (t.dashboard?.totalMealsSubtitle || 'Total meals consumed this month'),
      badge: language === 'bn' ? 'মিল শিডিউল' : 'Monthly Cycle',
      badgeColor: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      icon: Utensils,
      cardBg: 'bg-white dark:bg-slate-900 border-orange-200/90 dark:border-orange-900/60 hover:border-orange-400 dark:hover:border-orange-600',
      iconBg: 'bg-orange-500 text-white shadow-xs shadow-orange-500/30',
      destinationHref: '/reports',
    },
    {
      type: 'meal_rate' as DashboardCardType,
      title: language === 'bn' ? 'বর্তমান মিল রেট' : (t.dashboard?.mealRate || 'Current Meal Rate'),
      value: metrics.isMealRateAvailable ? `৳${metrics.mealRate}` : 'N/A',
      subtitle: language === 'bn' ? 'মোট বাজার খরচ ÷ মোট মিল' : (t.dashboard?.mealRateSubtitle || 'Total Valid Bazar ÷ Total Meals'),
      badge: language === 'bn' ? 'বাজার ÷ মিল' : 'Bazar / Meals',
      badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icon: TrendingUp,
      cardBg: 'bg-white dark:bg-slate-900 border-amber-200/90 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-600',
      iconBg: 'bg-amber-500 text-white shadow-xs shadow-amber-500/30',
      destinationHref: '/closing',
    },
    {
      type: 'bazar' as DashboardCardType,
      title: language === 'bn' ? 'মোট খরচ' : (t.dashboard?.totalExpenses || 'Total Expenses'),
      value: formatCurrency(totalExpensesValue),
      subtitle: language === 'bn'
        ? `বাজার: ${formatCurrency(metrics.monthBazarExpense)} • অন্যান্য: ${formatCurrency(metrics.totalAdditionalExpenses)}`
        : `Bazar: ${formatCurrency(metrics.monthBazarExpense)} • Other: ${formatCurrency(metrics.totalAdditionalExpenses)}`,
      badge: language === 'bn' ? 'বাজার + অন্যান্য' : 'Bazar + Fixed',
      badgeColor: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      icon: Receipt,
      cardBg: 'bg-white dark:bg-slate-900 border-purple-200/80 dark:border-purple-900/50 hover:border-purple-400 dark:hover:border-purple-600',
      iconBg: 'bg-purple-500 text-white shadow-xs shadow-purple-500/30',
      destinationHref: '/bazar',
    },
    {
      type: 'deposits' as DashboardCardType,
      title: language === 'bn' ? 'বর্তমান মেস ফান্ড' : (t.dashboard?.messFund || 'Current Mess Fund'),
      value: formatCurrency(metrics.availableMessFund),
      subtitle: language === 'bn'
        ? `প্রকৃত ফান্ড ব্যালেন্স (জমা - মেস ব্যয়)`
        : (t.dashboard?.messFundSubtitle || 'Actual Available Fund (Deposits - Spent)'),
      badge: metrics.availableMessFund >= 0
        ? (language === 'bn' ? 'সারপ্লাস ব্যালেন্স' : 'Available Surplus')
        : (language === 'bn' ? 'ফান্ড ঘাটতি' : 'Fund Deficit'),
      badgeColor: metrics.availableMessFund >= 0
        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      icon: Wallet,
      cardBg: 'bg-white dark:bg-slate-900 border-emerald-200/80 dark:border-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-600',
      iconBg: metrics.availableMessFund >= 0 ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30' : 'bg-rose-600 text-white shadow-xs',
      destinationHref: '/deposits',
    },
  ];

  // -------------------------------------------------------------------------
  // SECTION 2: ADDITIONAL DASHBOARD FUNCTIONALITIES (HORIZONTALLY SWIPEABLE)
  // -------------------------------------------------------------------------
  const section2Cards = [
    {
      type: 'today_meals' as DashboardCardType,
      title: language === 'bn' ? 'আজকের মোট মিল' : "Today's Total Meals",
      value: metrics.todayTotalMeals,
      subtitle: language === 'bn' ? `সকাল, দুপুর ও রাত (${formatDate(todayDateStr)})` : `Breakfast, lunch & dinner (${formatDate(todayDateStr)})`,
      icon: Utensils,
      cardBg: 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-700',
      iconBg: 'bg-rose-500 text-white shadow-xs shadow-rose-500/30',
      badgeColor: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300',
      destinationHref: `/meals?date=${todayDateStr}`,
    },
    {
      type: 'active_members' as DashboardCardType,
      title: language === 'bn' ? 'সক্রিয় সদস্য' : 'Active Members',
      value: metrics.activeMembersCount,
      subtitle: language === 'bn' ? 'মেসের নিবন্ধিত সক্রিয় সদস্যবৃন্দ' : 'Registered roommates participating in meals',
      icon: Users,
      cardBg: 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200/70 dark:border-indigo-900/40 hover:border-indigo-400 dark:hover:border-indigo-700',
      iconBg: 'bg-indigo-500 text-white shadow-xs shadow-indigo-500/30',
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300',
      destinationHref: '/members',
    },
    {
      type: 'bazar' as DashboardCardType,
      title: language === 'bn' ? 'চলতি মাসের বাজার' : 'Monthly Bazar Expense',
      value: formatCurrency(metrics.monthBazarExpense),
      subtitle: language === 'bn' ? 'খাবার ও মুদি সামগ্রীর মোট খরচ' : 'Total grocery & food expenses',
      icon: ShoppingCart,
      cardBg: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-700',
      iconBg: 'bg-amber-500 text-white shadow-xs shadow-amber-500/30',
      badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
      destinationHref: '/bazar',
    },
    {
      type: 'deposits' as DashboardCardType,
      title: language === 'bn' ? 'সদস্যদের মোট জমা' : 'Total Member Deposits',
      value: formatCurrency(metrics.totalDeposits),
      subtitle: language === 'bn' ? 'কমন ফান্ডে সদস্যদের জমাকৃত অর্থ' : 'Common mess fund contributions',
      icon: Wallet,
      cardBg: 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-200/70 dark:border-sky-900/40 hover:border-sky-400 dark:hover:border-sky-700',
      iconBg: 'bg-sky-500 text-white shadow-xs shadow-sky-500/30',
      badgeColor: 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300',
      destinationHref: '/deposits',
    },
    {
      type: 'additional_expenses' as DashboardCardType,
      title: language === 'bn' ? 'অন্যান্য মেস খরচ' : 'Additional Expenses',
      value: formatCurrency(metrics.totalAdditionalExpenses),
      subtitle: language === 'bn' ? 'খালা, বিদ্যুৎ, ইন্টারনেট ও অন্যান্য বিল' : 'Cook, Electricity, Internet & WiFi',
      icon: Receipt,
      cardBg: 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-200/70 dark:border-purple-900/40 hover:border-purple-400 dark:hover:border-purple-700',
      iconBg: 'bg-purple-500 text-white shadow-xs shadow-purple-500/30',
      badgeColor: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300',
      destinationHref: '/additional-expenses',
    },
    {
      type: 'dues' as DashboardCardType,
      title: language === 'bn' ? 'মোট বকেয়া (বাকি)' : 'Total Outstanding Dues',
      value: formatCurrency(metrics.totalNetDues),
      subtitle: language === 'bn' ? 'মেম্বারদের কাছে মেসের পাওনা' : 'Owed by members to mess fund',
      icon: AlertCircle,
      cardBg: 'bg-rose-50/80 dark:bg-rose-950/25 border-rose-200/80 dark:border-rose-900/50 hover:border-rose-400 dark:hover:border-rose-700',
      iconBg: 'bg-rose-600 text-white shadow-xs shadow-rose-600/30',
      badgeColor: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300',
      destinationHref: '/reports',
    },
    {
      type: 'advances' as DashboardCardType,
      title: language === 'bn' ? 'মোট অগ্রিম (পাওনা)' : 'Total Member Advances',
      value: formatCurrency(metrics.totalNetAdvances),
      subtitle: language === 'bn' ? 'মেসের কাছে মেম্বারদের বাড়তি জমা' : 'Surplus credit held by mess fund',
      icon: PiggyBank,
      cardBg: 'bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-700',
      iconBg: 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300',
      destinationHref: '/reports',
    },
    {
      type: 'deactivated_members' as DashboardCardType,
      title: language === 'bn' ? 'নিষ্ক্রিয় সদস্য' : 'Deactivated Members',
      value: metrics.deactivatedMembersCount,
      subtitle: language === 'bn' ? 'সংরক্ষিত হিসাবসহ নিষ্ক্রিয় সদস্য' : 'Inactive members with preserved history',
      icon: UserX,
      cardBg: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300',
      iconBg: 'bg-slate-600 text-white shadow-xs',
      badgeColor: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      destinationHref: '/members',
    },
  ];

  const allCardsCombined = [...section1Cards, ...section2Cards];

  return (
    <div className="space-y-8">
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

      {/* =======================================================================
          SECTION 1: MAIN DASHBOARD OVERVIEW (4 PROMINENT SUMMARY CARDS)
      ======================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-6 rounded-full bg-gradient-to-b from-orange-500 to-amber-600" />
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {language === 'bn' ? 'প্রধান ড্যাশবোর্ড ওভারভিউ' : 'Main Dashboard Overview'}
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 hidden sm:inline">
            {language === 'bn' ? 'চলতি মাসের ৪টি মূল আর্থিক সূচক' : '4 Core Financial Metrics'}
          </span>
        </div>

        {/* 4 Premium Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {section1Cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.type + card.title}
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
                className={`relative group p-5 rounded-3xl border shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-w-0 ${card.cardBg}`}
              >
                <div>
                  {/* Top Header: Title, Badge, and Icon */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 block truncate">
                        {card.title}
                      </span>
                      {card.badge && (
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
                          {card.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Reset Button (Stop Propagation!) */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenReset(e, card.type)}
                        title={canEdit ? `Reset ${card.title}` : 'Reset info (Managers & Admins only)'}
                        className="w-7 h-7 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/50 dark:border-slate-700/50 hover:border-rose-200"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <div className={`p-2.5 rounded-2xl shrink-0 ${card.iconBg}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Main Metric Value */}
                  <div className="mt-4">
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 truncate">
                      {card.value}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                {/* Bottom interactive hint */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  <span className="font-bold flex items-center gap-1">
                    {language === 'bn' ? 'বিস্তারিত দেখুন' : 'View details'} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {language === 'bn' ? 'ট্যাপ করুন' : 'Tap to drilldown'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =======================================================================
          SECTION 2: ADDITIONAL DASHBOARD FUNCTIONALITIES (HORIZONTALLY SWIPEABLE)
      ======================================================================= */}
      <section className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                {language === 'bn' ? 'অতিরিক্ত কার্যক্রম ও ফিচার' : 'Additional Dashboard Functionalities'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'bn' ? 'বামে অথবা ডানে সোয়াইপ করে অন্যান্য কার্ডগুলো দেখুন' : 'Swipe left or right to explore operational modules'}
              </p>
            </div>
          </div>

          {/* Desktop Left/Right Navigation Arrows */}
          <div className="hidden sm:flex items-center gap-1.5 self-end sm:self-center">
            <button
              onClick={() => scrollCarousel('left')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-slate-600 dark:text-slate-300 hover:text-orange-600 transition-all cursor-pointer shadow-2xs"
              aria-label="Previous Cards"
              title={language === 'bn' ? 'আগের কার্ড' : 'Previous cards'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollCarousel('right')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-slate-600 dark:text-slate-300 hover:text-orange-600 transition-all cursor-pointer shadow-2xs"
              aria-label="Next Cards"
              title={language === 'bn' ? 'পরের কার্ড' : 'Next cards'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Swipeable Horizontal Scroll Container */}
        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-2 px-0.5 w-full max-w-full"
        >
          {section2Cards.map((card) => {
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
                className={`relative group p-4 sm:p-5 rounded-2xl border shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between shrink-0 w-[270px] sm:w-[290px] md:w-[310px] snap-start min-w-0 ${card.cardBg}`}
              >
                <div>
                  {/* Top header: Title, Reset Button, and Icon */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 line-clamp-1">
                      {card.title}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleOpenReset(e, card.type)}
                        title={canEdit ? `Reset ${card.title}` : 'Reset info (Managers & Admins only)'}
                        className="w-7 h-7 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/50 dark:border-slate-700/50 hover:border-rose-200"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <div className={`p-2.5 rounded-xl shrink-0 ${card.iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Metric Value */}
                  <div className="mt-3">
                    <h4 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50 truncate">
                      {card.value}
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 font-medium">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                {/* Bottom hint */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  <span className="font-semibold flex items-center gap-1">
                    {language === 'bn' ? 'বিস্তারিত' : 'View details'} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {language === 'bn' ? 'ট্যাপ করুন' : 'Tap to edit'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {section2Cards.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToCard(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                scrollIndex === i
                  ? 'w-6 bg-orange-500 dark:bg-orange-400'
                  : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE DRILLDOWN MODAL (FOR ALL CARDS)
      ========================================================================= */}
      {activeDrilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
                  {allCardsCombined.find((c) => c.type === activeDrilldown)?.icon &&
                    React.createElement(allCardsCombined.find((c) => c.type === activeDrilldown)!.icon, { className: 'w-5 h-5' })}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {allCardsCombined.find((c) => c.type === activeDrilldown)?.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'bn'
                      ? `${formatDate(todayDateStr)}-এর বিস্তারিত তথ্য • মাস: ${currentMonth}/${currentYear}`
                      : `Drill-down details for ${formatDate(todayDateStr)} • Period ${currentMonth}/${currentYear}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={allCardsCombined.find((c) => c.type === activeDrilldown)?.destinationHref || '/dashboard'}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300 hover:text-orange-800 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200 dark:border-orange-800"
                >
                  <span>{language === 'bn' ? 'সম্পূর্ণ মডিউল খুলুন' : 'Open Full Module'}</span>
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50 dark:bg-sky-950/30 p-4 rounded-xl border border-sky-100 dark:border-sky-900/40">
                    <div>
                      <span className="text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider">
                        {language === 'bn' ? 'আজকের মিল গ্রহণ' : "Today's Meal Consumption"}
                      </span>
                      <p className="text-2xl font-bold text-sky-950 dark:text-sky-100 mt-0.5">
                        {todayMeals.reduce((acc, m) => acc + m.total, 0)} {language === 'bn' ? 'মোট মিল' : 'Total Meals'}
                      </p>
                      <p className="text-xs text-sky-700 dark:text-sky-400 mt-1">
                        {language === 'bn'
                          ? `তারিখ: ${formatDate(todayDateStr)} • মোট মিল গ্রহণকারী সদস্য: ${todayMeals.length}`
                          : `Recorded on ${formatDate(todayDateStr)}. Active members participating: ${todayMeals.length}.`}
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
                              {language === 'bn' ? 'বাতিল' : 'Cancel'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveTodayMeals}
                              disabled={isPending}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isPending ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Changes')}</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setIsEditingMeals(true)}
                            className="bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'আজকের মিল দ্রুত এডিট করুন' : "Quick Edit Today's Meals"}</span>
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
                          <th className="px-4 py-3">{language === 'bn' ? 'সদস্য' : 'Member'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'রুম' : 'Room'}</th>
                          {includeBreakfast && <th className="px-4 py-3 text-center">{language === 'bn' ? 'সকাল' : 'Breakfast'}</th>}
                          <th className="px-4 py-3 text-center">{language === 'bn' ? 'দুপুর' : 'Lunch'}</th>
                          <th className="px-4 py-3 text-center">{language === 'bn' ? 'রাত' : 'Dinner'}</th>
                          <th className="px-4 py-3 text-right">{language === 'bn' ? 'দৈনিক মোট' : "Today's Total"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                        {editingTodayMeals.map((m, idx) => (
                          <tr key={m.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{m.fullName}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">{m.roomNumber || '—'}</td>

                            {isEditingMeals ? (
                              <>
                                {includeBreakfast && (
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
                                )}
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
                                        total: (includeBreakfast ? next[idx].breakfast : 0) + val + next[idx].dinner,
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
                                        total: (includeBreakfast ? next[idx].breakfast : 0) + next[idx].lunch + val,
                                      };
                                      setEditingTodayMeals(next);
                                    }}
                                    className="w-16 px-2 py-1 text-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded font-bold text-slate-900 dark:text-slate-100"
                                  />
                                </td>
                              </>
                            ) : (
                              <>
                                {includeBreakfast && <td className="px-4 py-3 text-center font-mono font-medium">{m.breakfast}</td>}
                                <td className="px-4 py-3 text-center font-mono font-medium">{m.lunch}</td>
                                <td className="px-4 py-3 text-center font-mono font-medium">{m.dinner}</td>
                              </>
                            )}
                            <td className="px-4 py-3 text-right font-extrabold text-orange-600 dark:text-orange-400">{m.total}</td>
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
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={language === 'bn' ? 'সদস্য খুঁজুন...' : 'Search members by name, phone or room...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">{language === 'bn' ? 'সদস্য' : 'Member'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'রুম' : 'Room'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'ফোন' : 'Phone'}</th>
                          <th className="px-4 py-3 text-center">{language === 'bn' ? 'চলতি মিল' : 'Month Meals'}</th>
                          <th className="px-4 py-3 text-right">{language === 'bn' ? 'ব্যালেন্স' : 'Balance'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {allMembers
                          .filter((m) => m.isActive && (m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone.includes(searchQuery)))
                          .map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{m.fullName}</td>
                              <td className="px-4 py-3 font-mono">{m.roomNumber || '—'}</td>
                              <td className="px-4 py-3 font-mono">{m.phone}</td>
                              <td className="px-4 py-3 text-center font-bold text-orange-600 dark:text-orange-400">{m.totalMeals}</td>
                              <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-slate-100">{formatCurrency(m.balance)}</td>
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
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">{language === 'bn' ? 'সদস্য' : 'Member'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'ফোন' : 'Phone'}</th>
                          <th className="px-4 py-3 text-right">{language === 'bn' ? 'সংরক্ষিত ব্যালেন্স' : 'Preserved Balance'}</th>
                          <th className="px-4 py-3 text-center">{language === 'bn' ? 'পদক্ষেপ' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {allMembers.filter((m) => !m.isActive).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">
                              {language === 'bn' ? 'কোনো নিষ্ক্রিয় সদস্য নেই।' : 'No deactivated members.'}
                            </td>
                          </tr>
                        ) : (
                          allMembers
                            .filter((m) => !m.isActive)
                            .map((m) => (
                              <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{m.fullName}</td>
                                <td className="px-4 py-3 font-mono">{m.phone}</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-200">{formatCurrency(m.balance)}</td>
                                <td className="px-4 py-3 text-center">
                                  {canEdit && (
                                    <button
                                      onClick={() => handleReactivateMember(m.id, m.fullName)}
                                      disabled={isPending}
                                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                                    >
                                      {language === 'bn' ? 'সক্রিয় করুন' : 'Reactivate'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- D. MONTHLY MEALS DRILLDOWN ---------------- */}
              {activeDrilldown === 'monthly_meals' && (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800/40 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-orange-950 dark:text-orange-200">
                        {language === 'bn' ? 'চলতি মাসের মোট মিল' : 'Current Month Total Meals'}
                      </h4>
                      <p className="text-xs text-orange-800 dark:text-orange-300 mt-0.5">
                        {language === 'bn'
                          ? `মাসের মোট মিল: ${metrics.monthTotalMeals} • বর্তমান মিল রেট: ৳${metrics.mealRate}`
                          : `Total: ${metrics.monthTotalMeals} meals • Current Meal Rate: ৳${metrics.mealRate}`}
                      </p>
                    </div>
                    <Link
                      href="/reports"
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl"
                    >
                      {language === 'bn' ? 'পূর্ণাঙ্গ রিপোর্ট' : 'Full Report'}
                    </Link>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">{language === 'bn' ? 'সদস্য' : 'Member'}</th>
                          <th className="px-4 py-3 text-center">{language === 'bn' ? 'মোট মিল' : 'Total Meals'}</th>
                          <th className="px-4 py-3 text-center text-orange-600">{language === 'bn' ? 'মিল রেট' : 'Meal Rate'}</th>
                          <th className="px-4 py-3 text-right">{language === 'bn' ? 'মিল খরচ' : 'Meal Cost'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {memberBalances.map((m) => (
                          <tr key={m.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{m.fullName}</td>
                            <td className="px-4 py-3 text-center font-bold text-orange-600 dark:text-orange-400">{m.meals}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-orange-600 dark:text-orange-400">৳{metrics.mealRate}</td>
                            <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-slate-100">{formatCurrency(m.mealCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- E. MEAL RATE DRILLDOWN ---------------- */}
              {activeDrilldown === 'meal_rate' && (
                <div className="space-y-4">
                  <div className="p-5 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-orange-950/30 rounded-2xl border border-orange-200 dark:border-orange-800/60 space-y-3">
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-500" />
                      {language === 'bn' ? 'মিল রেট হিসাবের নির্ভুল সূত্র' : 'Accurate Meal Rate Formula'}
                    </h4>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-orange-200/80 dark:border-orange-800/60 font-mono text-sm font-bold text-orange-700 dark:text-orange-300">
                      {language === 'bn'
                        ? 'মিল রেট = মোট বাজার খরচ ÷ মোট মিল'
                        : 'Meal Rate = Total Valid Bazar Expense ÷ Total Meals'}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block">{language === 'bn' ? 'মোট বাজার খরচ' : 'Total Bazar Expense'}</span>
                        <strong className="text-base text-slate-900 dark:text-slate-100">{formatCurrency(metrics.monthBazarExpense)}</strong>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block">{language === 'bn' ? 'মোট মিল' : 'Total Meals'}</span>
                        <strong className="text-base text-slate-900 dark:text-slate-100">{metrics.monthTotalMeals}</strong>
                      </div>
                      <div className="p-3 bg-orange-100/70 dark:bg-orange-950/60 rounded-xl border border-orange-300 dark:border-orange-800">
                        <span className="text-orange-800 dark:text-orange-300 block">{language === 'bn' ? 'ফাইনাল মিল রেট' : 'Calculated Rate'}</span>
                        <strong className="text-lg text-orange-700 dark:text-orange-300 font-black">৳{metrics.mealRate}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- F. BAZAR EXPENSES DRILLDOWN ---------------- */}
              {activeDrilldown === 'bazar' && (
                <div className="space-y-4">
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'বিবরণ' : 'Item Title'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'পেমেন্ট উৎস' : 'Payment Source'}</th>
                          <th className="px-4 py-3 text-right">{language === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {bazarExpenses.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-mono text-slate-500">{formatDate(b.date)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{b.title}</td>
                            <td className="px-4 py-3">{b.category}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.paymentSource === 'PERSONAL'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}>
                                {b.paymentSource} {b.payerName ? `(${b.payerName.split(' ')[0]})` : ''}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-extrabold text-orange-600 dark:text-orange-400">
                              {formatCurrency(b.amount)}
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
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'সদস্য' : 'Member'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'মাধ্যম' : 'Method'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'ট্রানজেকশন আইডি' : 'Transaction ID'}</th>
                          <th className="px-4 py-3 text-right">{language === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {deposits.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-mono text-slate-500">{formatDate(d.depositDate)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{d.memberName}</td>
                            <td className="px-4 py-3 font-medium text-emerald-600 dark:text-emerald-400">{d.paymentMethod}</td>
                            <td className="px-4 py-3 font-mono text-slate-400">{d.transactionId || '—'}</td>
                            <td className="px-4 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(d.amount)}
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
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'খাত' : 'Expense Title'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                          <th className="px-4 py-3">{language === 'bn' ? 'ধরণ' : 'Type'}</th>
                          <th className="px-4 py-3 text-right">{language === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {additionalExpenses.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-mono text-slate-500">{formatDate(e.date)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{e.title}</td>
                            <td className="px-4 py-3">{e.category}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                                {e.expenseType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-slate-100">
                              {formatCurrency(e.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- I. DUES DRILLDOWN ---------------- */}
              {activeDrilldown === 'dues' && (
                <div className="space-y-4">
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">{language === 'bn' ? 'সদস্যের নাম' : 'Member Name'}</th>
                          <th className="px-4 py-3 text-center">{language === 'bn' ? 'মোট খরচ' : 'Total Cost'}</th>
                          <th className="px-4 py-3 text-center">{language === 'bn' ? 'জমা' : 'Deposits'}</th>
                          <th className="px-4 py-3 text-right font-bold text-rose-600">{language === 'bn' ? 'বকেয়া পরিমাণ' : 'Due Amount'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {memberBalances
                          .filter((m) => m.dueAmount > 0)
                          .map((m) => (
                            <tr key={m.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{m.fullName}</td>
                              <td className="px-4 py-3 text-center">{formatCurrency(m.totalCost)}</td>
                              <td className="px-4 py-3 text-center">{formatCurrency(m.deposits)}</td>
                              <td className="px-4 py-3 text-right font-black text-rose-600 dark:text-rose-400">
                                {formatCurrency(m.dueAmount)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- J. ADVANCES DRILLDOWN ---------------- */}
              {activeDrilldown === 'advances' && (
                <div className="space-y-4">
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">{language === 'bn' ? 'সদস্যের নাম' : 'Member Name'}</th>
                          <th className="px-4 py-3 text-center">{language === 'bn' ? 'মোট খরচ' : 'Total Cost'}</th>
                          <th className="px-4 py-3 text-center">{language === 'bn' ? 'জমা' : 'Deposits'}</th>
                          <th className="px-4 py-3 text-right font-bold text-emerald-600">{language === 'bn' ? 'অগ্রিম পরিমাণ' : 'Advance Amount'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {memberBalances
                          .filter((m) => m.advanceAmount > 0)
                          .map((m) => (
                            <tr key={m.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{m.fullName}</td>
                              <td className="px-4 py-3 text-center">{formatCurrency(m.totalCost)}</td>
                              <td className="px-4 py-3 text-center">{formatCurrency(m.deposits)}</td>
                              <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(m.advanceAmount)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RESET CONFIRMATION DIALOG
      ========================================================================= */}
      {resetModalCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                  {language === 'bn' ? 'রিসেট নিশ্চিতকরণ' : 'Reset Confirmation'}
                </h3>
              </div>
              <button
                onClick={() => setResetModalCard(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {!canEdit ? (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>{language === 'bn' ? 'অনুমতি আবশ্যক' : 'Permission Required'}</span>
                  </div>
                  <p>
                    {language === 'bn'
                      ? 'শুধুমাত্র পারমানেন্ট এডমিন বা মেস ম্যানেজার ডাটা রিসেট করতে পারবেন।'
                      : 'Only the Permanent Primary Admin or authorized Mess Manager can reset data.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 space-y-1">
                    <p className="font-bold">
                      {language === 'bn' ? 'সতর্কবার্তা:' : 'Reset Warning:'}
                    </p>
                    <p>
                      {language === 'bn'
                        ? `আপনি কি নিশ্চিত যে এই সেকশনের ডাটা রিসেট করতে চান?`
                        : `Are you sure you want to reset data for this section?`}
                    </p>
                  </div>

                  {(resetModalCard === 'monthly_meals' ||
                    resetModalCard === 'bazar' ||
                    resetModalCard === 'deposits' ||
                    resetModalCard === 'additional_expenses' ||
                    resetModalCard === 'dues' ||
                    resetModalCard === 'advances') && (
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        {language === 'bn' ? 'নিশ্চিত করতে ' : 'Type '}
                        <span className="font-mono text-rose-600 font-black">RESET</span>
                        {language === 'bn' ? ' লিখুন:' : ' to confirm:'}
                      </label>
                      <input
                        type="text"
                        placeholder="RESET"
                        value={confirmationInput}
                        onChange={(e) => setConfirmationInput(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      {language === 'bn' ? 'রিসেটের কারণ (অডিট লগ):' : 'Reason for Reset (Audit Log):'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'bn' ? 'যেমন: মেম্বারদের অনুরোধে ডাটা সংশোধন' : 'e.g. Data correction requested by members'}
                      value={resetReason}
                      onChange={(e) => setResetReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetModalCard(null)}
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
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
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {isPending
                    ? language === 'bn' ? 'প্রক্রিয়াকরণ...' : 'Processing...'
                    : language === 'bn' ? 'রিসেট নিশ্চিত করুন' : 'Confirm Reset'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
