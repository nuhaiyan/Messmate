'use client';

import React from 'react';
import Link from 'next/link';
import { Crown, ShieldCheck, Building2, MapPin, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/context';

interface DashboardHeroBannerProps {
  userName: string;
  messName: string;
  messLocation: string;
  primaryAdminName: string;
  currentManagerName: string;
  currentYear: number;
  currentMonth: number;
  isPeriodClosed: boolean;
}

export function DashboardHeroBanner({
  userName,
  messName,
  messLocation,
  primaryAdminName,
  currentManagerName,
  currentYear,
  currentMonth,
  isPeriodClosed,
}: DashboardHeroBannerProps) {
  const { language, t } = useI18n();

  const monthDate = new Date(currentYear, currentMonth - 1);
  const monthName = monthDate.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="mb-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 md:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
              {messName}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              {messLocation}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {language === 'bn' ? `স্বাগতম, ${userName}` : `Welcome back, ${userName}`}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {language === 'bn'
              ? `${monthName}-এর মিল ও আর্থিক হিসাব বিবরণী`
              : `Financial and meal overview for `}
            <strong className="text-slate-800 dark:text-slate-200">
              {language === 'bn' ? '' : monthName}
            </strong>{' '}
            • {language === 'bn' ? 'সময় অঞ্চল: এশিয়া/ঢাকা' : 'Timezone: Asia/Dhaka'}
          </p>
        </div>

        {/* Quick Authority & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              {language === 'bn' ? 'এডমিন' : 'Admin'}: {primaryAdminName.split(' ')[0]}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
              {language === 'bn' ? 'ম্যানেজার' : 'Manager'}: {currentManagerName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/mess-profile"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-orange-600 bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-orange-500" />
              <span>{language === 'bn' ? 'মেস প্রোফাইল' : 'Mess Profile'}</span>
            </Link>
            {isPeriodClosed ? (
              <Badge variant="destructive" className="px-3 py-1.5 text-xs font-semibold rounded-xl">
                {language === 'bn' ? 'লক করা মাস' : 'Locked Month'}
              </Badge>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {language === 'bn' ? 'চলতি সক্রিয় মাস' : 'Active Cycle'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
