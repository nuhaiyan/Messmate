'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileCheck2,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  FileSpreadsheet,
  ArrowRight,
  X,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { closeMonthlyAccountsAction, reopenMonthlyAccountsAction } from '@/app/actions/closing';
import { exportToExcel, exportToCsv } from '@/lib/export/excel-export';

interface MemberClosingRow {
  memberId: string;
  fullName: string;
  totalMeals: number;
  mealCost: number;
  sharedExpenseCost: number;
  individualExpenseCost: number;
  totalCost: number;
  deposits: number;
  personalPayments: number;
  openingBalance: number;
  closingBalance: number;
  isAdvance: boolean;
  isDue: boolean;
}

interface ClosingSummary {
  year: number;
  month: number;
  isClosed: boolean;
  closedAt: string | null;
  closedByName: string | null;
  reopenReason: string | null;
  totalMeals: number;
  totalBazarExpense: number;
  mealRate: number;
  totalDeposits: number;
  totalAdditionalExpenses: number;
  totalPersonalPayments: number;
  totalNetAdvances: number;
  totalNetDues: number;
  members: MemberClosingRow[];
}

export function ClosingWorkflowClient({
  summary,
  isManager,
}: {
  summary: ClosingSummary;
  isManager: boolean;
}) {
  const router = useRouter();
  const [closingModalOpen, setClosingModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthName = new Date(summary.year, summary.month - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const handleCloseMonth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await closeMonthlyAccountsAction(summary.year, summary.month, notes);
      if (!res.success) throw new Error(res.error || 'Failed to close month.');
      setClosingModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error closing accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleReopenMonth = async () => {
    if (!reopenReason || reopenReason.trim().length < 5) {
      setError('A mandatory explanation (at least 5 characters) is required to reopen accounts.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await reopenMonthlyAccountsAction(summary.year, summary.month, reopenReason);
      if (!res.success) throw new Error(res.error || 'Failed to reopen month.');
      setReopenModalOpen(false);
      setReopenReason('');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error reopening accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const data = summary.members.map((m) => ({
      'Member Name': m.fullName,
      'Opening Balance (৳)': m.openingBalance,
      'Total Meals': m.totalMeals,
      'Meal Cost (৳)': m.mealCost,
      'Shared Other Cost (৳)': m.sharedExpenseCost,
      'Individual Cost (৳)': m.individualExpenseCost,
      'Total Expense (৳)': m.totalCost,
      'Deposits Paid (৳)': m.deposits,
      'Personal Payments for Mess (৳)': m.personalPayments,
      'Final Balance (৳)': m.closingBalance,
      Status: m.isAdvance ? 'Advance' : m.isDue ? 'Due' : 'Settled',
    }));

    exportToExcel(`MessMate_Closing_Statement_${summary.year}_${summary.month}`, [
      { name: 'Monthly Closing', data },
    ]);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Monthly Accounting Closing – {monthName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Audit, verify and lock accounts for the monthly accounting cycle
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1.5">
            <Printer className="w-4 h-4" />
            Print Report
          </Button>

          {isManager && (
            summary.isClosed ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setReopenModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                Reopen Closed Month
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setClosingModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <Lock className="w-4 h-4" />
                Close &amp; Lock Month
              </Button>
            )
          )}
        </div>
      </div>

      {/* Status Notice */}
      {summary.isClosed ? (
        <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-900 text-white border border-slate-800 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">This accounting period is CLOSED and locked</p>
              <p className="text-xs text-slate-400">
                Closed at {new Date(summary.closedAt || '').toLocaleString('en-GB')} • All edits are disabled to maintain historical consistency.
              </p>
            </div>
          </div>
          <Badge variant="success" className="px-3 py-1 text-xs">
            Snapshot Verified
          </Badge>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Monthly Accounts are currently OPEN</p>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Review calculation preview below. When all members agree, click &quot;Close &amp; Lock Month&quot; to carry forward balances.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Meals</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{summary.totalMeals}</p>
        </Card>
        <Card className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Bazar</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(summary.totalBazarExpense)}</p>
        </Card>
        <Card className="p-4 bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Final Meal Rate</p>
          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">৳{summary.mealRate}</p>
        </Card>
        <Card className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Other Fixed Costs</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(summary.totalAdditionalExpenses)}</p>
        </Card>
      </div>

      {/* Member-Wise Breakdown Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Member-wise Closing Statement
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Individual Final Balance = Opening Bal + Deposits + Personal Payments - (Meal Cost + Other Costs)
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Opening Bal</th>
                  <th className="py-3 px-4">Meals</th>
                  <th className="py-3 px-4">Meal Cost</th>
                  <th className="py-3 px-4">Other Costs</th>
                  <th className="py-3 px-4">Deposits</th>
                  <th className="py-3 px-4">Personal Paid</th>
                  <th className="py-3 px-4 text-right">Closing Balance</th>
                  <th className="py-3 px-4 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary.members.map((m) => {
                  const otherCost = m.sharedExpenseCost + m.individualExpenseCost;
                  return (
                    <tr key={m.memberId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {m.fullName}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {formatCurrency(m.openingBalance)}
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200">{m.totalMeals}</td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(m.mealCost)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {formatCurrency(otherCost)}
                      </td>
                      <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatCurrency(m.deposits)}
                      </td>
                      <td className="py-3 px-4 text-blue-600 dark:text-blue-400 font-medium">
                        {formatCurrency(m.personalPayments)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(Math.abs(m.closingBalance))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {m.isAdvance ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Advance
                          </span>
                        ) : m.isDue ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Close Month Modal */}
      {closingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200">
              <h3 className="font-semibold flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                Finalize &amp; Close Month ({monthName})
              </h3>
              <button onClick={() => setClosingModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs">
                  {error}
                </div>
              )}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-slate-100">Closing Actions Performed:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Total meals ({summary.totalMeals}) and Bazar expenses locked</li>
                  <li>Final meal rate locked at <strong>৳{summary.mealRate}</strong></li>
                  <li>Closing balances will carry forward to next month as opening balances</li>
                  <li>All further edits for this month will be locked to prevent discrepancy</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Closing Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Approved by all roommates at month-end meeting"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" onClick={() => setClosingModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCloseMonth} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                  {loading ? 'Closing...' : 'Confirm & Lock Accounts'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Month Modal */}
      {reopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200">
              <h3 className="font-semibold flex items-center gap-2">
                <Unlock className="w-5 h-5 text-rose-700 dark:text-rose-400" />
                Reopen Closed Month ({monthName})
              </h3>
              <button onClick={() => setReopenModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs">
                  {error}
                </div>
              )}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold">⚠️ Sensitive Financial Action:</p>
                <p className="mt-0.5">
                  Reopening a closed month unlocks meal entries, expenses, and deposits for editing.
                  A <strong>mandatory reason</strong> is required and will be permanently recorded in the immutable audit trail.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory Reopening Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Correcting omitted late deposit of ৳2,000 for member Shakil"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" onClick={() => setReopenModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleReopenMonth} disabled={loading}>
                  {loading ? 'Reopening...' : 'Confirm Reopen Month'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
