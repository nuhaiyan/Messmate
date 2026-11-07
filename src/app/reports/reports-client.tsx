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
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToExcel, exportToCsv } from '@/lib/export/excel-export';
import { useI18n } from '@/lib/i18n/context';

interface ReportsData {
  year: number;
  month: number;
  mealsData: Array<{ date: string; member: string; bf: number; ln: number; dn: number; total: number }>;
  monthlyMealsSummary: Array<{ member: string; totalMeals: number; mealRate: number; mealCost: number }>;
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
    members: Array<{
      member: string;
      meals: number;
      mealRate: number;
      mealCost: number;
      otherCost: number;
      totalCost: number;
      deposits: number;
      balance: number;
      isAdvance?: boolean;
      isDue?: boolean;
    }>;
  };
}

export function ReportsClient({ data }: { data: ReportsData }) {
  const { language, t } = useI18n();
  const [activeTab, setActiveTab] = useState<'closing' | 'meals' | 'bazar' | 'deposits' | 'dues' | 'categories'>('closing');

  const monthName = new Date(data.year, data.month - 1).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handleExportExcel = () => {
    if (activeTab === 'closing') {
      const rows = data.closingStatement.members.map((m) => ({
        'Member Name': m.member,
        'Total Meals': m.meals,
        'Meal Rate (৳)': m.mealRate,
        'Meal Cost (৳)': m.mealCost,
        'Additional Expense (৳)': m.otherCost,
        'Total Cost (৳)': m.totalCost,
        'Deposits Paid (৳)': m.deposits,
        'Due / Advance': m.balance >= 0 ? `${formatCurrency(m.balance)} Advance` : `${formatCurrency(Math.abs(m.balance))} Due`,
      }));
      exportToExcel(`MessMate_Closing_${data.year}_${data.month}`, [{ name: 'Closing Statement', data: rows }]);
    } else if (activeTab === 'meals') {
      const mealRows = data.monthlyMealsSummary.map((m) => ({
        'Member Name': m.member,
        'Total Meals': m.totalMeals,
        'Meal Rate (৳)': m.mealRate,
        'Calculated Meal Cost (৳)': m.mealCost,
      }));
      exportToExcel(`MessMate_Meals_${data.year}_${data.month}`, [
        { name: 'Monthly Meals Summary', data: mealRows as any },
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
    if (activeTab === 'closing') {
      rows = data.closingStatement.members.map((m) => ({
        member: m.member,
        totalMeals: m.meals,
        mealRate: m.mealRate,
        mealCost: m.mealCost,
        additionalExpense: m.otherCost,
        totalCost: m.totalCost,
        deposits: m.deposits,
        closingBalance: m.balance,
        status: m.balance >= 0 ? 'Advance' : 'Due',
      }));
    } else if (activeTab === 'meals') {
      rows = data.monthlyMealsSummary.map((m) => ({
        member: m.member,
        totalMeals: m.totalMeals,
        mealRate: m.mealRate,
        mealCost: m.mealCost,
      }));
    } else if (activeTab === 'bazar') {
      rows = data.bazarData as any;
    } else if (activeTab === 'deposits') {
      rows = data.depositsData as any;
    } else if (activeTab === 'dues') {
      rows = data.duesAdvancesData as any;
    } else if (activeTab === 'categories') {
      rows = data.categoryExpenses as any;
    }

    exportToCsv(`MessMate_${activeTab}_${data.year}_${data.month}`, rows);
  };

  const tabs = [
    { id: 'closing', label: language === 'bn' ? '১. মাসিক ক্লোজিং স্টেটমেন্ট' : '1. Monthly Closing Statement' },
    { id: 'meals', label: language === 'bn' ? '২. মাসিক মিল বিবরণী' : '2. Monthly Meal Audit' },
    { id: 'bazar', label: language === 'bn' ? '৩. বাজার খরচের রিপোর্ট' : '3. Bazar Expense Report' },
    { id: 'deposits', label: language === 'bn' ? '৪. জমা টাকার রিপোর্ট' : '4. Member Deposits Report' },
    { id: 'dues', label: language === 'bn' ? '৫. বকেয়া ও অগ্রিম রিপোর্ট' : '5. Dues & Advances Report' },
    { id: 'categories', label: language === 'bn' ? '৬. খাতভিত্তিক খরচ' : '6. Category-wise Breakdown' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-500" />
            {language === 'bn' ? 'আর্থিক রিপোর্ট ও বিশ্লেষণ' : 'Financial Reports & Analytics'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'bn'
              ? `${monthName}-এর অফিশিয়াল মাসিক স্টেটমেন্ট, মিল অডিট ও খরচের হিসাব বিবরণী ডাউনলোড করুন`
              : `Export official monthly statements, meal audits, and expense breakdowns for ${monthName}`}
          </p>
        </div>

        <div className="flex items-center gap-2 no-print flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex items-center gap-1.5 cursor-pointer">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Excel (.xlsx)</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="flex items-center gap-1.5 cursor-pointer">
            <Download className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="flex items-center gap-1.5 cursor-pointer">
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>{language === 'bn' ? 'প্রিন্ট / PDF' : 'Print / PDF'}</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-print pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-slate-800 shadow-2xs rounded-t-lg font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Monthly Closing Statement */}
      {activeTab === 'closing' && (
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                {language === 'bn'
                  ? `অফিশিয়াল মাসিক ক্লোজিং স্টেটমেন্ট – ${monthName}`
                  : `Official Monthly Closing Statement – ${monthName}`}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                <span>{language === 'bn' ? 'মোট মিল' : 'Total Meals'}: <strong className="text-slate-800 dark:text-slate-200">{data.closingStatement.totalMeals}</strong></span>
                <span>•</span>
                <span>{language === 'bn' ? 'মোট বাজার' : 'Total Bazar'}: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(data.closingStatement.totalBazar)}</strong></span>
                <span>•</span>
                <span className="text-orange-600 dark:text-orange-400 font-bold">
                  {language === 'bn' ? 'মিল রেট' : 'Meal Rate'}: ৳{data.closingStatement.mealRate}
                </span>
                <span>•</span>
                <span>{language === 'bn' ? 'অতিরিক্ত খরচ' : 'Additional'}: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(data.closingStatement.totalOther)}</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                {language === 'bn' ? 'মিল রেট' : 'Meal Rate'}: ৳{data.closingStatement.mealRate}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{language === 'bn' ? 'সদস্যের নাম' : 'Member Name'}</th>
                    <th className="py-3 px-4 text-center">{language === 'bn' ? 'মোট মিল' : 'Total Meals'}</th>
                    <th className="py-3 px-4 text-center text-orange-600 dark:text-orange-400 font-black">
                      {language === 'bn' ? 'মিল রেট' : 'Meal Rate'}
                    </th>
                    <th className="py-3 px-4">{language === 'bn' ? 'মিল খরচ' : 'Meal Cost'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'অতিরিক্ত খরচ' : 'Additional Expense'}</th>
                    <th className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {language === 'bn' ? 'মোট খরচ' : 'Total Cost'}
                    </th>
                    <th className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                      {language === 'bn' ? 'জমা' : 'Deposit'}
                    </th>
                    <th className="py-3 px-4 text-right font-bold">
                      {language === 'bn' ? 'বকেয়া / অগ্রিম' : 'Due / Advance'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.closingStatement.members.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{m.member}</td>
                      <td className="py-3 px-4 text-center font-bold text-orange-600 dark:text-orange-400">{m.meals}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20">
                        ৳{m.mealRate}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{formatCurrency(m.mealCost)}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{formatCurrency(m.otherCost)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{formatCurrency(m.totalCost)}</td>
                      <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(m.deposits)}</td>
                      <td className="py-3 px-4 text-right">
                        {m.balance >= 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            {formatCurrency(m.balance)} {language === 'bn' ? 'অগ্রিম' : 'Adv'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            {formatCurrency(Math.abs(m.balance))} {language === 'bn' ? 'বকেয়া' : 'Due'}
                          </span>
                        )}
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
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>{language === 'bn' ? 'সদস্যভিত্তিক মাসিক মিল বিবরণী' : 'Monthly Meal Consumption by Member'}</span>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-3 py-1 rounded-xl border border-orange-200 dark:border-orange-800">
                {language === 'bn' ? 'মিল রেট' : 'Meal Rate'}: ৳{data.closingStatement.mealRate}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{language === 'bn' ? 'সদস্যের নাম' : 'Member Name'}</th>
                    <th className="py-3 px-4 text-center">{language === 'bn' ? 'মোট মিল' : 'Total Meals Consumed'}</th>
                    <th className="py-3 px-4 text-center text-orange-600 dark:text-orange-400 font-black">
                      {language === 'bn' ? 'মিল রেট' : 'Meal Rate'}
                    </th>
                    <th className="py-3 px-4 text-right font-bold">{language === 'bn' ? 'মিল খরচ' : 'Calculated Meal Cost (৳)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.monthlyMealsSummary.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{m.member}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">{m.totalMeals}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-50/40 dark:bg-orange-950/20">
                        ৳{m.mealRate}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
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
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'bn' ? 'বাজার খরচের তালিকা' : 'Bazar Expense Transaction Log'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'বিবরণ' : 'Item Title'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'পেমেন্ট উৎস' : 'Source'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'ক্রেতা' : 'Purchased By'}</th>
                    <th className="py-3 px-4 text-right">{language === 'bn' ? 'পরিমাণ (৳)' : 'Amount (৳)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.bazarData.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">{b.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{b.item}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{b.category}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          b.source === 'Personal'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}>
                          {b.source}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{b.payer}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-orange-600 dark:text-orange-400">
                        {formatCurrency(b.amount)}
                      </td>
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
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'bn' ? 'সদস্যদের জমা টাকার রিপোর্ট' : 'Member Deposits Audit Report'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'সদস্য' : 'Member'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Method'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'ট্রানজেকশন আইডি' : 'Transaction ID'}</th>
                    <th className="py-3 px-4 text-right">{language === 'bn' ? 'পরিমাণ (৳)' : 'Amount (৳)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.depositsData.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">{d.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{d.member}</td>
                      <td className="py-3 px-4 font-medium text-emerald-600 dark:text-emerald-400">{d.method}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{d.tx || '—'}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(d.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Dues & Advances Report */}
      {activeTab === 'dues' && (
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'bn' ? 'বকেয়া ও অগ্রিম ব্যালেন্স রিপোর্ট' : 'Member Dues & Advances Statement'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{language === 'bn' ? 'সদস্যের নাম' : 'Member Name'}</th>
                    <th className="py-3 px-4 text-center">{language === 'bn' ? 'অবস্থা' : 'Status'}</th>
                    <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                      {language === 'bn' ? 'অগ্রিম টাকা (৳)' : 'Advance (৳)'}
                    </th>
                    <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                      {language === 'bn' ? 'বকেয়া টাকা (৳)' : 'Due (৳)'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.duesAdvancesData.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{d.member}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          d.status === 'Advance'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : d.status === 'Due'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {d.status === 'Advance' ? (language === 'bn' ? 'অগ্রিম' : 'Advance') : d.status === 'Due' ? (language === 'bn' ? 'বকেয়া' : 'Due') : (language === 'bn' ? 'পরিশোধিত' : 'Settled')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {d.advance > 0 ? formatCurrency(d.advance) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
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

      {/* Tab 6: Category Breakdown */}
      {activeTab === 'categories' && (
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'bn' ? 'খাতভিত্তিক ব্যয়ের সারসংক্ষেপ' : 'Category-wise Expenditure Breakdown'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{language === 'bn' ? 'ব্যয়ের খাত' : 'Expense Category'}</th>
                    <th className="py-3 px-4 text-right">{language === 'bn' ? 'মোট ব্যয় (৳)' : 'Total Amount (৳)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.categoryExpenses.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{c.category}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(c.amount)}
                      </td>
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
