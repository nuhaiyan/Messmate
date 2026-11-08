'use client';

import React, { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  Trash2,
  Check,
  Loader2,
  AlertTriangle,
  PlusCircle,
  Edit,
  ShieldAlert,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { formatCurrency, formatDate } from '@/lib/utils';
import { updateMemberProfileAction, submitIndividualMealAction } from '@/app/actions/profile';
import { updateMemberMealEntryAction } from '@/app/actions/meals';
import { changeAdminPasswordAction } from '@/app/actions/auth';
import { updateMemberOpeningBalanceAction } from '@/app/actions/members';
import { addDepositAction, updateDepositAction, deleteDepositAction } from '@/app/actions/deposits';
import { addBazarExpenseAction, approveBazarExpenseAction, rejectBazarExpenseAction } from '@/app/actions/bazar';
import { createBazarScheduleAction } from '@/app/actions/bazar-schedule';
import { addFineAction, markFineAsPaidAction, deleteFineAction } from '@/app/actions/fine-fund';
import { addAdditionalExpenseAction } from '@/app/actions/additional-expenses';

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
  transactionId?: string | null;
}

export interface PendingBazarApproval {
  id: string;
  date: string;
  title: string;
  amount: number;
  category: string;
  paymentSource: string;
  description?: string | null;
  isApproved: boolean;
  payerMemberId?: string | null;
  payerMemberName?: string;
  payerMemberAvatar?: string | null;
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
  isViewerManagement?: boolean;
  pendingBazarApprovals?: PendingBazarApproval[];
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
  isViewerManagement,
  pendingBazarApprovals = [],
  includeBreakfast = false,
  currentMonth,
  currentYear,
}: MemberProfileClientProps) {
  const { t } = useI18n();
  const router = useRouter();

  const isManagerOrAdmin = isViewerManagement !== undefined
    ? isViewerManagement
    : (canEdit && !isOwnProfile);

  const [member, setMember] = useState(initialMember);
  const [meals, setMeals] = useState(initialMeals);
  const [activeTab, setActiveTab] = useState<'meals' | 'deposits' | 'bazar' | 'expenses' | 'fines'>('meals');

  // Dynamic lists and balances
  const [depositsList, setDepositsList] = useState<DepositRecord[]>(recentDeposits);
  const [pendingBazarList, setPendingBazarList] = useState<PendingBazarApproval[]>(pendingBazarApprovals);
  const [finesList, setFinesList] = useState<FineRecord[]>(fines?.list || []);
  const [initialBalanceValue, setInitialBalanceValue] = useState<number>(
    member.initialOpeningBalance !== undefined ? member.initialOpeningBalance : (accounting.initialBalance || 0)
  );

  // Card 1: Deposit Management State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositModalTab, setDepositModalTab] = useState<'add' | 'list'>('add');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositTx, setDepositTx] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [editingDeposit, setEditingDeposit] = useState<DepositRecord | null>(null);
  const [isDepositSubmitting, setIsDepositSubmitting] = useState(false);
  const [depositMsg, setDepositMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Card 2: Opening Balance State
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState('');
  const [isOpeningSubmitting, setIsOpeningSubmitting] = useState(false);
  const [openingMsg, setOpeningMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Card 4: Quick Today Meal State
  const [isTodayMealModalOpen, setIsTodayMealModalOpen] = useState(false);
  const [todayBf, setTodayBf] = useState(accounting.breakfast || 0);
  const [todayLunch, setTodayLunch] = useState(accounting.lunch || 0);
  const [todayDinner, setTodayDinner] = useState(accounting.dinner || 0);
  const [todayMealsCount, setTodayMealsCount] = useState(accounting.todayMeals || 0);
  const [isTodayMealSubmitting, setIsTodayMealSubmitting] = useState(false);
  const [todayMealMsg, setTodayMealMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Card 5: Individual Expense State
  const [isIndividualExpenseModalOpen, setIsIndividualExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('WiFi');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);
  const [expenseMsg, setExpenseMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Card 6: Bazar Schedule State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleStart, setScheduleStart] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleEnd, setScheduleEnd] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isScheduleSubmitting, setIsScheduleSubmitting] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Card 7: Fine Management State
  const [isFineModalOpen, setIsFineModalOpen] = useState(false);
  const [fineAmount, setFineAmount] = useState('');
  const [fineReason, setFineReason] = useState('মিল এন্ট্রি পরিবর্তন বিলম্ব');
  const [fineDate, setFineDate] = useState(new Date().toISOString().split('T')[0]);
  const [fineNotes, setFineNotes] = useState('');
  const [isFineSubmitting, setIsFineSubmitting] = useState(false);
  const [fineMsg, setFineMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Card 8: Monthly Breakdown Modal State
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  // Card 9: Ledger / Settlement Modal State
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Member Bazar Expense Submission Modal State
  const [isSubmitBazarExpenseModalOpen, setIsSubmitBazarExpenseModalOpen] = useState(false);
  const [bazarExpenseTitle, setBazarExpenseTitle] = useState('');
  const [bazarExpenseAmount, setBazarExpenseAmount] = useState('');
  const [bazarExpenseCategory, setBazarExpenseCategory] = useState('কাঁচাবাজার');
  const [bazarExpenseDate, setBazarExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [bazarExpenseSource, setBazarExpenseSource] = useState<'PERSONAL' | 'MESS_FUND'>('PERSONAL');
  const [bazarExpenseDesc, setBazarExpenseDesc] = useState('');
  const [isBazarExpenseSubmitting, setIsBazarExpenseSubmitting] = useState(false);
  const [bazarExpenseMsg, setBazarExpenseMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      let finalAvatarUrl: string;

      try {
        const formData = new FormData();
        formData.append('file', selectedAvatarFile);
        formData.append('type', 'avatar');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.success && uploadData.url) {
          finalAvatarUrl = uploadData.url;
        } else {
          throw new Error(uploadData?.error || 'Server upload failed');
        }
      } catch (uploadApiErr) {
        console.warn('API upload fallback to direct Base64 encoding:', uploadApiErr);
        finalAvatarUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('ছবি রিড করতে ব্যর্থ হয়েছে।'));
          reader.readAsDataURL(selectedAvatarFile);
        });
      }

      const saveRes = await updateMemberProfileAction({
        memberId: member.id,
        fullName: member.fullName,
        phone: member.phone,
        bio: member.bio,
        avatarUrl: finalAvatarUrl,
      });

      if (!saveRes.success) {
        throw new Error(saveRes.error || 'প্রোফাইলে ছবি সেভ করা সম্ভব হয়নি (Failed to save avatar).');
      }

      setMember((prev) => ({ ...prev, avatarUrl: finalAvatarUrl }));
      setEditAvatarUrl(finalAvatarUrl);
      setIsAvatarUploadModalOpen(false);
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null);
      setSuccessMsg('প্রোফাইল পিকচার সফলভাবে আপডেট করা হয়েছে (Profile picture updated successfully)!');
      router.refresh();
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

  // --- Handlers for 9 Overview Functions & Member Bazar Approvals ---

  // 1. Opening Balance
  const handleSaveOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpeningSubmitting(true);
    setOpeningMsg(null);
    try {
      const val = parseFloat(openingBalanceInput);
      if (isNaN(val)) throw new Error('সঠিক প্রারম্ভিক ব্যালেন্স লিখুন।');
      const res = await updateMemberOpeningBalanceAction(member.id, val);
      if (!res.success) throw new Error(res.error || 'ব্যালেন্স আপডেট করতে ব্যর্থ।');
      setInitialBalanceValue(val);
      setOpeningMsg({ type: 'success', text: 'প্রারম্ভিক ব্যালেন্স সফলভাবে আপডেট করা হয়েছে।' });
      setTimeout(() => {
        setIsOpeningBalanceModalOpen(false);
        setOpeningMsg(null);
        router.refresh();
      }, 800);
    } catch (err: any) {
      setOpeningMsg({ type: 'error', text: err.message || 'ব্যালেন্স পরিবর্তন করতে ব্যর্থ।' });
    } finally {
      setIsOpeningSubmitting(false);
    }
  };

  // 2. Deposit Save / Edit / Delete
  const handleSaveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDepositSubmitting(true);
    setDepositMsg(null);
    try {
      const amt = parseFloat(depositAmount);
      if (isNaN(amt) || amt <= 0) throw new Error('সঠিক জমার পরিমাণ লিখুন (টাকা ০ এর বেশি হতে হবে)।');
      if (!depositDate) throw new Error('জমার তারিখ প্রদান করুন।');

      if (editingDeposit) {
        const res = await updateDepositAction(editingDeposit.id, {
          depositDate,
          amount: amt,
          paymentMethod: depositMethod,
          transactionId: depositTx || undefined,
          notes: depositNotes || undefined,
        });
        if (!res.success) throw new Error(res.error || 'জমা এডিট ব্যর্থ হয়েছে।');
        setDepositsList((prev) =>
          prev.map((d) =>
            d.id === editingDeposit.id
              ? { ...d, amount: amt, method: depositMethod, date: depositDate, notes: depositNotes }
              : d
          )
        );
        setDepositMsg({ type: 'success', text: 'জমা সফলভাবে পরিবর্তন করা হয়েছে।' });
      } else {
        const res = await addDepositAction({
          memberId: member.id,
          depositDate,
          amount: amt,
          paymentMethod: depositMethod,
          transactionId: depositTx || undefined,
          notes: depositNotes || undefined,
        });
        if (!res.success) throw new Error(res.error || 'জমা যোগ করা ব্যর্থ হয়েছে।');
        setDepositMsg({ type: 'success', text: 'জমা সফলভাবে যোগ করা হয়েছে।' });
      }

      setTimeout(() => {
        setIsDepositModalOpen(false);
        setEditingDeposit(null);
        setDepositAmount('');
        setDepositTx('');
        setDepositNotes('');
        setDepositMsg(null);
        router.refresh();
      }, 800);
    } catch (err: any) {
      setDepositMsg({ type: 'error', text: err.message || 'কার্য সম্পন্ন হয়নি।' });
    } finally {
      setIsDepositSubmitting(false);
    }
  };

  const handleDeleteDeposit = async (depositId: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই জমা রেকর্ডটি মুছে ফেলতে চান?')) return;
    try {
      const res = await deleteDepositAction(depositId);
      if (!res.success) throw new Error(res.error || 'মুছে ফেলা ব্যর্থ হয়েছে।');
      setDepositsList((prev) => prev.filter((d) => d.id !== depositId));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'ডিলিট করতে সমস্যা হয়েছে।');
    }
  };

  // 3. Quick Today Meal Save
  const handleSaveTodayMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTodayMealSubmitting(true);
    setTodayMealMsg(null);
    try {
      const dhakaTodayStr = new Date().toISOString().split('T')[0];
      const bf = Number(todayBf) || 0;
      const ln = Number(todayLunch) || 0;
      const dn = Number(todayDinner) || 0;

      const res = await updateMemberMealEntryAction({
        memberId: member.id,
        date: dhakaTodayStr,
        breakfast: bf,
        lunch: ln,
        dinner: dn,
      });
      if (!res.success) throw new Error(res.error || 'আজকের মিল পরিবর্তন ব্যর্থ হয়েছে।');

      const totalT = (includeBreakfast ? bf : 0) + ln + dn;
      setTodayMealsCount(totalT);
      setTodayMealMsg({ type: 'success', text: 'আজকের মিল সফলভাবে আপডেট করা হয়েছে।' });
      setTimeout(() => {
        setIsTodayMealModalOpen(false);
        setTodayMealMsg(null);
        router.refresh();
      }, 800);
    } catch (err: any) {
      setTodayMealMsg({ type: 'error', text: err.message || 'মিল পরিবর্তন ব্যর্থ হয়েছে।' });
    } finally {
      setIsTodayMealSubmitting(false);
    }
  };

  // 4. Individual Additional Expense
  const handleSaveIndividualExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExpenseSubmitting(true);
    setExpenseMsg(null);
    try {
      const amt = parseFloat(expenseAmount);
      if (isNaN(amt) || amt <= 0) throw new Error('সঠিক খরচের পরিমাণ লিখুন।');
      if (!expenseTitle.trim()) throw new Error('খরচের বিবরণ/শিরোনাম লিখুন।');

      const res = await addAdditionalExpenseAction({
        date: expenseDate,
        title: expenseTitle.trim(),
        amount: amt,
        category: expenseCategory,
        expenseType: 'INDIVIDUAL',
        targetMemberId: member.id,
        description: expenseDesc.trim() || undefined,
      });
      if (!res.success) throw new Error(res.error || 'খরচ যোগ ব্যর্থ হয়েছে।');

      setExpenseMsg({ type: 'success', text: 'ব্যক্তিগত অতিরিক্ত খরচ সফলভাবে যোগ করা হয়েছে।' });
      setTimeout(() => {
        setIsIndividualExpenseModalOpen(false);
        setExpenseTitle('');
        setExpenseAmount('');
        setExpenseDesc('');
        setExpenseMsg(null);
        router.refresh();
      }, 800);
    } catch (err: any) {
      setExpenseMsg({ type: 'error', text: err.message || 'খরচ যোগ করতে ব্যর্থ।' });
    } finally {
      setIsExpenseSubmitting(false);
    }
  };

  // 5. Bazar Schedule
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScheduleSubmitting(true);
    setScheduleMsg(null);
    try {
      if (!scheduleStart || !scheduleEnd) throw new Error('শুরু এবং শেষের তারিখ নির্বাচন করুন।');
      const res = await createBazarScheduleAction({
        memberId: member.id,
        startDate: scheduleStart,
        endDate: scheduleEnd,
        notes: scheduleNotes.trim() || undefined,
        allowOverlapWarning: true,
      });
      if (!res.success) throw new Error(res.error || 'শিডিউল সংরক্ষণ ব্যর্থ হয়েছে।');

      setScheduleMsg({ type: 'success', text: 'বাজার শিডিউল সফলভাবে বরাদ্দ করা হয়েছে।' });
      setTimeout(() => {
        setIsScheduleModalOpen(false);
        setScheduleNotes('');
        setScheduleMsg(null);
        router.refresh();
      }, 800);
    } catch (err: any) {
      setScheduleMsg({ type: 'error', text: err.message || 'শিডিউল যোগ করতে ব্যর্থ।' });
    } finally {
      setIsScheduleSubmitting(false);
    }
  };

  // 6. Fine Management
  const handleSaveFine = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFineSubmitting(true);
    setFineMsg(null);
    try {
      const amt = parseFloat(fineAmount);
      if (isNaN(amt) || amt <= 0) throw new Error('সঠিক জরিমানার পরিমাণ লিখুন।');
      if (!fineReason.trim()) throw new Error('জরিমানার কারণ প্রদান করুন।');

      const res = await addFineAction({
        memberId: member.id,
        amount: amt,
        reason: fineReason.trim(),
        fineDate,
        notes: fineNotes.trim() || undefined,
      });
      if (!res.success) throw new Error(res.error || 'জরিমানা যুক্ত করা যায়নি।');

      setFineMsg({ type: 'success', text: 'জরিমানা সফলভাবে যুক্ত করা হয়েছে।' });
      setTimeout(() => {
        setIsFineModalOpen(false);
        setFineAmount('');
        setFineNotes('');
        setFineMsg(null);
        router.refresh();
      }, 800);
    } catch (err: any) {
      setFineMsg({ type: 'error', text: err.message || 'জরিমানা যোগ করতে ব্যর্থ।' });
    } finally {
      setIsFineSubmitting(false);
    }
  };

  const handleMarkFinePaid = async (fineId: string) => {
    try {
      const res = await markFineAsPaidAction({ fineId, paymentMethod: 'CASH' });
      if (!res.success) throw new Error(res.error || 'জরিমানা পরিশোধ রেকর্ড ব্যর্থ হয়েছে।');
      setFinesList((prev) => prev.map((f) => f.id === fineId ? { ...f, isPaid: true } : f));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'জরিমানা আপডেট করতে সমস্যা হয়েছে।');
    }
  };

  const handleDeleteFine = async (fineId: string) => {
    if (!confirm('আপনি কি এই জরিমানার রেকর্ডটি মুছে ফেলতে চান?')) return;
    try {
      const res = await deleteFineAction(fineId);
      if (!res.success) throw new Error(res.error || 'জরিমানা ডিলিট ব্যর্থ হয়েছে।');
      setFinesList((prev) => prev.filter((f) => f.id !== fineId));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'জরিমানা মুছতে সমস্যা হয়েছে।');
    }
  };

  // 7. Member Bazar Expense Submission
  const handleSubmitBazarExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBazarExpenseSubmitting(true);
    setBazarExpenseMsg(null);
    try {
      const amt = parseFloat(bazarExpenseAmount);
      if (isNaN(amt) || amt <= 0) throw new Error('সঠিক খরচের পরিমাণ লিখুন (টাকা ০ এর বেশি হতে হবে)।');
      if (!bazarExpenseTitle.trim()) throw new Error('বাজারের পণ্যের নাম/বিবরণ লিখুন।');

      const res = await addBazarExpenseAction({
        date: bazarExpenseDate,
        title: bazarExpenseTitle.trim(),
        amount: amt,
        category: bazarExpenseCategory,
        paymentSource: bazarExpenseSource,
        payerMemberId: member.id,
        description: bazarExpenseDesc.trim() || undefined,
      });
      if (!res.success) throw new Error(res.error || 'বাজার খরচ জমা দিতে ব্যর্থ হয়েছে।');

      setBazarExpenseMsg({
        type: 'success',
        text: isManagerOrAdmin
          ? 'বাজারের খরচ সফলভাবে সরাসরি যোগ ও সমন্বয় করা হয়েছে।'
          : 'বাজারের খরচ সফলভাবে জমা হয়েছে! এটি ম্যানেজার বা এডমিনের অনুমোদনের অপেক্ষায় রয়েছে।',
      });

      setTimeout(() => {
        setIsSubmitBazarExpenseModalOpen(false);
        setBazarExpenseTitle('');
        setBazarExpenseAmount('');
        setBazarExpenseDesc('');
        setBazarExpenseMsg(null);
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setBazarExpenseMsg({ type: 'error', text: err.message || 'খরচ জমা দিতে সমস্যা হয়েছে।' });
    } finally {
      setIsBazarExpenseSubmitting(false);
    }
  };

  // 8. Management Approval / Rejection of Member Bazar Expense
  const handleApproveBazar = async (expenseId: string) => {
    try {
      const res = await approveBazarExpenseAction(expenseId);
      if (!res.success) throw new Error(res.error || 'অনুমোদন ব্যর্থ হয়েছে।');
      setPendingBazarList((prev) => prev.filter((e) => e.id !== expenseId));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'অনুমোদন করতে সমস্যা হয়েছে।');
    }
  };

  const handleRejectBazar = async (expenseId: string) => {
    if (!confirm('আপনি কি এই পেন্ডিং বাজার খরচটি বাতিল/মুছে ফেলতে চান?')) return;
    try {
      const res = await rejectBazarExpenseAction(expenseId, 'Rejected by management');
      if (!res.success) throw new Error(res.error || 'বাতিলকরণ ব্যর্থ হয়েছে।');
      setPendingBazarList((prev) => prev.filter((e) => e.id !== expenseId));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'বাতিল করতে সমস্যা হয়েছে।');
    }
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

            {/* Pending Bazar Approvals Notice & Management List */}
            {pendingBazarList.length > 0 && (
              <div className="mb-4 p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      সদস্য কর্তৃক জমাকৃত বাজার খরচের অনুমোদন তালিকা ({pendingBazarList.length}টি পেন্ডিং)
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                    {isManagerOrAdmin ? 'ম্যানেজার ও অ্যাডমিন অনুমোদন আবশ্যক' : 'অনুমোদনের অপেক্ষায়'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2">
                  {pendingBazarList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 shadow-2xs flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                            {item.title}
                          </span>
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                            ৳{Number(item.amount).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                          <span>{item.date ? new Date(item.date).toISOString().split('T')[0] : ''}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-medium">
                            {item.category}
                          </span>
                        </div>
                        {item.payerMemberName && (
                          <div className="text-[10px] text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1 font-medium">
                            <span>জমাকারী:</span>
                            <span className="text-slate-900 dark:text-slate-100 font-bold">{item.payerMemberName}</span>
                          </div>
                        )}
                        {item.description && (
                          <p className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                      </div>

                      {isManagerOrAdmin ? (
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleApproveBazar(item.id)}
                            className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Check className="w-3 h-3" />
                            <span>অনুমোদন করুন</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectBazar(item.id)}
                            className="py-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>বাতিল</span>
                          </button>
                        </div>
                      ) : (
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            ⏳ ম্যানেজার অনুমোদনের পর মূল খরচে যুক্ত হবে
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Card 1: Total Joma (মোট জমা) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-emerald-500/50 transition-colors flex flex-col justify-between">
                <div>
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

                {isManagerOrAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDepositAmount('');
                      setDepositTx('');
                      setDepositNotes('');
                      setEditingDeposit(null);
                      setDepositModalTab('add');
                      setIsDepositModalOpen(true);
                    }}
                    className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>জমা যোগ ও এডিট</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDepositModalTab('list');
                      setIsDepositModalOpen(true);
                    }}
                    className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>জমার হিস্ট্রি দেখুন ({depositsList.length})</span>
                  </button>
                )}
              </div>

              {/* Card 2: Initial Balance (প্রারম্ভিক ব্যালেন্স) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-sky-500/50 transition-colors flex flex-col justify-between">
                <div>
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
                    পূর্ববর্তী স্থিতি (Carry Forward)
                  </p>
                </div>

                {isManagerOrAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpeningBalanceInput(String(initialBalanceValue));
                      setIsOpeningBalanceModalOpen(true);
                    }}
                    className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>ব্যালেন্স পরিবর্তন করুন</span>
                  </button>
                ) : (
                  <div className="mt-3 text-[11px] text-slate-400 text-center py-1 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    মেসের শুরুতে আনীত ব্যালেন্স
                  </div>
                )}
              </div>

              {/* Card 3: Total Meals (মোট মিল) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-amber-500/50 transition-colors flex flex-col justify-between">
                <div>
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

                <button
                  type="button"
                  onClick={() => setActiveTab('meals')}
                  className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>দৈনিক মিল লগ দেখুন ({meals.length})</span>
                </button>
              </div>

              {/* Card 4: Today's Meals (আজকের মিল) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-teal-500/50 transition-colors flex flex-col justify-between">
                <div>
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
                    আজকের সক্রিয় মিল এন্ট্রি
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTodayMealModalOpen(true)}
                  className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>আজকের মিল পরিবর্তন</span>
                </button>
              </div>

              {/* Card 5: Total Cost (মোট খরচ) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-rose-500/50 transition-colors flex flex-col justify-between">
                <div>
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

                {isManagerOrAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseTitle('');
                      setExpenseAmount('');
                      setExpenseDesc('');
                      setIsIndividualExpenseModalOpen(true);
                    }}
                    className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ ব্যক্তিগত খরচ যোগ</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('expenses')}
                    className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>খরচের বিবরণী দেখুন</span>
                  </button>
                )}
              </div>

              {/* Card 6: Bazar Date Range (বাজারের তারিখ ও শিডিউল) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-orange-500/50 transition-colors flex flex-col justify-between">
                <div>
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

                <div className="mt-3 flex items-center gap-1.5">
                  {isManagerOrAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 dark:hover:bg-orange-900/80 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>শিডিউল সেট</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setBazarExpenseTitle('');
                      setBazarExpenseAmount('');
                      setBazarExpenseDesc('');
                      setIsSubmitBazarExpenseModalOpen(true);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>+ বাজার খরচ</span>
                  </button>
                </div>
              </div>

              {/* Card 7: Total Fine (মোট জরিমানা) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-purple-500/50 transition-colors flex flex-col justify-between">
                <div>
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

                {isManagerOrAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFineAmount('');
                      setFineNotes('');
                      setIsFineModalOpen(true);
                    }}
                    className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>জরিমানা পরিচালনা</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('fines')}
                    className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>জরিমানা হিস্ট্রি ({finesList.length})</span>
                  </button>
                )}
              </div>

              {/* Card 8: Monthly Balance (চলতি মাসের ব্যালেন্স) */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-indigo-500/50 transition-colors flex flex-col justify-between">
                <div>
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

                <button
                  type="button"
                  onClick={() => setIsBreakdownModalOpen(true)}
                  className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>মাসের হিসাব বিস্তারিত</span>
                </button>
              </div>

              {/* Card 9: Overall Balance (সর্বমোট স্থিতি) */}
              <div className={`p-4 rounded-xl border shadow-2xs transition-colors flex flex-col justify-between ${
                overallBalanceValue >= 0
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500'
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 hover:border-rose-500'
              }`}>
                <div>
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
                      ? 'Advance (মেসের নিকট সদস্যের পাওনা)'
                      : 'Due (বাকি - সদস্য কর্তৃক মেসকে প্রদেয়)'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLedgerModalOpen(true)}
                  className="mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>লেজার ও হিসাব নিষ্পত্তি</span>
                </button>
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
              {/* Name & Phone: Editable by member themselves or Management */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.profile?.name || 'Full Name'} *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  placeholder="আপনার পূর্ণ নাম লিখুন"
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
                  placeholder="১১ ডিজিটের মোবাইল নম্বর"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
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
      {/* ========================================================================= */}
      {/* 9 CARD EDIT & MANAGEMENT MODALS + BAZAR EXPENSE SUBMISSION MODAL          */}
      {/* ========================================================================= */}

      {/* Modal 1: Deposit Management Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    জমা ব্যবস্থাপনা (Deposit Management)
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                    {member.fullName} ({depositsList.length}টি রেকর্ড)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDepositModalOpen(false);
                  setEditingDeposit(null);
                  setDepositMsg(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 pt-2 gap-2 shrink-0">
              {isManagerOrAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setDepositModalTab('add');
                    setEditingDeposit(null);
                  }}
                  className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    depositModalTab === 'add'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {editingDeposit ? 'জমা এডিট করুন' : '+ নতুন জমা যোগ'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDepositModalTab('list')}
                className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  depositModalTab === 'list'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                জমার তালিকা ({depositsList.length})
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {depositMsg && (
                <div
                  className={`p-3 mb-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                    depositMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {depositMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{depositMsg.text}</span>
                </div>
              )}

              {depositModalTab === 'add' && isManagerOrAdmin ? (
                <form onSubmit={handleSaveDeposit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      জমার পরিমাণ (টাকা) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        পেমেন্ট মাধ্যম *
                      </label>
                      <select
                        value={depositMethod}
                        onChange={(e) => setDepositMethod(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                      >
                        <option value="CASH">ক্যাশ (Cash)</option>
                        <option value="BKASH">বিকাশ (bKash)</option>
                        <option value="NAGAD">নগদ (Nagad)</option>
                        <option value="BANK_TRANSFER">ব্যাংক ট্রান্সফার (Bank)</option>
                        <option value="OTHER">অন্যান্য (Other)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        জমার তারিখ *
                      </label>
                      <input
                        type="date"
                        required
                        value={depositDate}
                        onChange={(e) => setDepositDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                      >
                      </input>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      ট্রানজেকশন আইডি (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={depositTx}
                      onChange={(e) => setDepositTx(e.target.value)}
                      placeholder="বিকাশ / নগদ TrxID"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      মন্তব্য / নোট
                    </label>
                    <input
                      type="text"
                      value={depositNotes}
                      onChange={(e) => setDepositNotes(e.target.value)}
                      placeholder="e.g. নভেম্বর মাসের অগ্রিম জমা"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {editingDeposit && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDeposit(null);
                          setDepositAmount('');
                          setDepositTx('');
                          setDepositNotes('');
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        বাতিল
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isDepositSubmitting}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isDepositSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{editingDeposit ? 'জমা আপডেট করুন' : 'জমা সংরক্ষণ করুন'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2">
                  {depositsList.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      এখনো কোনো জমা রেকর্ড করা হয়নি।
                    </div>
                  ) : (
                    depositsList.map((d) => (
                      <div
                        key={d.id}
                        className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(d.amount)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {d.method}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {formatDate(d.date)} {d.notes ? `• ${d.notes}` : ''}
                          </p>
                        </div>

                        {isManagerOrAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDeposit(d);
                                setDepositAmount(String(d.amount));
                                setDepositMethod(d.method as any);
                                setDepositDate(new Date(d.date).toISOString().split('T')[0]);
                                setDepositNotes(d.notes || '');
                                setDepositModalTab('add');
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                              title="এডিট করুন"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDeposit(d.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Opening Balance Modal */}
      {isOpeningBalanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    প্রারম্ভিক ব্যালেন্স নির্ধারণ
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {member.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpeningBalanceModalOpen(false);
                  setOpeningMsg(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOpeningBalance} className="p-4 space-y-3">
              {openingMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                    openingMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {openingMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{openingMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  প্রারম্ভিক ব্যালেন্স (Opening Balance - ৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(e.target.value)}
                  placeholder="e.g. 500 or -200"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base font-black text-slate-900 dark:text-slate-100 focus:outline-sky-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  মেসের শুরুতে বা পূর্ববর্তী মাস থেকে আনীত ব্যালেন্স। পাওনা (Advance) থাকলে ধনাত্মক সংখ্যা লিখুন, আর বাকি (Due) থাকলে ঋণাত্মক সংখ্যা (e.g. -500) লিখুন।
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpeningBalanceModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isOpeningSubmitting}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isOpeningSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>ব্যালেন্স সেভ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Today's Meal Quick Update Modal */}
      {isTodayMealModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    আজকের মিল পরিবর্তন (Today&apos;s Meal)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {member.fullName} ({new Date().toISOString().split('T')[0]})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTodayMealModalOpen(false);
                  setTodayMealMsg(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTodayMeal} className="p-4 space-y-4">
              {todayMealMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                    todayMealMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {todayMealMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{todayMealMsg.text}</span>
                </div>
              )}

              <div className={`grid gap-3 ${includeBreakfast ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {includeBreakfast && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      সকাল (Bf)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      value={todayBf}
                      onChange={(e) => setTodayBf(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    দুপুর (Lunch)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={todayLunch}
                    onChange={(e) => setTodayLunch(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    রাত (Dinner)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={todayDinner}
                    onChange={(e) => setTodayDinner(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl font-medium">
                <span className="text-slate-500">আজকের মোট মিল:</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 text-sm">
                  {(includeBreakfast ? Number(todayBf) || 0 : 0) + (Number(todayLunch) || 0) + (Number(todayDinner) || 0)} টি
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTodayMealModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isTodayMealSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isTodayMealSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>মিল সেভ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Individual Additional Expense Modal */}
      {isIndividualExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    ব্যক্তিগত খরচ যোগ করুন
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    সদস্য: {member.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsIndividualExpenseModalOpen(false);
                  setExpenseMsg(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIndividualExpense} className="p-4 space-y-3">
              {expenseMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                    expenseMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {expenseMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{expenseMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  খরচের শিরোনাম / বিবরণ *
                </label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. ওয়াইফাই বিল, ব্যক্তিগত বুয়ার বিল"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    টাকার পরিমাণ *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="e.g. 300"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ক্যাটাগরি
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-rose-500"
                  >
                    <option value="WiFi">ওয়াইফাই (WiFi)</option>
                    <option value="Electricity">বিদ্যুৎ বিল</option>
                    <option value="Gas">গ্যাস সিলিন্ডার</option>
                    <option value="Water">পানি বিল</option>
                    <option value="Maid">খালা / কাজের বিল</option>
                    <option value="Rent">রুম ভাড়া</option>
                    <option value="Other">অন্যান্য</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  তারিখ *
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অতিরিক্ত বিবরণ
                </label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="ঐচ্ছিক তথ্য"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsIndividualExpenseModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isExpenseSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isExpenseSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>খরচ যোগ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Bazar Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    বাজার শিডিউল বরাদ্দ
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    দায়িত্বপ্রাপ্ত সদস্য: {member.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsScheduleModalOpen(false);
                  setScheduleMsg(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-4 space-y-3">
              {scheduleMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                    scheduleMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {scheduleMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{scheduleMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  শুরুর তারিখ *
                </label>
                <input
                  type="date"
                  required
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  শেষের তারিখ *
                </label>
                <input
                  type="date"
                  required
                  value={scheduleEnd}
                  onChange={(e) => setScheduleEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  নোট / মন্তব্য (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="e.g. সকালের বাজার করবেন"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isScheduleSubmitting}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isScheduleSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>শিডিউল সেভ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 7: Fine Management Modal */}
      {isFineModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    জরিমানা পরিচালনা (Fine Management)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {member.fullName} ({finesList.length}টি রেকর্ড)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFineModalOpen(false);
                  setFineMsg(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {fineMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                    fineMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {fineMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{fineMsg.text}</span>
                </div>
              )}

              {/* Form to Add Fine */}
              <form onSubmit={handleSaveFine} className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 space-y-3">
                <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5" /> <span>নতুন জরিমানা ধার্য করুন</span>
                </h4>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      পরিমাণ (টাকা) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={fineAmount}
                      onChange={(e) => setFineAmount(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      তারিখ *
                    </label>
                    <input
                      type="date"
                      required
                      value={fineDate}
                      onChange={(e) => setFineDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    জরিমানার কারণ *
                  </label>
                  <input
                    type="text"
                    required
                    value={fineReason}
                    onChange={(e) => setFineReason(e.target.value)}
                    placeholder="e.g. মিল কাটার সময় অতিক্রম"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isFineSubmitting}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    {isFineSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    <span>জরিমানা ধার্য করুন</span>
                  </button>
                </div>
              </form>

              {/* Fines List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  বিদ্যমান জরিমানাসমূহ ({finesList.length})
                </h4>
                {finesList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">কোন জরিমানা নেই।</p>
                ) : (
                  finesList.map((f) => (
                    <div
                      key={f.id}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                            ৳{Number(f.amount).toFixed(2)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            f.isPaid
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}>
                            {f.isPaid ? 'পরিশোধিত' : 'বকেয়া'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                          {f.reason}
                        </p>
                        <p className="text-[10px] text-slate-400">{formatDate(f.fineDate)}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        {!f.isPaid && isManagerOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleMarkFinePaid(f.id)}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                            title="পরিশোধ চিহ্নিত করুন"
                          >
                            পরিশোধ করুন
                          </button>
                        )}
                        {isManagerOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFine(f.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 8: Monthly Breakdown Modal */}
      {isBreakdownModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    চলতি মাসের বিস্তারিত আর্থিক বিবরণী
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {member.fullName} ({currentMonth}/{currentYear})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBreakdownModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">মোট মিল সংখ্যা:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{accounting.totalMeals} টি</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">বর্তমান মিল রেট:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">৳{accounting.currentMealRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">মিল বাবদ খরচ (Meals × Rate):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">৳{accounting.mealCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">শেয়ার্ড অতিরিক্ত খরচ:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">৳{accounting.sharedExpenseCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">ব্যক্তিগত অতিরিক্ত খরচ:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">৳{accounting.individualExpenseCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-rose-600 dark:text-rose-400">
                  <span>চলতি মাসের মোট খরচ (A):</span>
                  <span>৳{accounting.totalCost.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/40">
                <div className="flex justify-between py-1 border-b border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="text-slate-600 dark:text-slate-400">সদস্যের ক্যাশ/অনলাইন জমা:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">৳{accounting.deposits.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="text-slate-600 dark:text-slate-400">নিজস্ব পকেট থেকে বাজার অবদান:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">৳{accounting.bazarContribution.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-emerald-700 dark:text-emerald-300">
                  <span>চলতি মাসের মোট জমা (B):</span>
                  <span>৳{(accounting.deposits + accounting.bazarContribution).toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-300 uppercase tracking-wider block">চলতি মাসের পার্থক্য (B - A)</span>
                  <span className="text-xs text-slate-400">
                    {((accounting.deposits + accounting.bazarContribution) - accounting.totalCost) >= 0 ? 'চলতি মাসের উদ্বৃত্ত' : 'চলতি মাসের ঘাটতি'}
                  </span>
                </div>
                <span className={`text-xl font-black ${
                  ((accounting.deposits + accounting.bazarContribution) - accounting.totalCost) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {((accounting.deposits + accounting.bazarContribution) - accounting.totalCost) >= 0 ? '+' : ''}
                  ৳{((accounting.deposits + accounting.bazarContribution) - accounting.totalCost).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsBreakdownModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 9: Ledger & Settlement Modal */}
      {isLedgerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    সর্বমোট লেজার ও হিসাব নিষ্পত্তি
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {member.fullName} • স্বয়ংক্রিয় অডিট ট্রেইল
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLedgerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-600 dark:text-slate-400">১. প্রারম্ভিক স্থিতি (Opening Balance):</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400">৳{initialBalanceValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-600 dark:text-slate-400">২. মোট ক্যাশ/অনলাইন জমা (+):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">+৳{accounting.deposits.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-600 dark:text-slate-400">৩. অনুমোদিত বাজার অবদান (+):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">+৳{accounting.bazarContribution.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-600 dark:text-slate-400">৪. মিল বাবদ মোট খরচ (-):</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">-৳{accounting.mealCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-600 dark:text-slate-400">৫. শেয়ার্ড অতিরিক্ত খরচ (-):</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">-৳{accounting.sharedExpenseCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-600 dark:text-slate-400">৬. ব্যক্তিগত অতিরিক্ত খরচ (-):</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">-৳{accounting.individualExpenseCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600 dark:text-slate-400">৭. বকেয়া জরিমানা (-):</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">-৳{(accounting.unpaidFine ?? 0).toFixed(2)}</span>
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${
                accounting.netBalance >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    চূড়ান্ত সর্বমোট স্থিতি (Net Balance)
                  </span>
                  <span className="text-2xl font-black">
                    {accounting.netBalance >= 0 ? '+' : ''}৳{accounting.netBalance.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] mt-1 font-medium">
                  {accounting.netBalance >= 0
                    ? '🎉 মেসের নিকট সদস্যের অগ্রিম পাওনা (Advance)'
                    : '⚠️ মেসকে সদস্য কর্তৃক প্রদেয় বকেয়া (Due)'}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                {isManagerOrAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLedgerModalOpen(false);
                      setDepositAmount(accounting.netBalance < 0 ? String(Math.abs(accounting.netBalance)) : '');
                      setDepositTx('');
                      setDepositNotes(accounting.netBalance < 0 ? 'বকেয়া সমন্বয় ও নিষ্পত্তি' : 'অগ্রিম জমা');
                      setEditingDeposit(null);
                      setDepositModalTab('add');
                      setIsDepositModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>{accounting.netBalance < 0 ? 'বকেয়া পরিশোধ রেকর্ড করুন' : 'নতুন জমা যুক্ত করুন'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsLedgerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer ml-auto"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 10: Member Bazar Expense Submission Modal */}
      {isSubmitBazarExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    বাজার খরচ জমা দিন
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    জমাকারী: {member.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitBazarExpenseModalOpen(false);
                  setBazarExpenseMsg(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitBazarExpense} className="p-4 space-y-3">
              {bazarExpenseMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                    bazarExpenseMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {bazarExpenseMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{bazarExpenseMsg.text}</span>
                </div>
              )}

              {!isManagerOrAdmin && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  💡 সাধারণ সদস্য হিসেবে আপনার জমাকৃত খরচটি অ্যাডমিন বা ম্যানেজারের প্রোফাইলে <strong>পেন্ডিং তালিকায়</strong> যাবে। তারা অনুমোদন দিলে তা মেসের মূল মোট খরচ ও আপনার ব্যালেন্সে যোগ হবে।
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  বাজারের পণ্যের নাম / শিরোনাম *
                </label>
                <input
                  type="text"
                  required
                  value={bazarExpenseTitle}
                  onChange={(e) => setBazarExpenseTitle(e.target.value)}
                  placeholder="e.g. চাল, ডাল, আলু ও তেল"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    খরচের পরিমাণ (টাকা) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={bazarExpenseAmount}
                    onChange={(e) => setBazarExpenseAmount(e.target.value)}
                    placeholder="e.g. 1250"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ক্যাটাগরি
                  </label>
                  <select
                    value={bazarExpenseCategory}
                    onChange={(e) => setBazarExpenseCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    <option value="কাঁচাবাজার">কাঁচাবাজার</option>
                    <option value="মাছ-মাংস">মাছ-মাংস</option>
                    <option value="চাল-ডাল">চাল-ডাল</option>
                    <option value="তেল-মসলা">তেল-মসলা</option>
                    <option value="অন্যান্য">অন্যান্য</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    বাজারের তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={bazarExpenseDate}
                    onChange={(e) => setBazarExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    পেমেন্ট উৎস
                  </label>
                  <select
                    value={bazarExpenseSource}
                    onChange={(e) => setBazarExpenseSource(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    <option value="PERSONAL">নিজস্ব পকেট (Personal)</option>
                    <option value="MESS_FUND">মেস ফান্ড (Mess Fund)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  অতিরিক্ত বিবরণ / রসিদের নোট
                </label>
                <input
                  type="text"
                  value={bazarExpenseDesc}
                  onChange={(e) => setBazarExpenseDesc(e.target.value)}
                  placeholder="e.g. চকবাজার থেকে কেনা"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubmitBazarExpenseModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isBazarExpenseSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isBazarExpenseSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{isManagerOrAdmin ? 'বাজার খরচ যোগ করুন' : 'খরচ অনুমোদন জমা দিন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
