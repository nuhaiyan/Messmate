'use client';

import React, { useState, useTransition, useRef } from 'react';
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
  TrendingDown,
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
  Camera,
  UploadCloud,
  Coins,
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
  todayMeals?: number;
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
  unpaidFine?: number;
  balanceStatus: string;
  totalJoma?: number;
  initialBalance?: number;
  bazarDateRange?: string;
  bazarStatus?: string | null;
  monthlyBalance?: number;
  overallBalance?: number;
  previousBalance?: number;
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
  includeBreakfast?: boolean;
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
  includeBreakfast = false,
  currentMonth,
  currentYear,
}: MemberProfileClientProps) {
  const { t } = useI18n();
  const [member, setMember] = useState(initialMember);
  const [meals, setMeals] = useState(initialMeals);
  const [activeTab, setActiveTab] = useState<'meals' | 'deposits' | 'bazar' | 'expenses' | 'fines'>('meals');

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

  // Direct Device Avatar Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isAvatarUploadModalOpen, setIsAvatarUploadModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploadError(null);

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setAvatarUploadError('ফাইল সাইজ সর্বোচ্চ ৫ মেগাবাইট হতে পারবে (Max file size is 5MB). Please choose a smaller file.');
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null);
      setIsAvatarUploadModalOpen(true);
      return;
    }

    // Validate type
    const validMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validMimes.includes(file.type)) {
      setAvatarUploadError('অননুমোদিত ফরম্যাট। শুধুমাত্র PNG, JPG, WEBP অথবা SVG ছবি নির্বাচন করুন (Valid formats: PNG, JPG, WEBP, SVG).');
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null);
      setIsAvatarUploadModalOpen(true);
      return;
    }

    setSelectedAvatarFile(file);
    const objUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(objUrl);
    setIsAvatarUploadModalOpen(true);
  };

  const handleUploadAndSaveAvatar = async () => {
    if (!selectedAvatarFile) return;
    setIsUploadingAvatar(true);
    setAvatarUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedAvatarFile);
      formData.append('type', 'avatar');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'ছবির আপলোড ব্যর্থ হয়েছে (Failed to upload image).');
      }

      const saveRes = await updateMemberProfileAction({
        memberId: member.id,
        fullName: member.fullName,
        phone: member.phone,
        bio: member.bio,
        avatarUrl: uploadData.url,
      });

      if (!saveRes.success) {
        throw new Error(saveRes.error || 'প্রোফাইলে ছবি সেভ করা সম্ভব হয়নি (Failed to save avatar).');
      }

      setMember((prev) => ({ ...prev, avatarUrl: uploadData.url }));
      setEditAvatarUrl(uploadData.url);
      setIsAvatarUploadModalOpen(false);
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null);
      setSuccessMsg('প্রোফাইল পিকচার সফলভাবে আপডেট করা হয়েছে (Profile picture updated successfully)!');
    } catch (err: any) {
      setAvatarUploadError(err.message || 'Avatar upload failed.');
    } finally {
      setIsUploadingAvatar(false);
    }
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
          <div className="relative group shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 border-2 border-emerald-500/30 overflow-hidden flex items-center justify-center text-white text-3xl font-bold shadow-md">
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

            {/* Direct Avatar Upload Trigger Button */}
            {(isOwnProfile || canEdit) && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="ডিভাইস থেকে প্রোফাইল পিকচার আপলোড করুন (Upload photo from device)"
                  className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/90 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 transition-all cursor-pointer group-hover:scale-105"
                >
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </>
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

            {member.bio?.trim() && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {member.bio.trim()}
              </p>
            )}

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
                {includeBreakfast
                  ? (t.mealEntry?.subtitle || 'Enter your daily breakfast, lunch, and dinner quantity')
                  : 'Enter your daily lunch and dinner quantity'}
              </p>
            </div>

            <form onSubmit={handleMealSubmit} className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-emerald-500 font-medium"
              />

              {includeBreakfast && (
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
              )}

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

      {/* 9 Financial & Activity Overview Cards */}
      {(() => {
        const totalJomaValue =
          accounting.totalJoma !== undefined
            ? accounting.totalJoma
            : (accounting.initialBalance ?? member.initialOpeningBalance ?? 0) +
              accounting.deposits +
              accounting.bazarContribution;

        const initialBalanceValue =
          accounting.initialBalance !== undefined
            ? accounting.initialBalance
            : member.initialOpeningBalance ?? 0;

        const todayMealsCount = accounting.todayMeals ?? 0;
        const totalCostValue = accounting.totalCost;

        const activeSchedule =
          bazarSchedules?.current[0] ||
          bazarSchedules?.upcoming[0] ||
          null;

        const bazarRangeText =
          accounting.bazarDateRange && accounting.bazarDateRange !== 'No assigned schedule'
            ? accounting.bazarDateRange
            : activeSchedule
            ? activeSchedule.formattedRange
            : 'No assigned schedule';

        const bazarStatus =
          accounting.bazarStatus ||
          (bazarSchedules?.current?.length ? 'ONGOING' : bazarSchedules?.upcoming?.length ? 'UPCOMING' : null);

        const totalFineValue = accounting.totalFine ?? fines?.totalFineAmount ?? 0;
        const unpaidFineValue = accounting.unpaidFine ?? fines?.unpaidFineAmount ?? 0;

        const monthlyBalanceValue =
          accounting.monthlyBalance !== undefined
            ? accounting.monthlyBalance
            : (accounting.deposits + accounting.bazarContribution) - totalCostValue;

        const overallBalanceValue =
          accounting.overallBalance !== undefined
            ? accounting.overallBalance
            : accounting.netBalance;

        return (
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>আর্থিক ও মিল সারসংক্ষেপ</span>
              </h2>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                বর্তমান মিল রেট: <strong className="text-emerald-600 font-bold">৳{accounting.currentMealRate.toFixed(2)}</strong> / মিল
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Card 1: Total Joma (মোট জমা) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-emerald-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    মোট জমা (Total Deposit)
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                  {formatCurrency(totalJomaValue)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate" title={`Initial (৳${initialBalanceValue}) + Deposits (৳${accounting.deposits}) + Own Bazar (৳${accounting.bazarContribution})`}>
                  Initial: ৳{initialBalanceValue} | Dep: ৳{accounting.deposits} | Bazar: ৳{accounting.bazarContribution}
                </p>
              </div>

              {/* Card 2: Initial Balance (প্রারম্ভিক ব্যালেন্স) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-sky-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    প্রারম্ভিক ব্যালেন্স (Opening Balance)
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">
                  {formatCurrency(initialBalanceValue)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  পূর্ববর্তী স্থিতি
                </p>
              </div>

              {/* Card 3: Total Meals (মোট মিল) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-amber-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    মোট মিল (Total Meals)
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                    <Utensils className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                  {accounting.totalMeals} <span className="text-sm font-semibold text-slate-500">টি</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {includeBreakfast
                    ? `সকাল: ${accounting.breakfast} | দুপুর: ${accounting.lunch} | রাত: ${accounting.dinner}`
                    : `দুপুর: ${accounting.lunch} | রাত: ${accounting.dinner}`}
                </p>
              </div>

              {/* Card 4: Today's Meals (আজকের মিল) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-teal-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    আজকের মিল (Today&apos;s Meals)
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-2">
                  {todayMealsCount} <span className="text-sm font-semibold text-slate-500">টি</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  আজকের সক্রিয় মিল
                </p>
              </div>

              {/* Card 5: Total Cost (মোট খরচ) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-rose-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    মোট খরচ (Total Cost)
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                    <Receipt className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                  {formatCurrency(totalCostValue)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  মিল: ৳{accounting.mealCost.toFixed(0)} | অতিরিক্ত: ৳{(accounting.sharedExpenseCost + accounting.individualExpenseCost).toFixed(0)}
                </p>
              </div>

              {/* Card 6: Bazar Date Range (বাজারের তারিখ) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-orange-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    বাজার শিডিউল (Bazar Schedule)
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400 mt-2 truncate" title={bazarRangeText}>
                  {bazarRangeText}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                    bazarStatus === 'ONGOING'
                      ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 animate-pulse'
                      : bazarStatus === 'UPCOMING'
                      ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {bazarStatus === 'ONGOING' ? 'চলমান বাজার' : bazarStatus === 'UPCOMING' ? 'আসন্ন শিডিউল' : 'তালিকাভুক্ত নয়'}
                  </span>
                  <span className="text-[11px] text-slate-500">মোট শিডিউল: {bazarSchedules?.all.length || 0}</span>
                </div>
              </div>

              {/* Card 7: Total Fine (মোট জরিমানা) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-purple-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    মোট জরিমানা (Fine Status)
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
                  {formatCurrency(totalFineValue)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  পরিশোধিত: ৳{(totalFineValue - unpaidFineValue)} | বকেয়া: ৳{unpaidFineValue}
                </p>
              </div>

              {/* Card 8: Monthly Balance (চলতি মাসের ব্যালেন্স) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-indigo-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    চলতি মাস (Monthly Balance)
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className={`text-2xl font-black mt-2 ${monthlyBalanceValue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {monthlyBalanceValue >= 0 ? '+' : ''}{formatCurrency(monthlyBalanceValue)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  জমা ও খরচের পার্থক্য ({monthlyBalanceValue >= 0 ? 'উদ্বৃত্ত/Surplus' : 'ঘাটতি/Deficit'})
                </p>
              </div>

              {/* Card 9: Overall Balance (সর্বমোট স্থিতি) */}
              <div className={`p-4 rounded-xl border shadow-2xs transition-colors ${
                overallBalanceValue >= 0
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500'
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 hover:border-rose-500'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    সর্বমোট স্থিতি (Net Balance)
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    overallBalanceValue >= 0
                      ? 'bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-200/70 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                  }`}>
                    {overallBalanceValue >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  </div>
                </div>
                <p className={`text-2xl font-black mt-2 ${overallBalanceValue >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                  {overallBalanceValue >= 0 ? '+' : ''}{formatCurrency(overallBalanceValue)}
                </p>
                <p className="text-[11px] font-semibold mt-1 text-slate-700 dark:text-slate-300">
                  {overallBalanceValue >= 0
                    ? 'Advance (পাওনা - মেসের নিকট সদস্যের পাওনা)'
                    : 'Due (বাকি - সদস্য কর্তৃক মেসকে প্রদেয়)'}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Interactive Tabs for Historical Records */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-3 gap-2 overflow-x-auto">
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
          {/* TAB 1: MEALS */}
          {activeTab === 'meals' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    {includeBreakfast && <th className="py-2.5 px-3 text-center">Breakfast</th>}
                    <th className="py-2.5 px-3 text-center">Lunch</th>
                    <th className="py-2.5 px-3 text-center">Dinner</th>
                    <th className="py-2.5 px-3 text-right">Total Meals</th>
                    {(isOwnProfile || canEdit) && <th className="py-2.5 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {meals.length === 0 ? (
                    <tr>
                      <td colSpan={isOwnProfile || canEdit ? (includeBreakfast ? 6 : 5) : (includeBreakfast ? 5 : 4)} className="py-6 text-center text-slate-400">
                        No meal records found for this month.
                      </td>
                    </tr>
                  ) : (
                    meals.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {formatDate(m.date)}
                        </td>
                        {includeBreakfast && (
                          <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">{m.breakfast}</td>
                        )}
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
                  প্রোফাইল পিকচার (Profile Picture)
                </label>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    ডিভাইস থেকে আপলোড (Max 5MB)
                  </button>
                  <span className="text-[11px] text-slate-400">অথবা ছবির URL দিন:</span>
                </div>
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

              <div className={`grid gap-3 ${includeBreakfast ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {includeBreakfast && (
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
                )}

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

      {/* Direct Device Avatar Upload Confirmation Modal */}
      {isAvatarUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    প্রোফাইল ছবি প্রিভিউ (Avatar Preview)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ডিভাইস থেকে সরাসরি আপলোড (Max 5MB)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAvatarUploadModalOpen(false);
                  setSelectedAvatarFile(null);
                  setAvatarPreviewUrl(null);
                  setAvatarUploadError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {avatarUploadError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{avatarUploadError}</span>
                </div>
              )}

              {avatarPreviewUrl ? (
                <div className="flex flex-col items-center justify-center gap-3 py-2">
                  <div className="w-28 h-28 rounded-full border-4 border-emerald-500/40 overflow-hidden shadow-lg bg-slate-100 dark:bg-slate-800">
                    <img
                      src={avatarPreviewUrl}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate max-w-xs">
                      {selectedAvatarFile?.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      ফাইলের সাইজ: {selectedAvatarFile ? (selectedAvatarFile.size / 1024).toFixed(1) : 0} KB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  কোন ছবি নির্বাচন করা হয়নি
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  অন্য ছবি
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAvatarUploadModalOpen(false);
                      setSelectedAvatarFile(null);
                      setAvatarPreviewUrl(null);
                      setAvatarUploadError(null);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="button"
                    disabled={isUploadingAvatar || !selectedAvatarFile || !!avatarUploadError}
                    onClick={handleUploadAndSaveAvatar}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>আপলোড হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>সেভ করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
