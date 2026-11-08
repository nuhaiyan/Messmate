'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ShieldAlert,
  Wrench,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  X,
  CreditCard,
  FileText,
  Calendar,
  User,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  addFineAction,
  markFineAsPaidAction,
  updateFineAction,
  deleteFineAction,
  addMaintenanceExpenseAction,
  updateMaintenanceExpenseAction,
  deleteMaintenanceExpenseAction,
} from '@/app/actions/fine-fund';

interface FineRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar: string | null;
  memberPhone: string;
  amount: number;
  reason: string;
  fineDate: string;
  isPaid: boolean;
  paidAt: string | null;
  paymentMethod: string;
  transactionId: string | null;
  notes: string | null;
  createdAt: string;
}

interface MaintenanceExpenseRecord {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  expenseDate: string;
  category: string;
  receiptUrl: string | null;
  createdAt: string;
}

interface FineFundTransactionRecord {
  id: string;
  type: string;
  amount: number;
  date: string;
  description: string;
  memberName: string | null;
  fineId: string | null;
  maintenanceExpenseId: string | null;
}

interface FineFundData {
  totalFineCollected: number;
  totalMaintenanceExpenses: number;
  currentFineFundBalance: number;
  outstandingFineAmount: number;
  fines: FineRecord[];
  maintenanceExpenses: MaintenanceExpenseRecord[];
  transactions: FineFundTransactionRecord[];
}

interface MessFundData {
  totalDeposits: number;
  totalOpeningBalance?: number;
  totalOpeningAdvances?: number;
  totalOpeningDues?: number;
  totalSharedExpenses: number;
  totalIndividualExpenses: number;
  totalPersonalPayments: number;
  totalMessFundPayments: number;
  availableMessFund: number;
  totalNetAdvances: number;
  totalNetDues: number;
}

interface MemberOption {
  id: string;
  fullName: string;
}

interface FinanceManagementClientProps {
  fineFund: FineFundData;
  messFund: MessFundData;
  deposits: any[];
  additionalExpenses: any[];
  members: MemberOption[];
  initialTab?: string;
  isManager: boolean;
  currentMonth: number;
  currentYear: number;
}

export function FinanceManagementClient({
  fineFund,
  messFund,
  deposits,
  additionalExpenses,
  members,
  initialTab = 'fine-fund',
  isManager,
  currentMonth,
  currentYear,
}: FinanceManagementClientProps) {
  const [activeTab, setActiveTab] = useState<'fine-fund' | 'mess-fund' | 'deposits' | 'additional'>(
    (initialTab as any) || 'fine-fund'
  );

  const [loading, setLoading] = useState(false);

  // -------------------------------------------------------------
  // FINE MODALS STATE
  // -------------------------------------------------------------
  const [fineModalOpen, setFineModalOpen] = useState(false);
  const [fineMemberId, setFineMemberId] = useState(members[0]?.id || '');
  const [fineAmount, setFineAmount] = useState('');
  const [fineReason, setFineReason] = useState('');
  const [fineDate, setFineDate] = useState(new Date().toISOString().split('T')[0]);
  const [fineIsPaid, setFineIsPaid] = useState(false);
  const [finePayMethod, setFinePayMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
  const [fineTxId, setFineTxId] = useState('');
  const [fineNotes, setFineNotes] = useState('');
  const [fineError, setFineError] = useState<string | null>(null);

  // Mark Paid Modal
  const [payingFine, setPayingFine] = useState<FineRecord | null>(null);
  const [payMethod, setPayMethod] = useState<'CASH' | 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
  const [payTxId, setPayTxId] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // -------------------------------------------------------------
  // MAINTENANCE EXPENSE MODAL STATE
  // -------------------------------------------------------------
  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [maintTitle, setMaintTitle] = useState('');
  const [maintAmount, setMaintAmount] = useState('');
  const [maintDate, setMaintDate] = useState(new Date().toISOString().split('T')[0]);
  const [maintDesc, setMaintDesc] = useState('');
  const [maintError, setMaintError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleAddFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fineAmount || parseFloat(fineAmount) <= 0) {
      setFineError('Please enter a valid fine amount.');
      return;
    }
    if (!fineReason.trim()) {
      setFineError('Fine reason is required.');
      return;
    }

    setLoading(true);
    setFineError(null);

    const res = await addFineAction({
      memberId: fineMemberId,
      amount: parseFloat(fineAmount),
      reason: fineReason.trim(),
      fineDate,
      isPaid: fineIsPaid,
      paymentMethod: fineIsPaid ? finePayMethod : undefined,
      transactionId: fineIsPaid ? fineTxId : undefined,
      notes: fineNotes || undefined,
    });

    setLoading(false);

    if (res.success) {
      setFineModalOpen(false);
      setFineAmount('');
      setFineReason('');
      setFineNotes('');
    } else {
      setFineError(res.error || 'Failed to add fine.');
    }
  };

  const handleMarkFinePaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingFine) return;

    setLoading(true);
    const res = await markFineAsPaidAction({
      fineId: payingFine.id,
      paymentMethod: payMethod,
      transactionId: payTxId || undefined,
      notes: payNotes || undefined,
    });
    setLoading(false);

    if (res.success) {
      setPayingFine(null);
    } else {
      alert(res.error || 'Failed to mark fine as paid.');
    }
  };

  const handleDeleteFine = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fine record?')) return;
    setLoading(true);
    await deleteFineAction(id);
    setLoading(false);
  };

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintAmount || parseFloat(maintAmount) <= 0) {
      setMaintError('Please enter a valid maintenance expense amount.');
      return;
    }
    if (!maintTitle.trim()) {
      setMaintError('Title is required.');
      return;
    }

    setLoading(true);
    setMaintError(null);

    const res = await addMaintenanceExpenseAction({
      title: maintTitle.trim(),
      amount: parseFloat(maintAmount),
      expenseDate: maintDate,
      description: maintDesc || undefined,
    });

    setLoading(false);

    if (res.success) {
      setMaintModalOpen(false);
      setMaintTitle('');
      setMaintAmount('');
      setMaintDesc('');
    } else {
      setMaintError(res.error || 'Failed to create maintenance expense.');
    }
  };

  const handleDeleteMaintenance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this maintenance expense?')) return;
    setLoading(true);
    await deleteMaintenanceExpenseAction(id);
    setLoading(false);
  };

  const unpaidFines = fineFund.fines.filter((f) => !f.isPaid);
  const paidFines = fineFund.fines.filter((f) => f.isPaid);

  return (
    <div className="space-y-6">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-orange-500" />
            Finance &amp; Fund Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Independent Fine Fund, Common Mess Fund, Deposits, Shared Costs, and Ledger Settlements.
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setFineMemberId(members[0]?.id || '');
                setFineAmount('');
                setFineReason('');
                setFineIsPaid(false);
                setFineNotes('');
                setFineError(null);
                setFineModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Charge Member Fine</span>
            </Button>
            <Button
              onClick={() => {
                setMaintTitle('');
                setMaintAmount('');
                setMaintDesc('');
                setMaintError(null);
                setMaintModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Maintenance Expense</span>
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Submodules */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('fine-fund')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'fine-fund'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Fine Fund (জরিমানা তহবিল)</span>
        </button>

        <button
          onClick={() => setActiveTab('mess-fund')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'mess-fund'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Mess Common Fund (মেস ফান্ড)</span>
        </button>

        <button
          onClick={() => setActiveTab('deposits')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'deposits'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Member Deposits ({deposits.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('additional')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'additional'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Additional Expenses ({additionalExpenses.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUBMODULE 1: FINE FUND & MAINTENANCE (FINANCIALLY SEPARATE)   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'fine-fund' && (
        <div className="space-y-6">
          {/* Fine Fund KPI Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat 1: Total Fine Collected */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase block">
                Total Fine Collected (মোট সংগৃহীত জরিমানা)
              </span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(fineFund.totalFineCollected)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {paidFines.length} fines paid by members
              </p>
            </div>

            {/* Stat 2: Total Maintenance Expenses */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase block">
                Maintenance Paid (মেরামত ব্যয়)
              </span>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(fineFund.totalMaintenanceExpenses)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {fineFund.maintenanceExpenses.length} maintenance repairs funded
              </p>
            </div>

            {/* Stat 3: Current Fine Fund Balance */}
            <div className="p-4 bg-orange-50/40 dark:bg-orange-950/20 rounded-2xl border border-orange-200 dark:border-orange-800/60 shadow-2xs">
              <span className="text-xs text-orange-700 dark:text-orange-300 font-bold uppercase block">
                Current Fine Fund Balance (তহবিল উদ্বৃত্ত)
              </span>
              <p className="text-2xl font-extrabold text-orange-900 dark:text-orange-200 mt-1">
                {formatCurrency(fineFund.currentFineFundBalance)}
              </p>
              <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5">
                Formula: Collected Fines − Maintenance Spent
              </p>
            </div>

            {/* Stat 4: Outstanding Unpaid Fines */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase block">
                Outstanding Fines (অনাদায়ী জরিমানা)
              </span>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(fineFund.outstandingFineAmount)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {unpaidFines.length} pending fine collections
              </p>
            </div>
          </div>

          {/* Unpaid Fines Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Unpaid Outstanding Fines ({unpaidFines.length})
              </h3>
              <span className="text-xs text-slate-500">Uncollected fines do NOT count toward fund balance</span>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Reason / Violation</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {unpaidFines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No outstanding unpaid fines. All member fines are cleared!
                      </td>
                    </tr>
                  ) : (
                    unpaidFines.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDate(f.fineDate)}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{f.memberName}</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{f.reason}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-rose-600 dark:text-rose-400">
                          {formatCurrency(f.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isManager && (
                              <Button
                                onClick={() => {
                                  setPayingFine(f);
                                  setPayMethod('CASH');
                                  setPayTxId('');
                                  setPayNotes('');
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 font-bold"
                              >
                                Mark as Paid
                              </Button>
                            )}
                            {isManager && (
                              <button
                                onClick={() => handleDeleteFine(f.id)}
                                title="Delete fine"
                                className="p-1 rounded text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Maintenance Repairs Funded from Fine Fund */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-orange-500" />
                Maintenance Expenses Paid from Fine Fund ({fineFund.maintenanceExpenses.length})
              </h3>
              <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                Total Spent: {formatCurrency(fineFund.totalMaintenanceExpenses)}
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Expense Date</th>
                    <th className="py-2.5 px-3">Title / Repair Work</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Funded By</th>
                    <th className="py-2.5 px-3 text-right">Amount Spent</th>
                    {isManager && <th className="py-2.5 px-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {fineFund.maintenanceExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No maintenance expenses recorded yet.
                      </td>
                    </tr>
                  ) : (
                    fineFund.maintenanceExpenses.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDate(m.expenseDate)}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{m.title}</td>
                        <td className="py-2.5 px-3 text-slate-500">{m.description || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300">
                            Fine Fund
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-rose-600 dark:text-rose-400">
                          {formatCurrency(m.amount)}
                        </td>
                        {isManager && (
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteMaintenance(m.id)}
                              title="Delete Maintenance Entry"
                              className="p-1 rounded text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paid Fines Collection History */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Paid Fine Collection History ({paidFines.length})
            </h3>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Fine Date</th>
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Tx ID / Notes</th>
                    <th className="py-2.5 px-3 text-right">Collected Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paidFines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No fines have been collected yet.
                      </td>
                    </tr>
                  ) : (
                    paidFines.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDate(f.fineDate)}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{f.memberName}</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{f.reason}</td>
                        <td className="py-2.5 px-3 text-slate-500">{f.paymentMethod}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{f.transactionId || f.notes || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(f.amount)}
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

      {/* ------------------------------------------------------------- */}
      {/* SUBMODULE 2: MESS COMMON FUND                                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'mess-fund' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Total Deposits (জমা)</span>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {formatCurrency(messFund.totalDeposits)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {messFund.totalOpeningAdvances && messFund.totalOpeningAdvances > 0
                  ? `Deposits + Opening Balance (${formatCurrency(messFund.totalOpeningAdvances)})`
                  : 'Paid by members into mess account'}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Total Mess Fund Disbursed</span>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(messFund.totalMessFundPayments)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Expended for groceries &amp; bills</p>
            </div>

            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold uppercase block">
                Available Mess Fund Balance
              </span>
              <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1">
                {formatCurrency(messFund.availableMessFund)}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                {messFund.totalOpeningBalance !== undefined && messFund.totalOpeningBalance !== 0
                  ? `Opening (${formatCurrency(messFund.totalOpeningBalance)}) + Deposits − Mess Expenses`
                  : 'Deposits − Mess Fund Expenses'}
              </p>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Fund Allocation Safeguards</h3>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
              <li>Mess Common Fund is mathematically segregated from the Fine Fund.</li>
              <li>Fines collected do NOT alter the mess fund balance or change the Traditional Meal Rate.</li>
              <li>Maintenance repairs are disbursed exclusively from the Fine Fund.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBMODULE 3: DEPOSITS SUMMARY & LINK                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Member Deposits Overview</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total {deposits.length} deposits recorded for month {currentMonth}/{currentYear}.
              </p>
            </div>
            <Link
              href="/deposits"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors"
            >
              <span>Manage Deposits Full Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Tx ID / Notes</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deposits.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 whitespace-nowrap">{d.date}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{d.memberName}</td>
                    <td className="py-2.5 px-3 text-slate-500">{d.method}</td>
                    <td className="py-2.5 px-3 text-slate-400">{d.transactionId || d.notes || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(d.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUBMODULE 4: ADDITIONAL EXPENSES SUMMARY & LINK               */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'additional' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Shared &amp; Fixed Expenses</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Utilities, rent, Wi-Fi, and individual fixed expense distributions.
              </p>
            </div>
            <Link
              href="/additional-expenses"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors"
            >
              <span>Manage Expenses Full Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {additionalExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 whitespace-nowrap">{e.date}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{e.title}</td>
                    <td className="py-2.5 px-3 text-slate-500">{e.category}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {e.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-amber-600 dark:text-amber-400">
                      {formatCurrency(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CHARGE MEMBER FINE                                     */}
      {/* ------------------------------------------------------------- */}
      {fineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setFineModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Charge Fine Against Member
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Member fines are credited to the separate Fine Fund for mess maintenance.
            </p>

            {fineError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 text-rose-800 text-xs">
                {fineError}
              </div>
            )}

            <form onSubmit={handleAddFine} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Select Member *</label>
                <select
                  value={fineMemberId}
                  onChange={(e) => setFineMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Fine Amount (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 100"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Applicable Date *</label>
                  <input
                    type="date"
                    value={fineDate}
                    onChange={(e) => setFineDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Fine Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Missed scheduled bazar date, Mess rules violation"
                  value={fineReason}
                  onChange={(e) => setFineReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fineIsPaid"
                  checked={fineIsPaid}
                  onChange={(e) => setFineIsPaid(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <label htmlFor="fineIsPaid" className="text-xs font-semibold cursor-pointer">
                  Mark as Paid Immediately
                </label>
              </div>

              {fineIsPaid && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Payment Method</label>
                    <select
                      value={finePayMethod}
                      onChange={(e) => setFinePayMethod(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    >
                      <option value="CASH">Cash</option>
                      <option value="BKASH">bKash</option>
                      <option value="NAGAD">Nagad</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Transaction ID (Optional)</label>
                    <input
                      type="text"
                      value={fineTxId}
                      onChange={(e) => setFineTxId(e.target.value)}
                      placeholder="e.g. 9J4K2..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={fineNotes}
                  onChange={(e) => setFineNotes(e.target.value)}
                  placeholder="Additional context..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setFineModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold">
                  {loading ? 'Recording...' : 'Charge Fine'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MARK FINE AS PAID                                      */}
      {/* ------------------------------------------------------------- */}
      {payingFine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setPayingFine(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Collect Member Fine
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Collecting <strong className="text-emerald-600">{formatCurrency(payingFine.amount)}</strong> from{' '}
              <strong className="text-slate-900 dark:text-slate-100">{payingFine.memberName}</strong>.
            </p>

            <form onSubmit={handleMarkFinePaid} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="CASH">Cash</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Transaction ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 9A4KD..."
                  value={payTxId}
                  onChange={(e) => setPayTxId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Receipt Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Notes..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setPayingFine(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                  {loading ? 'Processing...' : 'Confirm Paid'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD MAINTENANCE EXPENSE (FROM FINE FUND)               */}
      {/* ------------------------------------------------------------- */}
      {maintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setMaintModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-500" />
              Pay Maintenance Expense from Fine Fund
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Expenses recorded here are deducted strictly from the Fine Fund balance.
            </p>

            {maintError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 text-rose-800 text-xs">
                {maintError}
              </div>
            )}

            <form onSubmit={handleAddMaintenance} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Repair Title / Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Kitchen tap replacement, Bathroom light repair"
                  value={maintTitle}
                  onChange={(e) => setMaintTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Amount Spent (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={maintAmount}
                    onChange={(e) => setMaintAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Expense Date *</label>
                  <input
                    type="date"
                    value={maintDate}
                    onChange={(e) => setMaintDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="Plumber details, receipt note..."
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setMaintModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold">
                  {loading ? 'Saving...' : 'Record Maintenance Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
