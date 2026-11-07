'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { useI18n } from '@/lib/i18n/context';

interface DashboardChartsProps {
  dailyMealsData: Array<{ date: string; meals: number; breakfast: number; lunch: number; dinner: number }>;
  bazarExpensesData: Array<{ date: string; amount: number; category: string }>;
  memberMealsData: Array<{ name: string; meals: number }>;
  depositVsExpense: {
    deposits: number;
    bazar: number;
    additional: number;
  };
}

export function DashboardCharts({
  dailyMealsData,
  bazarExpensesData,
  memberMealsData,
  depositVsExpense,
}: DashboardChartsProps) {
  const { language, t } = useI18n();

  const expenseBreakdown = [
    { name: language === 'bn' ? 'বাজার খরচ' : 'Bazar Expenses', value: depositVsExpense.bazar, color: '#f97316' },
    { name: language === 'bn' ? 'ইউটিলিটি ও অন্যান্য' : 'Fixed / Utilities', value: depositVsExpense.additional, color: '#38bdf8' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 my-6">
      {/* 1. Daily Meal Consumption */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900 transition-all hover:shadow-md min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>{t.dashboard.mealChartTitle}</span>
            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
              {language === 'bn' ? 'দৈনিক ট্রেন্ড' : 'Daily Trend'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyMealsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mealOrangeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', border: '1px solid #334155', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold', color: '#fb923c' }}
                />
                <Area
                  type="monotone"
                  dataKey="meals"
                  name={language === 'bn' ? 'মোট মিল' : 'Total Meals'}
                  stroke="#ea580c"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#mealOrangeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Daily Bazar Expenses */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900 transition-all hover:shadow-md min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>{t.dashboard.bazarChartTitle}</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              {language === 'bn' ? 'মিল রেটের ভিত্তি' : 'Meal Rate Basis'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bazarExpensesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: unknown) => {
                    const num = typeof val === 'number' ? val : Number(val) || 0;
                    return [`৳${num.toLocaleString('en-BD')}`, language === 'bn' ? 'বাজার খরচ' : 'Bazar Expense'];
                  }}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', border: '1px solid #334155', color: '#fff' }}
                />
                <Bar dataKey="amount" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 3. Member-wise Meal Comparison - Display all members */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900 transition-all hover:shadow-md min-w-0 overflow-hidden">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            {t.dashboard.memberMealComparison}
          </CardTitle>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60">
            {language === 'bn' ? `${memberMealsData.length} জন সদস্য` : `${memberMealsData.length} Members`}
          </span>
        </CardHeader>
        <CardContent>
          <div
            style={{ height: `${Math.max(280, memberMealsData.length * 36)}px` }}
            className="w-full max-h-[520px] overflow-y-auto no-scrollbar"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={memberMealsData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                barSize={18}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis type="number" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  width={90}
                  interval={0}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                />
                <Tooltip
                  formatter={(val: unknown) => {
                    const num = typeof val === 'number' ? val : Number(val) || 0;
                    return [`${num} ${language === 'bn' ? 'টি মিল' : 'meals'}`, language === 'bn' ? 'মিল সংখ্যা' : 'Meals'];
                  }}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', border: '1px solid #334155', color: '#fff' }}
                />
                <Bar dataKey="meals" name={language === 'bn' ? 'মিল সংখ্যা' : 'Meals'} fill="#fb923c" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 4. Deposits vs Total Expenses */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900 transition-all hover:shadow-md min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            {t.dashboard.depositVsExpense}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full flex items-center justify-around">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => {
                      const num = typeof val === 'number' ? val : Number(val) || 0;
                      return `৳${num.toLocaleString('en-BD')}`;
                    }}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', border: '1px solid #334155', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-3.5 pl-4 border-l border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {language === 'bn' ? 'মোট জমা টাকা' : 'Total Deposits'}
                </p>
                <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  ৳{depositVsExpense.deposits.toLocaleString('en-BD')}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'bn' ? 'বাজার খরচ' : 'Bazar Expense'}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  ৳{depositVsExpense.bazar.toLocaleString('en-BD')}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'bn' ? 'ইউটিলিটি ও অন্যান্য' : 'Fixed & Utilities'}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  ৳{depositVsExpense.additional.toLocaleString('en-BD')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
