'use client';

import React, { useState, useTransition } from 'react';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Utensils,
  Wallet,
  ShoppingCart,
  Receipt,
  TrendingUp,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Plus,
  Shield,
  Crown,
  ShieldCheck,
  DoorOpen,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { formatCurrency, formatDate } from '@/lib/utils';
import { updateMemberProfileAction, submitIndividualMealAction } from '@/app/actions/profile';

interface MemberData {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  roomNumber: string;
  bio: string;
  avatarUrl: string | null;
  isActive: boolean;
  joinedAt: string;
  isPrimaryAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
}

interface PersonalAccounting {
  totalMeals: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  mealCost: number;
  currentMealRate: number;
  bazarContribution: number;
  deposits: number;
  individualExpenseCost: number;
  sharedExpenseCost: number;
  totalCost: number;
  netBalance: number;
  dueAmount: number;
  advanceAmount: number;
  balanceStatus: string;
}

interface MealRecord {
  id: string;
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  totalMeals: number;
}

interface DepositRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  notes: string | null;
}

interface BazarRecord {
  id: string;
  date: string;
  title: string;
  amount: number;
}

interface ExpenseRecord {
  id: string;
  date: string;
  title: string;
  amount: number;
  category: string;
}

interface MemberProfileClientProps {
  member: MemberData;
  accounting: PersonalAccounting;
  recentMeals: MealRecord[];
  recentDeposits: DepositRecord[];
  recentBazar: BazarRecord[];
  recentExpenses: ExpenseRecord[];
  isOwnProfile: boolean;
  canEdit: boolean;
  currentMonth: number;
  currentYear: number;
}

export function MemberProfileClient({
  member: initialMember,
  accounting,
  recentMeals: initialMeals,
  recentDeposits,
  recentBazar,
  recentExpenses,
  isOwnProfile,
  canEdit,
  currentMonth,
  currentYear,
}: MemberProfileClientProps) {
  const { t } = useI18n();
  const [member, setMember] = useState(initialMember);
  const [meals, setMeals] = useState(initialMeals);
  const [activeTab, setActiveTab] = useState<'meals' | 'deposits' | 'bazar' | 'expenses'>('meals');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(initialMember.fullName);
  const [editPhone, setEditPhone] = useState(initialMember.phone);
  const [editBio, setEditBio] = useState(initialMember.bio);
  const [editAvatarUrl, setEditAvatarUrl] = useState(initialMember.avatarUrl || '');

  // Meal Entry State
  const todayStr = new Date().toISOString().split('T')[0];
  const [entryDate, setEntryDate] = useState(todayStr);
  const [entryBf, setEntryBf] = useState(0);
  const [entryLn, setEntryLn] = useState(1);
  const [entryDn, setEntryDn] = useState(1);

  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle Edit Profile Submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    startTransition(async () => {
      const res = await updateMemberProfileAction({
        memberId: member.id,
        fullName: editName,
        phone: editPhone,
        bio: editBio,
        avatarUrl: editAvatarUrl.trim() || null,
      });

      if (res.success) {
        setMember((prev) => ({
          ...prev,
          fullName: editName.trim(),
          phone: editPhone.trim(),
          bio: editBio.trim(),
          avatarUrl: editAvatarUrl.trim() || null,
        }));
        setIsEditModalOpen(false);
        setSuccessMsg(t.profile?.saveSuccess || 'Profile updated successfully.');
      } else {
        setErrorMsg(res.error || 'Failed to update profile.');
      }
    });
  };

  // Handle Daily Meal Submission
  const handleMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    startTransition(async () => {
      const res = await submitIndividualMealAction({
        date: entryDate,
        breakfast: Number(entryBf) || 0,
        lunch: Number(entryLn) || 0,
        dinner: Number(entryDn) || 0,
      });

      if (res.success && res.entry) {
        setSuccessMsg(t.mealEntry?.submitSuccess || 'Meal entry recorded successfully.');
        // Update local meal list
        setMeals((prev) => {
          const filtered = prev.filter(
            (m) => new Date(m.date).toISOString().split('T')[0] !== entryDate
          );
          return [
            {
              id: res.entry!.id,
              date: new Date(entryDate).toISOString(),
              breakfast: res.entry!.breakfast,
              lunch: res.entry!.lunch,
              dinner: res.entry!.dinner,
              totalMeals: res.entry!.totalMeals,
            },
            ...filtered,
          ];
        });
      } else {
        setErrorMsg(res.error || 'Failed to record meals.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Hero Header Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 border-2 border-emerald-500/30 overflow-hidden shrink-0 flex items-center justify-center text-white text-3xl font-bold shadow-md">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{member.fullName.charAt(0)}</span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {member.fullName}
              </h1>
              {member.isPrimaryAdmin ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <Crown className="w-3 h-3 text-amber-500" /> Primary Admin
                </span>
              ) : member.isManager ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Manager
                </span>
              ) : member.isAdmin ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  <Shield className="w-3 h-3 text-indigo-600" /> Admin
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  <User className="w-3 h-3 text-slate-500" /> Mess Member
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {member.bio || 'Member of MessMate bachelor mess community.'}
            </p>

            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 pt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                {member.phone}
              </span>
              {member.roomNumber && (
                <span className="flex items-center gap-1">
                  <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                  Room: {member.roomNumber}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Joined: {formatDate(member.joinedAt)}
              </span>
            </div>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t.profile?.editProfile || 'Edit Profile'}</span>
          </button>
        )}
      </div>

      {/* Quick Daily Meal Entry Box (Available for active members) */}
      {member.isActive && (
        <div className="p-5 rounded-2xl bg-linear-to-r from-emerald-900/10 via-teal-900/5 to-slate-900/10 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900/40 border border-emerald-500/20 dark:border-emerald-500/30 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t.mealEntry?.title || 'Submit Daily Meals'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {t.mealEntry?.subtitle || 'Enter your daily breakfast, lunch, and dinner quantity'}
              </p>
            </div>

            <form onSubmit={handleMealSubmit} className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-emerald-500 font-medium"
              />

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 font-medium">{t.mealEntry?.breakfast || 'BF'}:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={entryBf}
                  onChange={(e) => setEntryBf(parseFloat(e.target.value) || 0)}
                  className="w-12 text-center font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 font-medium">{t.mealEntry?.lunch || 'LN'}:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={entryLn}
                  onChange={(e) => setEntryLn(parseFloat(e.target.value) || 0)}
                  className="w-12 text-center font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 font-medium">{t.mealEntry?.dinner || 'DN'}:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={entryDn}
                  onChange={(e) => setEntryDn(parseFloat(e.target.value) || 0)}
                  className="w-12 text-center font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? 'Saving...' : t.mealEntry?.submitMeals || 'Save Meal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Personal Accounting Summary Cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            {t.profile?.accountingSummary || 'Personal Accounting Summary'}
          </span>
          <span className="text-xs font-normal text-slate-500">
            {t.dashboard?.currentMealRate}: <strong className="text-emerald-600 font-semibold">৳{accounting.currentMealRate.toFixed(2)}</strong>
          </span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Meals */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
              {t.profile?.totalMeals || 'Total Meals'}
            </span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {accounting.totalMeals}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              B:{accounting.breakfast} | L:{accounting.lunch} | D:{accounting.dinner}
            </p>
          </div>

          {/* Card 2: Meal Cost */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
              Meal Cost
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(accounting.mealCost)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              @ ৳{accounting.currentMealRate.toFixed(2)} / meal
            </p>
          </div>

          {/* Card 3: Bazar Payments */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
              {t.profile?.bazarContribution || 'Bazar Paid'}
            </span>
            <p className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
              {formatCurrency(accounting.bazarContribution)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Personal payments
            </p>
          </div>

          {/* Card 4: Total Deposits */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
              {t.profile?.deposits || 'Total Deposits'}
            </span>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {formatCurrency(accounting.deposits)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Paid to mess fund
            </p>
          </div>

          {/* Card 5: Allocated Shared & Fixed */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
              {t.profile?.allocatedCosts || 'Utilities / Rent'}
            </span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {formatCurrency(accounting.sharedExpenseCost + accounting.individualExpenseCost)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Fixed & extra costs
            </p>
          </div>

          {/* Card 6: Due / Advance Balance */}
          <div
            className={`p-4 rounded-xl border shadow-2xs ${
              accounting.dueAmount > 0
                ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                : accounting.advanceAmount > 0
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300'
            }`}
          >
            <span className="text-[11px] font-semibold block truncate">
              {accounting.dueAmount > 0 ? 'Total Due (বাকি)' : accounting.advanceAmount > 0 ? 'Total Advance (পাওনা)' : 'Balanced'}
            </span>
            <p className="text-xl font-bold mt-1">
              {accounting.dueAmount > 0
                ? formatCurrency(accounting.dueAmount)
                : accounting.advanceAmount > 0
                ? formatCurrency(accounting.advanceAmount)
                : '৳0.00'}
            </p>
            <p className="text-[10px] mt-0.5 opacity-80">
              {accounting.dueAmount > 0 ? 'Payment pending' : accounting.advanceAmount > 0 ? 'Credit balance' : 'Zero balance'}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Tabs for Historical Records */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('meals')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'meals'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.profile?.dailyMealHistory || 'Daily Meals'} ({meals.length})
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'deposits'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.profile?.depositHistory || 'Deposits'} ({recentDeposits.length})
          </button>
          <button
            onClick={() => setActiveTab('bazar')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'bazar'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.profile?.bazarHistory || 'Bazar Purchases'} ({recentBazar.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.profile?.expenseHistory || 'Assigned Expenses'} ({recentExpenses.length})
          </button>
        </div>

        <div className="p-4">
          {/* TAB 1: MEALS */}
          {activeTab === 'meals' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Breakfast</th>
                    <th className="py-2.5 px-3 text-center">Lunch</th>
                    <th className="py-2.5 px-3 text-center">Dinner</th>
                    <th className="py-2.5 px-3 text-right">Total Meals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {meals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No meal records found for this month.
                      </td>
                    </tr>
                  ) : (
                    meals.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {formatDate(m.date)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">{m.breakfast}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">{m.lunch}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">{m.dinner}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {m.totalMeals}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: DEPOSITS */}
          {activeTab === 'deposits' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentDeposits.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        No deposits recorded for this member.
                      </td>
                    </tr>
                  ) : (
                    recentDeposits.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {formatDate(d.date)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{d.method}</td>
                        <td className="py-2.5 px-3 text-slate-500">{d.notes || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(d.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: BAZAR */}
          {activeTab === 'bazar' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Items / Title</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentBazar.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400">
                        No bazar purchases paid by this member.
                      </td>
                    </tr>
                  ) : (
                    recentBazar.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {formatDate(b.date)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{b.title}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-sky-600 dark:text-sky-400">
                          {formatCurrency(b.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        No individual expenses assigned to this member.
                      </td>
                    </tr>
                  ) : (
                    recentExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {formatDate(e.date)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{e.category}</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{e.title}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(e.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              {t.profile?.editProfile || 'Edit Profile'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Update personal details and profile picture URL.
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.profile?.name || 'Full Name'} *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.profile?.phone || 'Phone Number'} *
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Profile Picture URL
                </label>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.profile?.bio || 'Bio / About Me'}
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell something about yourself..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
