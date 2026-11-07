'use client';

import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  User,
  AlertCircle,
  X,
  FileSpreadsheet,
  CheckCircle,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { addDepositAction, updateDepositAction, deleteDepositAction } from '@/app/actions/deposits';

interface DepositItem {
  id: string;
  memberId: string;
  memberName: string;
  depositDate: string | Date;
  amount: number;
  paymentMethod: string;
  transactionId: string | null;
  notes: string | null;
}

interface MemberOption {
  id: string;
  fullName: string;
}

export function DepositManagementClient({
  deposits,
  members,
  isManager,
  isClosed,
}: {
  deposits: DepositItem[];
  members: MemberOption[];
  isManager: boolean;
  isClosed: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [memberId, setMemberId] = useState(members[0]?.id || '');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'OTHER'>('BKASH');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [editingDeposit, setEditingDeposit] = useState<DepositItem | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'OTHER'>('BKASH');
  const [editTransactionId, setEditTransactionId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const totalCollected = deposits.reduce((sum, d) => sum + Number(d.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid deposit amount.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await addDepositAction({
      memberId,
      depositDate,
      amount: parseFloat(amount),
      paymentMethod,
      transactionId: transactionId || undefined,
      notes: notes || undefined,
    });

    setLoading(false);
    if (res.success) {
      setModalOpen(false);
      setAmount('');
      setTransactionId('');
      setNotes('');
    } else {
      setError(res.error || 'Failed to record deposit');
    }
  };

  const handleOpenEditModal = (d: DepositItem) => {
    setEditingDeposit(d);
    setEditDate(new Date(d.depositDate).toISOString().split('T')[0]);
    setEditAmount(d.amount.toString());
    setEditPaymentMethod((d.paymentMethod as any) || 'BKASH');
    setEditTransactionId(d.transactionId || '');
    setEditNotes(d.notes || '');
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeposit) return;
    if (!editAmount || parseFloat(editAmount) <= 0) {
      setEditError('Please enter a valid deposit amount.');
      return;
    }

    setLoading(true);
    setEditError(null);

    const res = await updateDepositAction(editingDeposit.id, {
      depositDate: editDate,
      amount: parseFloat(editAmount),
      paymentMethod: editPaymentMethod,
      transactionId: editTransactionId || undefined,
      notes: editNotes || undefined,
    });

    setLoading(false);
    if (res.success) {
      setEditingDeposit(null);
    } else {
      setEditError(res.error || 'Failed to update deposit record.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deposit entry?')) return;
    await deleteDepositAction(id);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Member Deposit Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Record member contributions into the common mess fund. Increases member balance without affecting meal rate.
          </p>
        </div>

        {isManager && !isClosed && (
          <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
            <Plus className="w-4 h-4" />
            <span>Record Member Deposit</span>
          </Button>
        )}
      </div>

      {isClosed && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This month is CLOSED and locked. Deposits cannot be added, edited or deleted.</span>
        </div>
      )}

      {/* Summary Total Card */}
      <div className="p-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl text-white shadow-md flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
            Total Fund Deposits Collected
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            {formatCurrency(totalCollected)}
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Contributions across {deposits.length} recorded payments
          </p>
        </div>
        <div className="p-3.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shrink-0">
          <Wallet className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
      </div>

      {/* Deposits Table Card */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 sm:px-4">Date</th>
                  <th className="py-3 px-3 sm:px-4">Member Name</th>
                  <th className="py-3 px-3 sm:px-4">Method</th>
                  <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Transaction ID</th>
                  <th className="py-3 px-3 sm:px-4 hidden sm:table-cell">Notes</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Amount (৳)</th>
                  {isManager && !isClosed && <th className="py-3 px-3 sm:px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deposits.length === 0 ? (
                  <tr>
                    <td colSpan={isManager && !isClosed ? 7 : 6} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                      No deposit records found for this period.
                    </td>
                  </tr>
                ) : (
                  deposits.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 sm:px-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(d.depositDate)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {d.memberName}
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {d.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-xs font-mono text-slate-400 hidden md:table-cell">
                        {d.transactionId || '—'}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {d.notes || 'Monthly advance'}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        +{formatCurrency(d.amount)}
                      </td>
                      {isManager && !isClosed && (
                        <td className="py-3 px-3 sm:px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditModal(d)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                            title="Edit Deposit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Deposit"
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

      {/* Record Deposit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Record Member Deposit
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Depositing Member *
                </label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Deposit Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
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
                    placeholder="e.g. 4000"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="CASH">Cash (Hand-to-hand)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. BK89X721"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. November mess fund deposit"
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
                <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {loading ? 'Saving...' : 'Record Deposit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Deposit Modal (Admin / Manager) */}
      {editingDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Edit Member Deposit
              </h3>
              <button
                onClick={() => setEditingDeposit(null)}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Member
                </label>
                <p className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingDeposit.memberName}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Deposit Date *
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="CASH">Cash (Hand-to-hand)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={editTransactionId}
                    onChange={(e) => setEditTransactionId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingDeposit(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
