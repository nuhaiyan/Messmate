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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { addBazarExpenseAction, deleteBazarExpenseAction } from '@/app/actions/bazar';

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

  // Form states
  const [date, setDate] = useState('2026-11-07');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Meat');
  const [paymentSource, setPaymentSource] = useState<'PERSONAL' | 'MESS_FUND'>('MESS_FUND');
  const [payerMemberId, setPayerMemberId] = useState(members[0]?.id || '');
  const [description, setDescription] = useState('');

  const categories = [
    'Rice',
    'Vegetables',
    'Fish',
    'Meat',
    'Chicken',
    'Eggs',
    'Grocery',
    'Oil',
    'Spices',
    'Milk',
    'Other',
  ];

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (payerFilter !== 'ALL') {
        if (payerFilter === 'MESS_FUND' && item.paymentSource !== 'MESS_FUND') return false;
        if (payerFilter !== 'MESS_FUND' && item.payerMemberId !== payerFilter) return false;
      }
      if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [expenses, categoryFilter, payerFilter, search]);

  const totalBazar = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await addBazarExpenseAction({
        date,
        title,
        amount: parseFloat(amount),
        category,
        paymentSource,
        payerMemberId: paymentSource === 'PERSONAL' ? payerMemberId : undefined,
        description,
      });

      if (!res.success) throw new Error(res.error || 'Failed to add expense.');

      setModalOpen(false);
      setTitle('');
      setAmount('');
      setDescription('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error adding expense.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this bazar expense?')) {
      await deleteBazarExpenseAction(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bazar Expense Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track daily grocery and market purchases contributing directly to the traditional meal rate
          </p>
        </div>

        {isManager && !isClosed && (
          <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Bazar Expense
          </Button>
        )}
      </div>

      {isClosed && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This month is CLOSED and locked. Expenses cannot be added or deleted.</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Search Description</label>
              <input
                type="text"
                placeholder="Search item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Category Filter</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Source</label>
              <select
                value={payerFilter}
                onChange={(e) => setPayerFilter(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Sources</option>
                <option value="MESS_FUND">Mess Common Fund</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>Paid by {m.fullName}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                <span className="font-semibold text-emerald-800">Filtered Total:</span>
                <span className="font-bold text-emerald-900 text-sm">{formatCurrency(totalBazar)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payment Source</th>
                  <th className="py-3 px-4 text-right">Amount (৳)</th>
                  {isManager && !isClosed && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {exp.title}
                      {exp.description && (
                        <p className="text-xs text-slate-400 font-normal">{exp.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {exp.paymentSource === 'PERSONAL' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <User className="w-3 h-3" /> Paid by {exp.payerName || 'Member'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Wallet className="w-3 h-3" /> Mess Fund
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(exp.amount)}
                    </td>
                    {isManager && !isClosed && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Bazar Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                Add Bazar Expense
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Description *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Beef 4kg and Spices"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Source *
                  </label>
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value as 'PERSONAL' | 'MESS_FUND')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="MESS_FUND">Mess Fund (Common Collection)</option>
                    <option value="PERSONAL">Personal Payment (Member Pocket)</option>
                  </select>
                </div>
              </div>

              {/* If Personal Payment, select which member paid from their pocket */}
              {paymentSource === 'PERSONAL' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-xs font-semibold text-blue-900 mb-1">
                    Purchased By (Member to be credited) *
                  </label>
                  <select
                    value={payerMemberId}
                    onChange={(e) => setPayerMemberId(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-blue-700 mt-1">
                    ℹ️ Important: This member’s account will be credited for ৳{amount || '0'}, preventing double accounting.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional grocery specifications or receipt reference..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Add Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
