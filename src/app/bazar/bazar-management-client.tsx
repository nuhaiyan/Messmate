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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { addBazarExpenseAction, updateBazarExpenseAction, deleteBazarExpenseAction } from '@/app/actions/bazar';

interface BazarItem {
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

interface MemberOption {
  id: string;
  fullName: string;
}

export function BazarManagementClient({
  expenses,
  members,
  isManager,
  isClosed,
}: {
  expenses: BazarItem[];
  members: MemberOption[];
  isManager: boolean;
  isClosed: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [payerFilter, setPayerFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Add Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Grocery');
  const [paymentSource, setPaymentSource] = useState<'PERSONAL' | 'MESS_FUND'>('MESS_FUND');
  const [payerMemberId, setPayerMemberId] = useState(members[0]?.id || '');
  const [description, setDescription] = useState('');

  // Edit Modal State
  const [editingExpense, setEditingExpense] = useState<BazarItem | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('Grocery');
  const [editPaymentSource, setEditPaymentSource] = useState<'PERSONAL' | 'MESS_FUND'>('MESS_FUND');
  const [editPayerMemberId, setEditPayerMemberId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

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

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat = categoryFilter === 'ALL' || e.category === categoryFilter;
      const matchPayer =
        payerFilter === 'ALL' ||
        (payerFilter === 'MESS_FUND' && e.paymentSource === 'MESS_FUND') ||
        (payerFilter === 'PERSONAL' && e.paymentSource === 'PERSONAL') ||
        e.payerMemberId === payerFilter;
      const matchSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchPayer && matchSearch;
    });
  }, [expenses, categoryFilter, payerFilter, search]);

  const totalFilteredAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [filteredExpenses]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
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
      setModalOpen(false);
      setTitle('');
      setAmount('');
      setDescription('');
    } else {
      setError(res.error || 'Failed to add expense');
    }
  };

  const handleOpenEditModal = (exp: BazarItem) => {
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

  const handleEditSubmit = async (e: React.FormEvent) => {
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
      setEditError(res.error || 'Failed to update expense.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bazar expense record?')) return;
    await deleteBazarExpenseAction(id);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Bazar Expense Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Record, verify, and categorize daily bazar purchases. These expenses directly determine the Traditional Meal Rate.
          </p>
        </div>

        {isManager && !isClosed && (
          <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white shrink-0">
            <Plus className="w-4 h-4" />
            <span>Add Bazar Purchase</span>
          </Button>
        )}
      </div>

      {isClosed && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This month is CLOSED and locked. Bazar expenses cannot be added, edited, or deleted.</span>
        </div>
      )}

      {/* Filter and Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase">
            Total Filtered Bazar
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalFilteredAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {filteredExpenses.length} purchases displayed
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase">
            Paid from Mess Fund
          </span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(
              filteredExpenses
                .filter((e) => e.paymentSource === 'MESS_FUND')
                .reduce((s, e) => s + Number(e.amount), 0)
            )}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Common fund payment</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase">
            Personal Member Payments
          </span>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(
              filteredExpenses
                .filter((e) => e.paymentSource === 'PERSONAL')
                .reduce((s, e) => s + Number(e.amount), 0)
            )}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Credited to purchaser accounts</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-emerald-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Payer Filter */}
          <select
            value={payerFilter}
            onChange={(e) => setPayerFilter(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-emerald-500"
          >
            <option value="ALL">All Payment Sources</option>
            <option value="MESS_FUND">Mess Fund Only</option>
            <option value="PERSONAL">Personal Paid Only</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>Paid by {m.fullName}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="w-full md:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-emerald-500"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 sm:px-4">Date</th>
                  <th className="py-3 px-3 sm:px-4">Item Details</th>
                  <th className="py-3 px-3 sm:px-4">Category</th>
                  <th className="py-3 px-3 sm:px-4">Paid By</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Amount (৳)</th>
                  {isManager && !isClosed && <th className="py-3 px-3 sm:px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={isManager && !isClosed ? 6 : 5} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                      No bazar expenses match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
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
                      <td className="py-3 px-3 sm:px-4 text-xs">
                        {exp.paymentSource === 'PERSONAL' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <User className="w-3 h-3" /> Paid by {exp.payerName || 'Member'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Wallet className="w-3 h-3" /> Mess Fund
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatCurrency(exp.amount)}
                      </td>
                      {isManager && !isClosed && (
                        <td className="py-3 px-3 sm:px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditModal(exp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors cursor-pointer"
                            title="Edit Bazar Purchase"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Bazar Purchase"
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

      {/* Add Bazar Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-orange-500" />
                Add Bazar Purchase
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
                    Purchase Date *
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
                    placeholder="e.g. 1500"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Description *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Beef 4kg and Spices"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expense Category *
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
                    Payment Source *
                  </label>
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value as 'PERSONAL' | 'MESS_FUND')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    <option value="MESS_FUND">Mess Fund (Common Collection)</option>
                    <option value="PERSONAL">Personal Payment (Member Pocket)</option>
                  </select>
                </div>
              </div>

              {/* If Personal Payment */}
              {paymentSource === 'PERSONAL' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                    Purchased By (Member to be credited) *
                  </label>
                  <select
                    value={payerMemberId}
                    onChange={(e) => setPayerMemberId(e.target.value)}
                    className="w-full rounded-xl border border-blue-300 dark:border-blue-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-blue-500"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1">
                    ℹ️ Important: This member’s account will be credited for ৳{amount || '0'}, preventing double accounting.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional grocery specifications or receipt reference..."
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
                <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
                  {loading ? 'Saving...' : 'Add Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bazar Expense Modal (Admin / Manager) */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-orange-500" />
                Edit Bazar Purchase
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
                    Purchase Date *
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
                  Item Description *
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
                    Expense Category *
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
                    Payment Source *
                  </label>
                  <select
                    value={editPaymentSource}
                    onChange={(e) => setEditPaymentSource(e.target.value as 'PERSONAL' | 'MESS_FUND')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    <option value="MESS_FUND">Mess Fund (Common Collection)</option>
                    <option value="PERSONAL">Personal Payment (Member Pocket)</option>
                  </select>
                </div>
              </div>

              {editPaymentSource === 'PERSONAL' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                    Purchased By (Member to be credited) *
                  </label>
                  <select
                    value={editPayerMemberId}
                    onChange={(e) => setEditPayerMemberId(e.target.value)}
                    className="w-full rounded-xl border border-blue-300 dark:border-blue-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-blue-500"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Details (Optional)
                </label>
                <textarea
                  rows={2}
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
                <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
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
