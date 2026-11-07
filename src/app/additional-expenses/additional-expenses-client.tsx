'use client';

import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Users,
  User,
  AlertCircle,
  X,
  Info,
  Building,
  Wifi,
  Zap,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  addAdditionalExpenseAction,
  updateAdditionalExpenseAction,
  deleteAdditionalExpenseAction,
} from '@/app/actions/additional-expenses';

interface ExpenseItem {
  id: string;
  date: string | Date;
  title: string;
  amount: number;
  category: string;
  expenseType: string;
  allocationMethod: string | null;
  targetMemberId: string | null;
  targetMemberName: string | null;
  description: string | null;
}

interface MemberOption {
  id: string;
  fullName: string;
}

export function AdditionalExpensesClient({
  expenses,
  members,
  isManager,
  isClosed,
}: {
  expenses: ExpenseItem[];
  members: MemberOption[];
  isManager: boolean;
  isClosed: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Cook / Maid Salary');
  const [expenseType, setExpenseType] = useState<'SHARED' | 'INDIVIDUAL'>('SHARED');
  const [allocationMethod, setAllocationMethod] = useState<'EQUAL' | 'PROPORTIONAL'>('EQUAL');
  const [targetMemberId, setTargetMemberId] = useState(members[0]?.id || '');
  const [description, setDescription] = useState('');

  // Edit Form states
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('Cook / Maid Salary');
  const [editExpenseType, setEditExpenseType] = useState<'SHARED' | 'INDIVIDUAL'>('SHARED');
  const [editAllocationMethod, setEditAllocationMethod] = useState<'EQUAL' | 'PROPORTIONAL'>('EQUAL');
  const [editTargetMemberId, setEditTargetMemberId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const categories = [
    'Cook / Maid Salary',
    'Electricity',
    'Internet / WiFi',
    'Gas Cylinder',
    'Drinking Water',
    'Waste Management',
    'Maintenance',
    'House Rent',
    'Other Fixed Expense',
  ];

  const totalShared = expenses
    .filter((e) => e.expenseType === 'SHARED')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalIndividual = expenses
    .filter((e) => e.expenseType === 'INDIVIDUAL')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid expense amount.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await addAdditionalExpenseAction({
      date,
      title,
      amount: parseFloat(amount),
      category,
      expenseType,
      allocationMethod: expenseType === 'SHARED' ? allocationMethod : undefined,
      targetMemberId: expenseType === 'INDIVIDUAL' ? targetMemberId : undefined,
      description: description || undefined,
    });

    setLoading(false);
    if (res.success) {
      setModalOpen(false);
      setTitle('');
      setAmount('');
      setDescription('');
    } else {
      setError(res.error || 'Failed to record additional expense');
    }
  };

  const handleOpenEditModal = (exp: ExpenseItem) => {
    setEditingExpense(exp);
    setEditDate(new Date(exp.date).toISOString().split('T')[0]);
    setEditTitle(exp.title);
    setEditAmount(exp.amount.toString());
    setEditCategory(exp.category);
    setEditExpenseType((exp.expenseType as 'SHARED' | 'INDIVIDUAL') || 'SHARED');
    setEditAllocationMethod((exp.allocationMethod as any) || 'EQUAL');
    setEditTargetMemberId(exp.targetMemberId || members[0]?.id || '');
    setEditDescription(exp.description || '');
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    if (!editAmount || parseFloat(editAmount) <= 0) {
      setEditError('Please enter a valid expense amount.');
      return;
    }

    setLoading(true);
    setEditError(null);

    const res = await updateAdditionalExpenseAction(editingExpense.id, {
      date: editDate,
      title: editTitle,
      amount: parseFloat(editAmount),
      category: editCategory,
      expenseType: editExpenseType,
      allocationMethod: editExpenseType === 'SHARED' ? editAllocationMethod : undefined,
      targetMemberId: editExpenseType === 'INDIVIDUAL' ? editTargetMemberId : undefined,
      description: editDescription || undefined,
    });

    setLoading(false);
    if (res.success) {
      setEditingExpense(null);
    } else {
      setEditError(res.error || 'Failed to update expense record.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this additional expense entry?')) return;
    await deleteAdditionalExpenseAction(id);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Fixed &amp; Additional Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage utilities, house rent, maid/cook salaries, and individual penalties. 
            <strong className="text-amber-600 dark:text-amber-400 ml-1">Excluded from the meal rate</strong>.
          </p>
        </div>

        {isManager && !isClosed && (
          <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white shrink-0">
            <Plus className="w-4 h-4" />
            <span>Add Additional Expense</span>
          </Button>
        )}
      </div>

      {isClosed && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This month is CLOSED and locked. Expenses cannot be added, edited or deleted.</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
            Total Fixed &amp; Additional
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalShared + totalIndividual)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {expenses.length} total entries recorded
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
            Shared Expenses (Split)
          </span>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(totalShared)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Divided equally across active members
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
            Individual Expenses
          </span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalIndividual)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Directly assigned to specific members
          </p>
        </div>
      </div>

      {/* Table Card */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 sm:px-4">Date</th>
                  <th className="py-3 px-3 sm:px-4">Title / Item</th>
                  <th className="py-3 px-3 sm:px-4">Category</th>
                  <th className="py-3 px-3 sm:px-4">Type</th>
                  <th className="py-3 px-3 sm:px-4 hidden sm:table-cell">Distribution Target</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Amount (৳)</th>
                  {isManager && !isClosed && <th className="py-3 px-3 sm:px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={isManager && !isClosed ? 7 : 6} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                      No additional or fixed expenses recorded for this period.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 sm:px-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(exp.date)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {exp.title}
                        {exp.description && (
                          <p className="text-[11px] text-slate-400 font-normal">{exp.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        {exp.expenseType === 'SHARED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Users className="w-3 h-3" /> Shared
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <User className="w-3 h-3" /> Individual
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-xs font-medium text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                        {exp.expenseType === 'SHARED'
                          ? `${exp.allocationMethod || 'EQUAL'} Split`
                          : `Assigned: ${exp.targetMemberName || 'Member'}`}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatCurrency(exp.amount)}
                      </td>
                      {isManager && !isClosed && (
                        <td className="py-3 px-3 sm:px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditModal(exp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                            title="Edit Additional Expense"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Additional Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                Add Additional Expense
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 6000"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cook &amp; Maid Salary for November"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Distribution Type *
                  </label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value as 'SHARED' | 'INDIVIDUAL')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    <option value="SHARED">Shared (Split Among Roommates)</option>
                    <option value="INDIVIDUAL">Individual (Assigned to One Member)</option>
                  </select>
                </div>
              </div>

              {expenseType === 'SHARED' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Allocation Method
                  </label>
                  <select
                    value={allocationMethod}
                    onChange={(e) => setAllocationMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    <option value="EQUAL">Equal Distribution (Default)</option>
                    <option value="PROPORTIONAL">Proportional (Based on Days in Mess)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Member *
                  </label>
                  <select
                    value={targetMemberId}
                    onChange={(e) => setTargetMemberId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Paid via bKash to landlord / maid"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-white">
                  {loading ? 'Saving...' : 'Add Additional Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Additional Expense Modal (Admin / Manager) */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-500" />
                Edit Additional Expense
              </h3>
              <button
                onClick={() => setEditingExpense(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Distribution Type *
                  </label>
                  <select
                    value={editExpenseType}
                    onChange={(e) => setEditExpenseType(e.target.value as 'SHARED' | 'INDIVIDUAL')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    <option value="SHARED">Shared (Split Among Roommates)</option>
                    <option value="INDIVIDUAL">Individual (Assigned to One Member)</option>
                  </select>
                </div>
              </div>

              {editExpenseType === 'SHARED' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Allocation Method
                  </label>
                  <select
                    value={editAllocationMethod}
                    onChange={(e) => setEditAllocationMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    <option value="EQUAL">Equal Distribution (Default)</option>
                    <option value="PROPORTIONAL">Proportional (Based on Days in Mess)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Member *
                  </label>
                  <select
                    value={editTargetMemberId}
                    onChange={(e) => setEditTargetMemberId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingExpense(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-white">
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
