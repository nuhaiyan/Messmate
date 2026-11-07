'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Wallet,
  History,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Megaphone,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';

export interface SummaryMemberItem {
  memberId: string;
  fullName: string;
  totalMeals: number;
  mealCost: number;
  otherCosts: number;
  deposits: number;
  personalPayments: number;
  closingBalance: number;
  isAdvance: boolean;
  isDue: boolean;
}

export interface SummaryBazarItem {
  id: string;
  title: string;
  date: string;
  category: string;
  amount: number;
  paymentSource: string;
  payerName: string | null;
}

export interface SummaryDepositItem {
  id: string;
  memberName: string;
  depositDate: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string | null;
}

export interface SummaryActivityItem {
  id: string;
  userName: string;
  action: string;
  reason?: string | null;
  createdAt: string;
}

export interface SummaryNoticeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  publishedAt: string;
}

export interface SummaryBazarScheduleItem {
  id: string;
  memberName: string;
  memberPhone?: string | null;
  startDate: string;
  endDate: string;
  formattedRange: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
}

interface DashboardSummaryTablesProps {
  memberList: SummaryMemberItem[];
  totalNetAdvances: number;
  totalNetDues: number;
  recentBazar: SummaryBazarItem[];
  recentDeposits: SummaryDepositItem[];
  recentActivities: SummaryActivityItem[];
  recentNotices: SummaryNoticeItem[];
  upcomingBazarSchedules?: SummaryBazarScheduleItem[];
}

export function DashboardSummaryTables({
  memberList,
  totalNetAdvances,
  totalNetDues,
  recentBazar,
  recentDeposits,
  recentActivities,
  recentNotices,
  upcomingBazarSchedules = [],
}: DashboardSummaryTablesProps) {
  const { language } = useI18n();

  return (
    <div className="space-y-6">
      {/* 1. BILLBOARD HIGHLIGHTS & COMMUNITY CHAT PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Monthly Notice Highlights */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900 transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-orange-500" />
                {language === 'bn' ? 'মাসিক নোটিশ হাইলাইটস' : 'Monthly Notice Highlights'}
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'bn'
                  ? 'ঘোষণা, বাজার শিডিউল ও মেসের নিয়মাবলী'
                  : 'Announcements, bazar schedules, and mess rules'}
              </p>
            </div>
            <Link
              href="/notices"
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              <span>{language === 'bn' ? 'বিলবোর্ড দেখুন' : 'View Billboard'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentNotices.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  {language === 'bn' ? 'কোনো সক্রিয় নোটিশ নেই।' : 'No active notices posted yet.'}
                </p>
              ) : (
                recentNotices.map((n) => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300">
                          {n.category.replace('_', ' ')}
                        </span>
                        {n.isPinned && (
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            ★ {language === 'bn' ? 'পিন করা' : 'Pinned'}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {n.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {n.content}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatDate(n.publishedAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Bazar Schedule */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900 transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                {language === 'bn' ? 'আসন্ন বাজার শিডিউল' : 'Upcoming Bazar Schedule'}
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'bn'
                  ? 'এশিয়া/ঢাকা টাইমজোনে দায়িত্বপ্রাপ্ত সদস্যবৃন্দ'
                  : 'Responsible members by date range (Asia/Dhaka)'}
              </p>
            </div>
            <Link
              href="/bazar"
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              <span>{language === 'bn' ? 'সম্পূর্ণ শিডিউল' : 'Full Schedule'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingBazarSchedules.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  {language === 'bn'
                    ? 'কোনো বাজার শিডিউল তৈরি করা হয়নি।'
                    : 'No upcoming bazar schedules assigned.'}
                </p>
              ) : (
                upcomingBazarSchedules.map((sched) => (
                  <div
                    key={sched.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      sched.status === 'ONGOING'
                        ? 'bg-amber-500/10 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-100'
                        : sched.status === 'UPCOMING'
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40 text-slate-800 dark:text-slate-200'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{sched.memberName}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md uppercase ${
                            sched.status === 'ONGOING'
                              ? 'bg-amber-500 text-white'
                              : sched.status === 'UPCOMING'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {sched.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {sched.formattedRange}
                      </p>
                    </div>
                    {sched.memberPhone && (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                        {sched.memberPhone}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. MEMBER DUE & ADVANCE OVERVIEW TABLE */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900 my-6">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'bn' ? 'সদস্যদের বকেয়া ও অগ্রিম সারসংক্ষেপ' : 'Member Due & Advance Summary'}
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'bn'
                ? 'নেট ব্যালেন্স: মিল খরচ + অন্যান্য খরচ বনাম জমা + ব্যক্তিগত পরিশোধ'
                : 'Net balances: Meal cost + Shared expenses vs Deposits + Personal payments'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold rounded-xl border border-emerald-200 dark:border-emerald-800">
              {language === 'bn' ? 'মোট অগ্রিম' : 'Total Advance'}: {formatCurrency(totalNetAdvances)}
            </span>
            <span className="text-xs px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold rounded-xl border border-rose-200 dark:border-rose-800">
              {language === 'bn' ? 'মোট বকেয়া' : 'Total Due'}: {formatCurrency(totalNetDues)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">{language === 'bn' ? 'সদস্য' : 'Member'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'মোট মিল' : 'Total Meals'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'মিল খরচ' : 'Meal Cost'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'অন্যান্য খরচ' : 'Other Costs'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'জমা' : 'Deposits'}</th>
                  <th className="py-3 px-4">{language === 'bn' ? 'ব্যক্তিগত প্রদান' : 'Personal Paid'}</th>
                  <th className="py-3 px-4 text-right">{language === 'bn' ? 'বর্তমান ব্যালেন্স' : 'Current Balance'}</th>
                  <th className="py-3 px-4 text-center">{language === 'bn' ? 'অবস্থা' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {memberList.map((m) => (
                  <tr key={m.memberId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {m.fullName}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-orange-600 dark:text-orange-400">
                      {m.totalMeals}
                    </td>
                    <td className="py-3 px-4">{formatCurrency(m.mealCost)}</td>
                    <td className="py-3 px-4">{formatCurrency(m.otherCosts)}</td>
                    <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatCurrency(m.deposits)}
                    </td>
                    <td className="py-3 px-4 text-sky-600 dark:text-sky-400 font-semibold">
                      {formatCurrency(m.personalPayments)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(Math.abs(m.closingBalance))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {m.isAdvance ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <ArrowUpRight className="w-3 h-3" /> {language === 'bn' ? 'অগ্রিম' : 'Advance'}
                        </span>
                      ) : m.isDue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <ArrowDownRight className="w-3 h-3" /> {language === 'bn' ? 'বকেয়া' : 'Due'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {language === 'bn' ? 'পরিশোধিত' : 'Settled'}
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

      {/* 3. TWO-COLUMN GRID: RECENT TRANSACTIONS (Bazar & Member Deposits) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 my-6">
        {/* Recent Bazar Transactions */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-orange-500" />
              {language === 'bn' ? 'সাম্প্রতিক বাজার ক্রয়' : 'Recent Bazar Purchases'}
            </CardTitle>
            <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
              {language === 'bn' ? 'মিল রেট প্রভাবিত করে' : 'Affects Meal Rate'}
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentBazar.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  {language === 'bn' ? 'কোনো বাজার রেকর্ড নেই' : 'No recent bazar entries.'}
                </p>
              ) : (
                recentBazar.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{b.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{formatDate(b.date)}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">{b.category}</span>
                        {b.paymentSource === 'PERSONAL' && (
                          <span className="px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded font-medium text-[10px]">
                            {language === 'bn'
                              ? `${b.payerName?.split(' ')[0] || 'সদস্য'} পরিশোধ করেছেন`
                              : `Paid by ${b.payerName?.split(' ')[0] || 'Member'}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-orange-600 dark:text-orange-400">
                      {formatCurrency(b.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Member Deposits */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-500" />
              {language === 'bn' ? 'সাম্প্রতিক মেম্বার জমা' : 'Recent Member Deposits'}
            </CardTitle>
            <span className="text-xs text-slate-400">{language === 'bn' ? 'মেস ফান্ড' : 'Mess Fund'}</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDeposits.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  {language === 'bn' ? 'কোনো জমা রেকর্ড নেই' : 'No recent deposits.'}
                </p>
              ) : (
                recentDeposits.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{d.memberName}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{formatDate(d.depositDate)}</span>
                        <span>•</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{d.paymentMethod}</span>
                        {d.transactionId && (
                          <span className="font-mono text-[10px] text-slate-400">
                            TX: {d.transactionId}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(d.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. RECENT ACTIVITIES AUDIT LOG */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] bg-white dark:bg-slate-900 my-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-orange-500" />
            {language === 'bn' ? 'সাম্প্রতিক কার্যক্রমের লগ' : 'Recent Activity Logs'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {language === 'bn' ? 'কোনো সাম্প্রতিক কার্যক্রম নেই' : 'No recent activity.'}
              </p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {act.userName || (language === 'bn' ? 'সিস্টেম' : 'System')}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono text-[10px]">
                      {act.action}
                    </span>
                    {act.reason && (
                      <span className="text-slate-500 italic hidden sm:inline">“{act.reason}”</span>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(act.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
