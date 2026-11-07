'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpenText,
  Calendar,
  User,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Wallet,
  Receipt,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToExcel } from '@/lib/export/excel-export';

interface LedgerRow {
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface MemberOption {
  id: string;
  fullName: string;
}

export function MemberLedgerClient({
  selectedMemberId,
  selectedMemberName,
  members,
  isManager,
  ledgerRows,
  currentBalance,
}: {
  selectedMemberId: string;
  selectedMemberName: string;
  members: MemberOption[];
  isManager: boolean;
  ledgerRows: LedgerRow[];
  currentBalance: number;
}) {
  const router = useRouter();

  const handleMemberChange = (id: string) => {
    router.push(`/my-ledger?memberId=${id}`);
  };

  const handleExportExcel = () => {
    const data = ledgerRows.map((r) => ({
      Date: r.date,
      Type: r.type,
      Description: r.description,
      'Debit (-)': r.debit,
      'Credit (+)': r.credit,
      'Running Balance': r.balance,
    }));
    exportToExcel(`MessMate_Ledger_${selectedMemberName.replace(/\s+/g, '_')}`, [
      { name: 'Financial Ledger', data },
    ]);
  };

  const isAdvance = currentBalance >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpenText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Financial Statement &amp; Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Chronological audit of deposits, bazar credits, meal deductions, and running balance for <strong>{selectedMemberName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          {isManager && members.length > 1 && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <select
                value={selectedMemberId}
                onChange={(e) => handleMemberChange(e.target.value)}
                aria-label="Select Member"
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent outline-hidden cursor-pointer"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id} className="dark:bg-slate-900 dark:text-slate-100">
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="flex items-center gap-1.5">
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Balance Summary Card */}
      <div className="p-6 rounded-2xl bg-linear-to-r from-slate-900 to-slate-800 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Current Net Balance
          </span>
          <div className="flex items-baseline gap-3 mt-1">
            <h2 className="text-3xl font-extrabold tracking-tight">
              {formatCurrency(Math.abs(currentBalance))}
            </h2>
            {isAdvance ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ArrowUpRight className="w-3.5 h-3.5" /> Advance (Surplus Funds)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <ArrowDownRight className="w-3.5 h-3.5" /> Due (Outstanding Owed)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Statement for {selectedMemberName} • Calculated with decimal arithmetic
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-center min-w-[120px]">
            <p className="text-[11px] text-slate-400 font-medium">Total Ledger Rows</p>
            <p className="text-lg font-bold text-slate-200 mt-0.5">{ledgerRows.length}</p>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Chronological Transaction Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Debit (-)</th>
                  <th className="py-3 px-4 text-right">Credit (+)</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ledgerRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {row.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">
                      {row.description}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-rose-600 dark:text-rose-400">
                      {row.debit > 0 ? `-${formatCurrency(row.debit)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.credit > 0 ? `+${formatCurrency(row.credit)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(Math.abs(row.balance))}
                      <span className="text-[10px] font-medium ml-1 text-slate-400">
                        {row.balance >= 0 ? '(Adv)' : '(Due)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
