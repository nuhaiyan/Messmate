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
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { formatCurrency, formatDate } from '@/lib/utils';
import { updateMemberProfileAction, submitIndividualMealAction } from '@/app/actions/profile';
import { updateMemberMealEntryAction } from '@/app/actions/meals';
import { changeAdminPasswordAction } from '@/app/actions/auth';

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
  initialOpeningBalance?: number;
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
  totalFine?: number;
  balanceStatus: string;
}

export interface BazarScheduleRecord {
  id: string;
  startDate: string;
  endDate: string;
  formattedRange: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  notes?: string | null;
}

export interface FineRecord {
  id: string;
  amount: number;
  reason: string;
  fineDate: string;
  isPaid: boolean;
  paidAt?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
}

export interface MealRecord {
  id: string;
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  totalMeals: number;
}

export interface DepositRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  notes?: string | null;
}

export interface BazarRecord {
  id: string;
  date: string;
  title: string;
  amount: number;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  title: string;
  amount: number;
  category: string;
}

interface MemberProfileClientProps {
  member: MemberData;
  accounting: PersonalAccounting;
  bazarSchedules?: {
    all: BazarScheduleRecord[];
    upcoming: BazarScheduleRecord[];
    current: BazarScheduleRecord[];
    completed: BazarScheduleRecord[];
  };
  fines?: {
    totalFineAmount: number;
    paidFineAmount: number;
    unpaidFineAmount: number;
    list: FineRecord[];
  };
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
  bazarSchedules,
  fines,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'meals' | 'deposits' | 'bazar' | 'expenses' | 'fines'>('overview');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(initialMember.fullName);
  const [editPhone, setEditPhone] = useState(initialMember.phone);
  const [editBio, setEditBio] = useState(initialMember.bio);
  const [editAvatarUrl, setEditAvatarUrl] = useState(initialMember.avatarUrl || '');

  // Admin Password Change Modal State
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [showAdminNewPass, setShowAdminNewPass] = useState(false);
  const [adminPasswordMsg, setAdminPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangeAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordMsg(null);
    if (!adminNewPassword.trim() || adminNewPassword.trim().length < 4) {
      setAdminPasswordMsg({ type: 'error', text: 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' });
      return;
    }

    startTransition(async () => {
      const res = await changeAdminPasswordAction({
        currentPassword: adminCurrentPassword,
        newPassword: adminNewPassword.trim(),
      });
      if (res.success) {
        setAdminPasswordMsg({ type: 'success', text: res.message || 'অ্যাডমিন পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' });
        setAdminCurrentPassword('');
        setAdminNewPassword('');
        setTimeout(() => {
          setIsAdminPasswordModalOpen(false);
          setAdminPasswordMsg(null);
        }, 1500);
      } else {
        setAdminPasswordMsg({ type: 'error', text: res.error || 'Failed to update admin password.' });
      }
    });
  };

  // Meal Entry State
  const todayStr = new Date().toISOString().split('T')[0];
  const [entryDate, setEntryDate] = useState(todayStr);
  const [entryBf, setEntryBf] = useState(0);
  const [entryLn, setEntryLn] = useState(1);
  const [entryDn, setEntryDn] = useState(1);

  // Edit Specific Meal Record Modal State
  const [editingMeal, setEditingMeal] = useState<MealRecord | null>(null);
  const [editMealBf, setEditMealBf] = useState(0);
  const [editMealLn, setEditMealLn] = useState(0);
  const [editMealDn, setEditMealDn] = useState(0);
  const [editMealMsg, setEditMealMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveEditedMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeal) return;
    setEditMealMsg(null);

    const dateStr = new Date(editingMeal.date).toISOString().split('T')[0];

    startTransition(async () => {
      const res = await updateMemberMealEntryAction({
        memberId: member.id,
        date: dateStr,
        breakfast: Number(editMealBf) || 0,
        lunch: Number(editMealLn) || 0,
        dinner: Number(editMealDn) || 0,
      });

      if (res.success && res.entry) {
        setEditMealMsg({ type: 'success', text: 'মিল এন্ট্রি সফলভাবে আপডেট করা হয়েছে (Meal updated successfully)!' });
        setMeals((prev) =>
          prev.map((m) =>
            m.id === editingMeal.id
              ? {
                  ...m,
                  breakfast: res.entry!.breakfast,
                  lunch: res.entry!.lunch,
                  dinner: res.entry!.dinner,
                  totalMeals: res.entry!.totalMeals,
                }
              : m
          )
        );
        setTimeout(() => {
          setEditingMeal(null);
          setEditMealMsg(null);
        }, 1200);
      } else {
        setEditMealMsg({ type: 'error', text: res.error || 'Failed to update meal entry.' });
      }
    });
  };

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

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {member.isPrimaryAdmin && isOwnProfile && (
            <button
              onClick={() => {
                setIsAdminPasswordModalOpen(true);
                setAdminPasswordMsg(null);
                setAdminCurrentPassword('');
                setAdminNewPassword('');
              }}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Change Admin Password</span>
            </button>
          )}

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

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500/50">
                <span className="text-slate-700 dark:text-slate-200 font-bold">{t.mealEntry?.breakfast || 'BF'}:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="99"
                  value={entryBf}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEntryBf(parseFloat(e.target.value) || 0)}
                  className="w-12 text-center font-extrabold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-0.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500/50">
                <span className="text-slate-700 dark:text-slate-200 font-bold">{t.mealEntry?.lunch || 'LN'}:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="99"
                  value={entryLn}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEntryLn(parseFloat(e.target.value) || 0)}
                  className="w-12 text-center font-extrabold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-0.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500/50">
                <span className="text-slate-700 dark:text-slate-200 font-bold">{t.mealEntry?.dinner || 'DN'}:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="99"
                  value={entryDn}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEntryDn(parseFloat(e.target.value) || 0)}
                  className="w-12 text-center font-extrabold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-0.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
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
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('meals')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'meals'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.profile?.dailyMealHistory || 'Meal History'} ({meals.length})
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'deposits'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.profile?.depositHistory || 'Deposit History'} ({recentDeposits.length})
          </button>
          <button
            onClick={() => setActiveTab('bazar')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'bazar'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.profile?.bazarHistory || 'Bazar History'} ({recentBazar.length + (bazarSchedules?.all.length || 0)})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.profile?.expenseHistory || 'Expense History'} ({recentExpenses.length})
          </button>
          <button
            onClick={() => setActiveTab('fines')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'fines'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Fine History ({fines?.list.length || 0})
          </button>
        </div>

        <div className="p-4">
          {/* TAB 0: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Personal Details & Financial Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Information */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Full Name:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{member.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Phone Number:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{member.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Room Number:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{member.roomNumber || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Account Status:</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        member.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {member.isActive ? 'Active Member' : 'Deactivated'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Joining Date:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(member.joinedAt)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Role:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {member.isPrimaryAdmin ? 'Primary Admin' : member.isManager ? 'Manager' : member.isAdmin ? 'Admin' : 'General Member'}
                      </span>
                    </div>
                  </div>
                  {member.bio && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 text-xs">
                      <span className="text-slate-400 block mb-0.5">Bio:</span>
                      <p className="text-slate-700 dark:text-slate-300 italic">{member.bio}</p>
                    </div>
                  )}
                </div>

                {/* Bazar Date Range Schedule Summary */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-orange-500" />
                      Assigned Bazar Date Ranges
                    </h4>
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                      {bazarSchedules?.all.length || 0} scheduled
                    </span>
                  </div>

                  {bazarSchedules?.current && bazarSchedules.current.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/50">
                      <span className="text-[11px] font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider block">
                        Ongoing Today (চলমান বাজার):
                      </span>
                      {bazarSchedules.current.map((s) => (
                        <div key={s.id} className="text-xs font-bold text-orange-950 dark:text-orange-200 mt-0.5">
                          {s.formattedRange} {s.notes && <span className="font-normal text-[11px]">({s.notes})</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Upcoming Bazar Dates:
                    </span>
                    {bazarSchedules?.upcoming && bazarSchedules.upcoming.length > 0 ? (
                      <div className="space-y-1">
                        {bazarSchedules.upcoming.map((s) => (
                          <div key={s.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{s.formattedRange}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                              Upcoming
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No upcoming bazar dates assigned.</p>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Completed Bazar History:
                    </span>
                    {bazarSchedules?.completed && bazarSchedules.completed.length > 0 ? (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {bazarSchedules.completed.map((s) => (
                          <div key={s.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                            <span className="text-slate-600 dark:text-slate-400">{s.formattedRange}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                              Completed
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No previous bazar dates.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Comprehensive Financial Snapshot
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Initial Opening Balance</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                      {formatCurrency(member.initialOpeningBalance || 0)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Total Member Deposits</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                      {formatCurrency(accounting.deposits)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Total Meals &amp; Meal Cost</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                      {accounting.totalMeals} meals ({formatCurrency(accounting.mealCost)})
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Total Additional Expenses</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                      {formatCurrency(accounting.sharedExpenseCost + accounting.individualExpenseCost)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Total Fine Charged</span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1 block">
                      {formatCurrency(fines?.totalFineAmount || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Paid: {formatCurrency(fines?.paidFineAmount || 0)} | Due: {formatCurrency(fines?.unpaidFineAmount || 0)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Bazar Personal Payments</span>
                    <span className="text-sm font-bold text-sky-600 dark:text-sky-400 mt-1 block">
                      {formatCurrency(accounting.bazarContribution)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 col-span-2">
                    <span className="text-slate-400 text-[11px] block">Current Due or Advance Settlement</span>
                    <span className={`text-base font-extrabold mt-1 block ${
                      accounting.dueAmount > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : accounting.advanceAmount > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {accounting.dueAmount > 0
                        ? `Net Due: ৳${accounting.dueAmount.toFixed(2)} (বাকি)`
                        : accounting.advanceAmount > 0
                        ? `Net Advance: ৳${accounting.advanceAmount.toFixed(2)} (পাওনা)`
                        : 'Settled (৳0.00)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                    {(isOwnProfile || canEdit) && <th className="py-2.5 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {meals.length === 0 ? (
                    <tr>
                      <td colSpan={isOwnProfile || canEdit ? 6 : 5} className="py-6 text-center text-slate-400">
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
                        {(isOwnProfile || canEdit) && (
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMeal(m);
                                setEditMealBf(m.breakfast);
                                setEditMealLn(m.lunch);
                                setEditMealDn(m.dinner);
                                setEditMealMsg(null);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                          </td>
                        )}
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
            <div className="space-y-6">
              {/* 1. Assigned Date-Range Bazar Schedule */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  Assigned Bazar Date Ranges ({bazarSchedules?.all.length || 0})
                </h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Date Range</th>
                        <th className="py-2.5 px-3">Schedule Status</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {!bazarSchedules || bazarSchedules.all.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-400">
                            No bazar date ranges assigned to this member.
                          </td>
                        </tr>
                      ) : (
                        bazarSchedules.all.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                              {s.formattedRange}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.status === 'ONGOING'
                                  ? 'bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700 animate-pulse'
                                  : s.status === 'UPCOMING'
                                  ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}>
                                {s.status === 'ONGOING' ? 'Ongoing Today (চলমান)' : s.status === 'UPCOMING' ? 'Upcoming' : 'Completed'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{s.notes || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Actual Bazar Expense Purchases */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-emerald-500" />
                  Actual Bazar Purchases Paid by Member ({recentBazar.length})
                </h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
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
              </div>
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

          {/* TAB 5: FINES */}
          {activeTab === 'fines' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Fine</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                    {formatCurrency(fines?.totalFineAmount || 0)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block">Total Fine Paid</span>
                  <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200 mt-0.5 block">
                    {formatCurrency(fines?.paidFineAmount || 0)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/50">
                  <span className="text-[11px] text-rose-700 dark:text-rose-300 block">Outstanding Fine (Due)</span>
                  <span className="text-sm font-bold text-rose-800 dark:text-rose-200 mt-0.5 block">
                    {formatCurrency(fines?.unpaidFineAmount || 0)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Payment Method</th>
                      <th className="py-2.5 px-3">Notes</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {!fines || fines.list.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No fine records recorded for this member.
                        </td>
                      </tr>
                    ) : (
                      fines.list.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {formatDate(f.fineDate)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                            {f.reason}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              f.isPaid
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}>
                              {f.isPaid ? 'PAID' : 'UNPAID'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{f.isPaid ? (f.paymentMethod || 'CASH') : '—'}</td>
                          <td className="py-2.5 px-3 text-slate-500">{f.notes || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(f.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
              {/* Name & Phone: Editable only by Admin/Manager */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.profile?.name || 'Full Name'} *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!member.isPrimaryAdmin && !member.isAdmin && !member.isManager}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {!member.isPrimaryAdmin && !member.isAdmin && !member.isManager && (
                  <p className="text-[10px] text-slate-400 mt-0.5">General members can only update their Profile Picture.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.profile?.phone || 'Phone Number'} *
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={!member.isPrimaryAdmin && !member.isAdmin && !member.isManager}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
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

      {/* Change Admin Password Modal (Strictly for Primary Admin) */}
      {isAdminPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    অ্যাডমিন পাসওয়ার্ড পরিবর্তন (Change Admin Password)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Authorized for Mohammad Tarek Hossen
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminPasswordModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangeAdminPassword} className="p-5 space-y-4">
              {adminPasswordMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                    adminPasswordMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {adminPasswordMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{adminPasswordMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  বর্তমান অ্যাডমিন পাসওয়ার্ড (Current Admin Password)
                </label>
                <input
                  type="password"
                  value={adminCurrentPassword}
                  onChange={(e) => setAdminCurrentPassword(e.target.value)}
                  placeholder="Enter current password (default: 1514888683)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  নতুন অ্যাডমিন পাসওয়ার্ড (New Admin Password)
                </label>
                <div className="relative">
                  <input
                    type={showAdminNewPass ? 'text' : 'password'}
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    placeholder="Enter new password (min 4 characters)"
                    required
                    className="w-full px-3 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminNewPass(!showAdminNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showAdminNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  এই পাসওয়ার্ডটি শুধুমাত্র অ্যাডমিন প্যানেলে লগইন করার কাজে ব্যবহৃত হবে।
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdminPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || adminNewPassword.trim().length < 4}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Individual Meal Entry Modal */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    মিল এন্ট্রি পরিবর্তন (Edit Meal Entry)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {formatDate(editingMeal.date)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMeal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedMeal} className="p-5 space-y-4">
              {editMealMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                    editMealMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {editMealMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{editMealMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Breakfast
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="99"
                    value={editMealBf}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditMealBf(parseFloat(e.target.value) || 0)}
                    className="w-full text-center px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Lunch
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="99"
                    value={editMealLn}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditMealLn(parseFloat(e.target.value) || 0)}
                    className="w-full text-center px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dinner
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="99"
                    value={editMealDn}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setEditMealDn(parseFloat(e.target.value) || 0)}
                    className="w-full text-center px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Total Meals:</span>
                <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                  {(Number(editMealBf) || 0) + (Number(editMealLn) || 0) + (Number(editMealDn) || 0)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMeal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
