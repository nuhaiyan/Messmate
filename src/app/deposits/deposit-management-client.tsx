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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { addDepositAction, deleteDepositAction } from '@/app/actions/deposits';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [memberId, setMemberId] = useState(members[0]?.id || '');
  const [depositDate, setDepositDate] = useState('2026-11-02');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'OTHER'>('BKASH');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  const totalCollected = deposits.reduce((sum, d) => sum + d.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await addDepositAction({
        memberId,
        depositDate,
        amount: parseFloat(amount),
        paymentMethod,
        transactionId: transactionId || undefined,
        notes: notes || undefined,
      });

      if (!res.success) throw new Error(res.error || 'Failed to record deposit.');

      setModalOpen(false);
      setAmount('');
      setTransactionId('');
      setNotes('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error recording deposit.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this deposit record?')) {
      await deleteDepositAction(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Member Deposit Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Record member contributions into the common mess fund. Increases member balance without affecting meal rate.
          </p>
        </div>

        {isManager && !isClosed && (
          <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Record Member Deposit
          </Button>
        )}
      </div>

      {isClosed && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This month is CLOSED and locked. Deposits cannot be added or deleted.</span>
        </div>
      )}

      {/* Summary Total Card */}
      <div className="p-5 bg-linear-to-r from-emerald-900 to-slate-900 rounded-2xl text-white shadow-md flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
            Total Fund Deposits Collected
          </span>
          <h3 className="text-3xl font-extrabold tracking-tight mt-1">
            {formatCurrency(totalCollected)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Contributions across {deposits.length} recorded payments
          </p>
        </div>
        <div className="p-3.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
          <Wallet className="w-7 h-7" />
        </div>
      </div>

      {/* Deposits Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Amount (৳)</th>
                  {isManager && !isClosed && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deposits.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {formatDate(d.depositDate)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {d.memberName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {d.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {d.transactionId || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {d.notes || 'Monthly advance'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      +{formatCurrency(d.amount)}
                    </td>
                    {isManager && !isClosed && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(d.id)}
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

      {/* Record Deposit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                Record Member Deposit
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Depositor Member *
                </label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deposit Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
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
                    placeholder="e.g. 4000"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="CASH">Cash (Hand-to-hand)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. BK89X721"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. November mess fund deposit"
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
                  {loading ? 'Saving...' : 'Record Deposit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
