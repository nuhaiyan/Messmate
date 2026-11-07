'use client';

import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Filter,
  Trash2,
  Calendar,
  User,
  Wallet,
  DollarSign,
  AlertCircle,
  X,
  Tag,
  Receipt,
  Edit3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Users,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { addBazarExpenseAction, updateBazarExpenseAction, deleteBazarExpenseAction } from '@/app/actions/bazar';
import {
  createBazarScheduleAction,
  updateBazarScheduleAction,
  deleteBazarScheduleAction,
} from '@/app/actions/bazar-schedule';

export interface BazarScheduleItem {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar: string | null;
  memberPhone: string;
  startDate: string;
  endDate: string;
  formattedRange: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  notes?: string | null;
}

export interface BazarItem {
  id: string;
  date: string | Date;
  title: string;
  amount: number;
  category: string;
  paymentSource: string;
  payerMemberId: string | null;
  payerName: string | null;
  description: string | null;
}

export interface MemberOption {
  id: string;
  fullName: string;
}

interface BazarManagementClientProps {
  expenses: BazarItem[];
  schedules?: BazarScheduleItem[];
  members: MemberOption[];
  isManager: boolean;
  isClosed: boolean;
  initialTab?: string;
  currentMonth?: number;
  currentYear?: number;
}

export function BazarManagementClient({
  expenses,
  schedules = [],
  members,
  isManager,
  isClosed,
  initialTab = 'schedule',
  currentMonth = 11,
  currentYear = 2026,
}: BazarManagementClientProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'list' | 'expenses' | 'buyers' | 'payments'>(
    (initialTab as any) || 'schedule'
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // SCHEDULE CREATION & MANAGEMENT STATE
  // -------------------------------------------------------------
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [schedStartDate, setSchedStartDate] = useState('');
  const [schedEndDate, setSchedEndDate] = useState('');
  const [schedMemberId, setSchedMemberId] = useState(members[0]?.id || '');
  const [schedNotes, setSchedNotes] = useState('');
  const [schedError, setSchedError] = useState<string | null>(null);
  const [schedWarning, setSchedWarning] = useState<string | null>(null);

  // Edit Schedule Modal
  const [editingSchedule, setEditingSchedule] = useState<BazarScheduleItem | null>(null);
  const [editSchedStart, setEditSchedStart] = useState('');
  const [editSchedEnd, setEditSchedEnd] = useState('');
  const [editSchedMemberId, setEditSchedMemberId] = useState('');
  const [editSchedNotes, setEditSchedNotes] = useState('');
  const [editSchedError, setEditSchedError] = useState<string | null>(null);

  // Delete Schedule Confirmation
  const [deletingSchedule, setDeletingSchedule] = useState<BazarScheduleItem | null>(null);

  // Schedule Filter & Search
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED'>('ALL');

  // -------------------------------------------------------------
  // EXPENSE CREATION & MANAGEMENT STATE
  // -------------------------------------------------------------
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Grocery');
  const [paymentSource, setPaymentSource] = useState<'PERSONAL' | 'MESS_FUND'>('MESS_FUND');
  const [payerMemberId, setPayerMemberId] = useState(members[0]?.id || '');
  const [description, setDescription] = useState('');

  // Edit Expense
  const [editingExpense, setEditingExpense] = useState<BazarItem | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('Grocery');
  const [editPaymentSource, setEditPaymentSource] = useState<'PERSONAL' | 'MESS_FUND'>('MESS_FUND');
  const [editPayerMemberId, setEditPayerMemberId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Expense Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [payerFilter, setPayerFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const categories = [
    'Rice',
    'Vegetables',
    'Fish',
    'Meat',
    'Chicken',
    'Eggs',
    'Grocery',
    'Milk',
    'Spices',
    'Other Bazar',
  ];

  // -------------------------------------------------------------
  // SCHEDULE HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddSchedule = () => {
    setSchedStartDate('');
    setSchedEndDate('');
    setSchedMemberId(members[0]?.id || '');
    setSchedNotes('');
    setSchedError(null);
    setSchedWarning(null);
    setScheduleModalOpen(true);
  };

  const handleCreateSchedule = async (allowOverlap = false) => {
    if (!schedStartDate || !schedEndDate) {
      setSchedError('Start Date and End Date are required.');
      return;
    }
    if (schedEndDate < schedStartDate) {
      setSchedError('End Date cannot be earlier than Start Date.');
      return;
    }
    if (!schedMemberId) {
      setSchedError('Please select a responsible member.');
      return;
    }

    setLoading(true);
    setSchedError(null);

    const res = await createBazarScheduleAction({
      startDate: schedStartDate,
      endDate: schedEndDate,
      memberId: schedMemberId,
      notes: schedNotes || undefined,
      allowOverlapWarning: allowOverlap,
    });

    setLoading(false);

    if (res.success) {
      setScheduleModalOpen(false);
      setSchedWarning(null);
    } else if (res.warning) {
      setSchedWarning(res.error || 'Schedule date overlap detected.');
    } else {
      setSchedError(res.error || 'Failed to create bazar schedule.');
    }
  };

  const handleOpenEditSchedule = (sched: BazarScheduleItem) => {
    setEditingSchedule(sched);
    setEditSchedStart(sched.startDate);
    setEditSchedEnd(sched.endDate);
    setEditSchedMemberId(sched.memberId);
    setEditSchedNotes(sched.notes || '');
    setEditSchedError(null);
  };

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;

    if (!editSchedStart || !editSchedEnd) {
      setEditSchedError('Start and End Date are required.');
      return;
    }
    if (editSchedEnd < editSchedStart) {
      setEditSchedError('End Date cannot be earlier than Start Date.');
      return;
    }

    setLoading(true);
    setEditSchedError(null);

    const res = await updateBazarScheduleAction(editingSchedule.id, {
      startDate: editSchedStart,
      endDate: editSchedEnd,
      memberId: editSchedMemberId,
      notes: editSchedNotes || undefined,
    });

    setLoading(false);

    if (res.success) {
      setEditingSchedule(null);
    } else {
      setEditSchedError(res.error || 'Failed to update schedule.');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!deletingSchedule) return;

    setLoading(true);
    const res = await deleteBazarScheduleAction(deletingSchedule.id);
    setLoading(false);

    if (res.success) {
      setDeletingSchedule(null);
    } else {
      alert(res.error || 'Failed to delete schedule.');
    }
  };

  // -------------------------------------------------------------
  // EXPENSE HANDLERS
  // -------------------------------------------------------------
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!title) {
      setError('Title / item description is required.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await addBazarExpenseAction({
      date,
      title,
      amount: parseFloat(amount),
      category,
      paymentSource,
      payerMemberId: paymentSource === 'PERSONAL' ? payerMemberId : undefined,
      description: description || undefined,
    });

    setLoading(false);
    if (res.success) {
      setExpenseModalOpen(false);
      setTitle('');
      setAmount('');
      setDescription('');
    } else {
      setError(res.error || 'Failed to add expense');
    }
  };

  const handleOpenEditExpense = (exp: BazarItem) => {
    setEditingExpense(exp);
    setEditDate(new Date(exp.date).toISOString().split('T')[0]);
    setEditTitle(exp.title);
    setEditAmount(exp.amount.toString());
    setEditCategory(exp.category);
    setEditPaymentSource((exp.paymentSource as 'PERSONAL' | 'MESS_FUND') || 'MESS_FUND');
    setEditPayerMemberId(exp.payerMemberId || members[0]?.id || '');
    setEditDescription(exp.description || '');
    setEditError(null);
  };

  const handleEditExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    if (!editAmount || parseFloat(editAmount) <= 0) {
      setEditError('Please enter a valid amount.');
      return;
    }

    setLoading(true);
    setEditError(null);

    const res = await updateBazarExpenseAction(editingExpense.id, {
      date: editDate,
      title: editTitle,
      amount: parseFloat(editAmount),
      category: editCategory,
      paymentSource: editPaymentSource,
      payerMemberId: editPaymentSource === 'PERSONAL' ? editPayerMemberId : undefined,
      description: editDescription || undefined,
    });

    setLoading(false);
    if (res.success) {
      setEditingExpense(null);
    } else {
      setEditError(res.error || 'Failed to update expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bazar expense?')) return;
    setLoading(true);
    await deleteBazarExpenseAction(id);
    setLoading(false);
  };

  // -------------------------------------------------------------
  // COMPUTED STATS & FILTERING
  // -------------------------------------------------------------
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchSearch =
        s.memberName.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        s.formattedRange.toLowerCase().includes(scheduleSearch.toLowerCase());
      const matchStatus = scheduleStatusFilter === 'ALL' || s.status === scheduleStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [schedules, scheduleSearch, scheduleStatusFilter]);

  const ongoingSchedules = useMemo(() => schedules.filter((s) => s.status === 'ONGOING'), [schedules]);
  const upcomingSchedules = useMemo(() => schedules.filter((s) => s.status === 'UPCOMING'), [schedules]);
  const completedSchedules = useMemo(() => schedules.filter((s) => s.status === 'COMPLETED'), [schedules]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat = categoryFilter === 'ALL' || e.category === categoryFilter;
      const matchPayer =
        payerFilter === 'ALL' ||
        (payerFilter === 'MESS_FUND' && e.paymentSource === 'MESS_FUND') ||
        (payerFilter === 'PERSONAL' && e.paymentSource === 'PERSONAL') ||
        e.payerMemberId === payerFilter;
      const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchPayer && matchSearch;
    });
  }, [expenses, categoryFilter, payerFilter, search]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filteredExpenses]);

  // Buyer Summary Breakdown
  const buyerSummary = useMemo(() => {
    const map = new Map<string, { memberName: string; count: number; personalTotal: number; messFundTotal: number }>();
    members.forEach((m) => {
      map.set(m.id, { memberName: m.fullName, count: 0, personalTotal: 0, messFundTotal: 0 });
    });

    expenses.forEach((e) => {
      if (e.payerMemberId && map.has(e.payerMemberId)) {
        const item = map.get(e.payerMemberId)!;
        item.count += 1;
        if (e.paymentSource === 'PERSONAL') {
          item.personalTotal += Number(e.amount);
        } else {
          item.messFundTotal += Number(e.amount);
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.personalTotal - a.personalTotal);
  }, [expenses, members]);

  return (
    <div className="space-y-6">
      {/* Module Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-orange-500" />
            Bazar Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Date-range bazar schedules, automatic bazar lists, grocery expenditures, buyer summaries, and payment records.
          </p>
        </div>

        {isManager && !isClosed && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenAddSchedule}
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Create Bazar Schedule</span>
            </Button>
            <Button
              onClick={() => setExpenseModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bazar Expense</span>
            </Button>
          </div>
        )}
      </div>

      {isClosed && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This month is CLOSED and locked. New entries or modifications are restricted.</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-400 font-semibold block uppercase">Total Schedules</span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{schedules.length}</p>
          <p className="text-[10px] text-orange-600 font-semibold mt-0.5">
            {ongoingSchedules.length} ongoing | {upcomingSchedules.length} upcoming
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-400 font-semibold block uppercase">Total Bazar Expense</span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(expenses.reduce((s, e) => s + Number(e.amount), 0))}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{expenses.length} purchase entries</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-400 font-semibold block uppercase">Paid from Mess Fund</span>
          <p className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
            {formatCurrency(
              expenses.filter((e) => e.paymentSource === 'MESS_FUND').reduce((s, e) => s + Number(e.amount), 0)
            )}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Direct fund purchases</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-400 font-semibold block uppercase">Personal Payments</span>
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(
              expenses.filter((e) => e.paymentSource === 'PERSONAL').reduce((s, e) => s + Number(e.amount), 0)
            )}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Credited to purchasers</p>
        </div>
      </div>

      {/* Navigation Submodules */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'schedule'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Bazar Schedule ({schedules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'list'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Complete Bazar List</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'expenses'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Bazar Expenses ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('buyers')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'buyers'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Bazar Buyer History</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'payments'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payment History</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUBMODULE 1: BAZAR SCHEDULE (DATE-RANGE MANAGEMENT)           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Ongoing Banner if active today */}
          {ongoingSchedules.length > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-sm animate-pulse">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Ongoing Today in Dhaka (আজকের বাজার দায়িত্ব)
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {ongoingSchedules.map((s) => (
                      <span key={s.id} className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {s.memberName} ({s.formattedRange})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Badge className="bg-orange-500 text-white font-bold text-xs uppercase px-2.5 py-1">
                Ongoing
              </Badge>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search schedule by member or date..."
                value={scheduleSearch}
                onChange={(e) => setScheduleSearch(e.target.value)}
                className="w-full text-xs bg-transparent border-none outline-hidden text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              {(['ALL', 'ONGOING', 'UPCOMING', 'COMPLETED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setScheduleStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    scheduleStatusFilter === st
                      ? 'bg-orange-500 text-white font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'ONGOING' ? 'Ongoing' : st === 'UPCOMING' ? 'Upcoming' : 'Completed'}
                </button>
              ))}
            </div>
          </div>

          {/* Schedules Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">End Date</th>
                    <th className="py-3 px-4">Responsible Member</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes</th>
                    {isManager && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No bazar schedules found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {s.startDate}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {s.endDate}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 font-bold flex items-center justify-center text-[10px]">
                              {s.memberName.charAt(0)}
                            </div>
                            <span>{s.memberName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.status === 'ONGOING'
                                ? 'bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700 animate-pulse'
                                : s.status === 'UPCOMING'
                                ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {s.status === 'ONGOING' ? 'Ongoing (চলমান)' : s.status === 'UPCOMING' ? 'Upcoming' : 'Completed'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{s.notes || '—'}</td>
                        {isManager && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditSchedule(s)}
                                title="Edit Schedule"
                                className="p-1 rounded text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingSchedule(s)}
                                title="Delete Schedule"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBMODULE 2: COMPLETE BAZAR LIST (AUTO-GENERATED DISPLAY)     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Organized Bazar Roster
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically synchronized with all assigned schedules and mess notices.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
              {schedules.length} Scheduled Rosters
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {schedules.map((s) => (
              <div
                key={s.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  s.status === 'ONGOING'
                    ? 'bg-orange-50/40 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      s.status === 'ONGOING'
                        ? 'bg-orange-500 text-white'
                        : s.status === 'UPCOMING'
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {s.status}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{s.startDate.split('-').slice(1).join('/')}</span>
                </div>

                <div className="flex items-center gap-2.5 my-2">
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-orange-600">
                    {s.memberName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{s.memberName}</h4>
                    <p className="text-[11px] text-slate-400">{s.memberPhone}</p>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] flex items-center justify-between">
                  <span className="text-slate-500">Dates:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{s.formattedRange}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBMODULE 3: BAZAR EXPENSES (PURCHASES)                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search purchase title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-none outline-hidden text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Payer:</span>
              <select
                value={payerFilter}
                onChange={(e) => setPayerFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs"
              >
                <option value="ALL">All Sources</option>
                <option value="MESS_FUND">Mess Fund</option>
                <option value="PERSONAL">All Personal</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Title / Items</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Payment Source</th>
                    <th className="py-3 px-4">Purchaser</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    {isManager && !isClosed && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No bazar expenses recorded for this selection.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {formatDate(exp.date)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {exp.title}
                          {exp.description && (
                            <span className="block text-[10px] text-slate-400 font-normal">{exp.description}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              exp.paymentSource === 'MESS_FUND'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {exp.paymentSource === 'MESS_FUND' ? 'Mess Fund' : 'Personal Pocket'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          {exp.paymentSource === 'PERSONAL' ? exp.payerName || 'Member' : 'Mess Common'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(exp.amount)}
                        </td>
                        {isManager && !isClosed && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditExpense(exp)}
                                title="Edit Expense"
                                className="p-1 rounded text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                title="Delete Expense"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBMODULE 4: BAZAR BUYER HISTORY                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'buyers' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Purchaser Activity &amp; Reimbursement Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Personal payments made by members are automatically credited toward their monthly mess contribution.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4 text-center">Bazar Purchases Handled</th>
                    <th className="py-3 px-4 text-right">Personal Pocket Contribution</th>
                    <th className="py-3 px-4 text-right">Mess Fund Disbursed</th>
                    <th className="py-3 px-4 text-right">Total Groceries Bought</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {buyerSummary.map((b) => (
                    <tr key={b.memberName} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{b.memberName}</td>
                      <td className="py-3 px-4 text-center font-mono">{b.count} times</td>
                      <td className="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(b.personalTotal)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(b.messFundTotal)}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900 dark:text-slate-100">
                        {formatCurrency(b.personalTotal + b.messFundTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBMODULE 5: BAZAR PAYMENT HISTORY                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Mess Fund Bazar Payments
              </h4>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                {formatCurrency(
                  expenses.filter((e) => e.paymentSource === 'MESS_FUND').reduce((s, e) => s + Number(e.amount), 0)
                )}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                Direct mess cash withdrawal / bank payments
              </p>
            </div>

            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl">
              <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                Personal Member Bazar Payments
              </h4>
              <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-200 mt-1">
                {formatCurrency(
                  expenses.filter((e) => e.paymentSource === 'PERSONAL').reduce((s, e) => s + Number(e.amount), 0)
                )}
              </p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                Member personal cash/bKash credited to ledger
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Paid By</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{formatDate(e.date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{e.title}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            e.paymentSource === 'MESS_FUND'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {e.paymentSource === 'MESS_FUND' ? 'MESS FUND' : 'PERSONAL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {e.paymentSource === 'PERSONAL' ? e.payerName : 'Mess Cash'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE BAZAR SCHEDULE                                  */}
      {/* ------------------------------------------------------------- */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setScheduleModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              Create Date-Range Bazar Schedule
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Select Start Date, End Date, and Responsible Member.
            </p>

            {schedError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{schedError}</span>
              </div>
            )}

            {schedWarning && (
              <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Schedule Overlap Notice</span>
                </div>
                <p>{schedWarning}</p>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => handleCreateSchedule(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1 font-bold"
                  >
                    Confirm &amp; Proceed
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={schedStartDate}
                    onChange={(e) => setSchedStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={schedEndDate}
                    onChange={(e) => setSchedEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Responsible Member *
                </label>
                <select
                  value={schedMemberId}
                  onChange={(e) => setSchedMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fish & Meat market"
                  value={schedNotes}
                  onChange={(e) => setSchedNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScheduleModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleCreateSchedule(false)}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold"
                >
                  {loading ? 'Saving...' : 'Save Bazar Schedule'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT BAZAR SCHEDULE                                    */}
      {/* ------------------------------------------------------------- */}
      {editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setEditingSchedule(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Edit Bazar Schedule
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Update dates or assign to another active member.
            </p>

            {editSchedError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 text-rose-800 text-xs">
                {editSchedError}
              </div>
            )}

            <form onSubmit={handleUpdateSchedule} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={editSchedStart}
                    onChange={(e) => setEditSchedStart(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">End Date *</label>
                  <input
                    type="date"
                    value={editSchedEnd}
                    onChange={(e) => setEditSchedEnd(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Responsible Member *</label>
                <select
                  value={editSchedMemberId}
                  onChange={(e) => setEditSchedMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Notes</label>
                <input
                  type="text"
                  value={editSchedNotes}
                  onChange={(e) => setEditSchedNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setEditingSchedule(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold">
                  {loading ? 'Saving...' : 'Update Schedule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE SCHEDULE CONFIRMATION                          */}
      {/* ------------------------------------------------------------- */}
      {deletingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              Delete Bazar Schedule?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to remove {deletingSchedule.memberName}&apos;s schedule for{' '}
              <strong className="text-slate-800 dark:text-slate-200">{deletingSchedule.formattedRange}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeletingSchedule(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteSchedule}
                disabled={loading}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {loading ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD BAZAR EXPENSE                                      */}
      {/* ------------------------------------------------------------- */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setExpenseModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Add Bazar Expense
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Record a groceries purchase transaction.
            </p>

            {error && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 text-rose-800 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Amount (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Item / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Rice 25kg, Vegetables, Rui Fish"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Payment Source</label>
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option value="MESS_FUND">Mess Common Fund</option>
                    <option value="PERSONAL">Personal Member Pocket</option>
                  </select>
                </div>
              </div>

              {paymentSource === 'PERSONAL' && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Purchaser Member *</label>
                  <select
                    value={payerMemberId}
                    onChange={(e) => setPayerMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setExpenseModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                  {loading ? 'Saving...' : 'Save Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT BAZAR EXPENSE                                     */}
      {/* ------------------------------------------------------------- */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setEditingExpense(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Edit Bazar Expense
            </h3>

            {editError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 text-rose-800 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditExpenseSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Amount (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Title *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Payment Source</label>
                  <select
                    value={editPaymentSource}
                    onChange={(e) => setEditPaymentSource(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option value="MESS_FUND">Mess Common Fund</option>
                    <option value="PERSONAL">Personal Member Pocket</option>
                  </select>
                </div>
              </div>

              {editPaymentSource === 'PERSONAL' && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Purchaser Member *</label>
                  <select
                    value={editPayerMemberId}
                    onChange={(e) => setEditPayerMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setEditingExpense(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                  {loading ? 'Saving...' : 'Update Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
