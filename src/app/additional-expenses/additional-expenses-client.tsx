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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { addAdditionalExpenseAction, deleteAdditionalExpenseAction } from '@/app/actions/additional-expenses';

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

  // Form states
  const [date, setDate] = useState('2026-11-05');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('House Rent');
  const [expenseType, setExpenseType] = useState<'SHARED' | 'INDIVIDUAL'>('SHARED');
  const [allocationMethod, setAllocationMethod] = useState<'EQUAL' | 'CUSTOM' | 'PROPORTIONAL'>('EQUAL');
  const [targetMemberId, setTargetMemberId] = useState(members[0]?.id || '');
  const [description, setDescription] = useState('');

  const categories = [
    'House Rent',
    'Electricity',
    'Gas',
    'Water',
    'Internet',
    'Cleaning',
    'Cook / Maid Salary',
    'Maintenance',
    'Other',
  ];

  const totalAdditional = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await addAdditionalExpenseAction({
        date,
        title,
        amount: parseFloat(amount),
        category,
        expenseType,
        allocationMethod: expenseType === 'SHARED' ? allocationMethod : undefined,
        targetMemberId: expenseType === 'INDIVIDUAL' ? targetMemberId : undefined,
        description,
      });

      if (!res.success) throw new Error(res.error || 'Failed to add additional expense.');

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
    if (confirm('Are you sure you want to delete this additional expense?')) {
      await deleteAdditionalExpenseAction(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Additional Mess Expenses
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Fixed and utility expenses (House Rent, Maid, WiFi, Utilities). Strictly excluded from the meal rate.
          </p>
        </div>

        {isManager && !isClosed && (
          <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Additional Expense
          </Button>
        )}
      </div>

      {/* Accounting Notice Banner */}
      <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Fundamental Accounting Principle:</p>
          <p className="mt-0.5 text-sky-800">
            Additional expenses (e.g., House Rent ৳32,000, Cook salary ৳6,000) are distributed separately among eligible roommates and <strong>must NEVER alter the traditional meal rate</strong> (Total Bazar / Total Meals). They appear separately on each member’s monthly financial ledger.
          </p>
        </div>
      </div>

      {isClosed && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This month is CLOSED and locked. Expenses cannot be added or deleted.</span>
        </div>
      )}

      {/* Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">
            Expenses List ({expenses.length})
          </CardTitle>
          <span className="text-sm font-bold text-slate-900">
            Total Other Expenses: {formatCurrency(totalAdditional)}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Distribution Type</th>
                  <th className="py-3 px-4">Target / Allocation</th>
                  <th className="py-3 px-4 text-right">Amount (৳)</th>
                  {isManager && !isClosed && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
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
                      {exp.expenseType === 'SHARED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Users className="w-3 h-3" /> Shared Mess Expense
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <User className="w-3 h-3" /> Individual Expense
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700">
                      {exp.expenseType === 'SHARED'
                        ? `${exp.allocationMethod || 'EQUAL'} Split`
                        : `Assigned to: ${exp.targetMemberName || 'Member'}`}
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

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Add Additional Expense
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
                    Expense Date *
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
                    placeholder="e.g. 6000"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cook & Maid Salary for November"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
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
                    Distribution Type *
                  </label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value as 'SHARED' | 'INDIVIDUAL')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="SHARED">Shared (Split Among Roommates)</option>
                    <option value="INDIVIDUAL">Individual (Assigned to One Member)</option>
                  </select>
                </div>
              </div>

              {expenseType === 'SHARED' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Allocation Method
                  </label>
                  <select
                    value={allocationMethod}
                    onChange={(e) => setAllocationMethod(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="EQUAL">Equal Distribution (Default)</option>
                    <option value="PROPORTIONAL">Proportional (Based on Days in Mess)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Member *
                  </label>
                  <select
                    value={targetMemberId}
                    onChange={(e) => setTargetMemberId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Paid via bKash to landlord / maid"
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
                  {loading ? 'Saving...' : 'Add Additional Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
