'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  FileText,
  DollarSign,
  Utensils,
  Wallet,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToExcel, exportToCsv } from '@/lib/export/excel-export';

interface ReportsData {
  year: number;
  month: number;
  mealsData: Array<{ date: string; member: string; bf: number; ln: number; dn: number; total: number }>;
  monthlyMealsSummary: Array<{ member: string; totalMeals: number; mealCost: number }>;
  bazarData: Array<{ date: string; item: string; category: string; amount: number; source: string; payer: string }>;
  expensesData: Array<{ date: string; title: string; category: string; type: string; amount: number }>;
  depositsData: Array<{ date: string; member: string; method: string; tx: string; amount: number }>;
  duesAdvancesData: Array<{ member: string; balance: number; status: string; advance: number; due: number }>;
  categoryExpenses: Array<{ category: string; amount: number }>;
  closingStatement: {
    totalMeals: number;
    totalBazar: number;
    mealRate: number;
    totalDeposits: number;
    totalOther: number;
    members: Array<{ member: string; meals: number; mealCost: number; otherCost: number; deposits: number; balance: number }>;
  };
}

export function ReportsClient({ data }: { data: ReportsData }) {
  const [activeTab, setActiveTab] = useState<'closing' | 'meals' | 'bazar' | 'deposits' | 'dues' | 'categories'>('closing');

  const monthName = new Date(data.year, data.month - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const handleExportExcel = () => {
    if (activeTab === 'closing') {
      const rows = data.closingStatement.members.map((m) => ({
        'Member Name': m.member,
        'Meals Consumed': m.meals,
        'Meal Cost (৳)': m.mealCost,
        'Other Expenses (৳)': m.otherCost,
        'Deposits Paid (৳)': m.deposits,
        'Final Balance (৳)': m.balance,
      }));
      exportToExcel(`MessMate_Closing_${data.year}_${data.month}`, [{ name: 'Closing Statement', data: rows }]);
    } else if (activeTab === 'meals') {
      exportToExcel(`MessMate_Meals_${data.year}_${data.month}`, [
        { name: 'Monthly Meals Summary', data: data.monthlyMealsSummary as any },
        { name: 'Daily Meal Logs', data: data.mealsData as any },
      ]);
    } else if (activeTab === 'bazar') {
      exportToExcel(`MessMate_Bazar_${data.year}_${data.month}`, [{ name: 'Bazar Expenses', data: data.bazarData as any }]);
    } else if (activeTab === 'deposits') {
      exportToExcel(`MessMate_Deposits_${data.year}_${data.month}`, [{ name: 'Deposits', data: data.depositsData as any }]);
    } else if (activeTab === 'dues') {
      exportToExcel(`MessMate_Dues_Advances_${data.year}_${data.month}`, [{ name: 'Dues & Advances', data: data.duesAdvancesData as any }]);
    } else if (activeTab === 'categories') {
      exportToExcel(`MessMate_Categories_${data.year}_${data.month}`, [{ name: 'Category Breakdown', data: data.categoryExpenses as any }]);
    }
  };

  const handleExportCsv = () => {
    let rows: Record<string, unknown>[] = [];
    if (activeTab === 'closing') rows = data.closingStatement.members as any;
    else if (activeTab === 'meals') rows = data.monthlyMealsSummary as any;
    else if (activeTab === 'bazar') rows = data.bazarData as any;
    else if (activeTab === 'deposits') rows = data.depositsData as any;
    else if (activeTab === 'dues') rows = data.duesAdvancesData as any;
    else if (activeTab === 'categories') rows = data.categoryExpenses as any;

    exportToCsv(`MessMate_${activeTab}_${data.year}_${data.month}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            Financial Reports &amp; Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Export official monthly statements, meal audits, and expense breakdowns for {monthName}
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel (.xlsx)
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="flex items-center gap-1.5">
            <Download className="w-4 h-4 text-blue-600" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="flex items-center gap-1.5">
            <Printer className="w-4 h-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto no-print pb-px">
        {[
          { id: 'closing', label: '1. Monthly Closing Statement' },
          { id: 'meals', label: '2. Monthly Meal Audit' },
          { id: 'bazar', label: '3. Bazar Expense Report' },
          { id: 'deposits', label: '4. Member Deposits Report' },
          { id: 'dues', label: '5. Dues & Advances Report' },
          { id: 'categories', label: '6. Category-wise Breakdown' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Monthly Closing Statement */}
      {activeTab === 'closing' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Official Monthly Closing Statement – {monthName}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Summary: Total Meals {data.closingStatement.totalMeals} • Total Bazar {formatCurrency(data.closingStatement.totalBazar)} • Meal Rate ৳{data.closingStatement.mealRate}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Meals</th>
                    <th className="py-3 px-4">Meal Cost (৳)</th>
                    <th className="py-3 px-4">Other Cost (৳)</th>
                    <th className="py-3 px-4">Deposits (৳)</th>
                    <th className="py-3 px-4 text-right">Closing Balance (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.closingStatement.members.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{m.member}</td>
                      <td className="py-3 px-4">{m.meals}</td>
                      <td className="py-3 px-4 font-medium text-slate-700">{formatCurrency(m.mealCost)}</td>
                      <td className="py-3 px-4 text-slate-600">{formatCurrency(m.otherCost)}</td>
                      <td className="py-3 px-4 text-emerald-600 font-medium">{formatCurrency(m.deposits)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(Math.abs(m.balance))} {m.balance >= 0 ? '(Adv)' : '(Due)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Monthly Meal Audit */}
      {activeTab === 'meals' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">
              Monthly Meal Consumption by Member
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Total Meals Consumed</th>
                    <th className="py-3 px-4 text-right">Calculated Meal Cost (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.monthlyMealsSummary.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-900">{m.member}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{m.totalMeals}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {formatCurrency(m.mealCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Bazar Expense Report */}
      {activeTab === 'bazar' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">
              Bazar Expense Transaction Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Item Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Purchased By</th>
                    <th className="py-3 px-4 text-right">Amount (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.bazarData.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-xs">{b.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{b.item}</td>
                      <td className="py-3 px-4">{b.category}</td>
                      <td className="py-3 px-4 text-xs font-semibold">{b.source}</td>
                      <td className="py-3 px-4 text-xs text-slate-700">{b.payer}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(b.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Member Deposits Report */}
      {activeTab === 'deposits' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">
              Member Fund Deposits Report
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4 text-right">Amount (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.depositsData.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-xs">{d.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{d.member}</td>
                      <td className="py-3 px-4 text-xs font-semibold text-emerald-700">{d.method}</td>
                      <td className="py-3 px-4 font-mono text-xs">{d.tx || '—'}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatCurrency(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Dues & Advances */}
      {activeTab === 'dues' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">
              Member Outstanding Dues &amp; Advances Report
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Advance Amount (৳)</th>
                    <th className="py-3 px-4 text-right">Due Amount (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.duesAdvancesData.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-900">{d.member}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          d.status === 'Advance' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        {d.advance > 0 ? formatCurrency(d.advance) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        {d.due > 0 ? formatCurrency(d.due) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 6: Category-wise Breakdown */}
      {activeTab === 'categories' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">
              Category-wise Expense Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Expense Category</th>
                    <th className="py-3 px-4 text-right">Total Expenditure (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.categoryExpenses.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-900">{c.category}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">{formatCurrency(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
