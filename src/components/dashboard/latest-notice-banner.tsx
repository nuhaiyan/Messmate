'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Pin,
  Calendar,
  User,
  ArrowRight,
  X,
  AlertTriangle,
  ShoppingCart,
  Utensils,
  BookOpen,
  Wrench,
  Info,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { formatDate } from '@/lib/utils';
import { NoticeCategory } from '@/app/actions/notices';

export interface NoticeBannerItem {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  isPinned: boolean;
  publishedAt: string;
  creatorName: string;
}

interface LatestNoticeBannerProps {
  latestNotice: NoticeBannerItem | null;
}

const CATEGORY_MAP: Record<
  NoticeCategory,
  { labelEn: string; labelBn: string; icon: any; badgeClass: string }
> = {
  ANNOUNCEMENT: {
    labelEn: 'Announcement',
    labelBn: 'ঘোষণা',
    icon: Megaphone,
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  BAZAR_LIST: {
    labelEn: 'Bazar List',
    labelBn: 'বাজার তালিকা',
    icon: ShoppingCart,
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  MEAL_SCHEDULE: {
    labelEn: 'Meal Schedule',
    labelBn: 'মিল সূচি',
    icon: Utensils,
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  },
  SHOPPING_REQ: {
    labelEn: 'Shopping Req',
    labelBn: 'প্রয়োজনীয় কেনাকাটা',
    icon: ShoppingCart,
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  },
  EXPENSES: {
    labelEn: 'Expenses Notice',
    labelBn: 'খরচের নোটিশ',
    icon: BookOpen,
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  MESS_RULES: {
    labelEn: 'Mess Rules',
    labelBn: 'মেস নিয়মাবলী',
    icon: ShieldCheck,
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  MAINTENANCE: {
    labelEn: 'Maintenance',
    labelBn: 'মেরামত ও রক্ষণাবেক্ষণ',
    icon: Wrench,
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  },
  EMERGENCY: {
    labelEn: 'Emergency',
    labelBn: 'জরুরি নোটিশ',
    icon: AlertTriangle,
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  GENERAL: {
    labelEn: 'General',
    labelBn: 'সাধারণ',
    icon: Info,
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  },
};

export function LatestNoticeBanner({ latestNotice }: LatestNoticeBannerProps) {
  const { language } = useI18n();
  const [isFullNoticeOpen, setIsFullNoticeOpen] = useState(false);

  // Empty state if no notice exists
  if (!latestNotice) {
    return (
      <div className="mb-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-4 sm:p-5 shadow-2xs backdrop-blur-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-200/50 dark:border-orange-900/40">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {language === 'bn' ? 'বর্তমানে কোনো নোটিশ নেই' : 'No new announcements right now'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'bn'
                ? 'মেসের সব কার্যক্রম স্বাভাবিক ও নিয়মমাফিক চলছে।'
                : 'All mess operations are running smoothly as scheduled.'}
            </p>
          </div>
        </div>
        <Link
          href="/notices"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/60 rounded-xl transition-all"
        >
          <span>{language === 'bn' ? 'নোটিশ বোর্ড' : 'Billboard'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const categoryConfig = CATEGORY_MAP[latestNotice.category] || CATEGORY_MAP.GENERAL;
  const CategoryIcon = categoryConfig.icon;
  const categoryLabel = language === 'bn' ? categoryConfig.labelBn : categoryConfig.labelEn;

  return (
    <>
      <div
        className={`mb-6 rounded-2xl border transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden ${
          latestNotice.isPinned
            ? 'border-amber-300 dark:border-amber-700/80 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-white dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900'
            : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'
        }`}
      >
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                latestNotice.isPinned
                  ? 'bg-amber-500 text-white border-amber-400 shadow-amber-500/20'
                  : 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50'
              }`}
            >
              {latestNotice.isPinned ? (
                <Pin className="w-5 h-5 fill-white" />
              ) : (
                <CategoryIcon className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${categoryConfig.badgeClass}`}
                >
                  <CategoryIcon className="w-3 h-3" />
                  {categoryLabel}
                </span>

                {latestNotice.isPinned && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    <Pin className="w-2.5 h-2.5 fill-current" />
                    {language === 'bn' ? 'পিন করা নোটিশ' : 'Pinned Notice'}
                  </span>
                )}

                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {formatDate(latestNotice.publishedAt)}
                </span>

                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  {latestNotice.creatorName}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight line-clamp-1">
                {latestNotice.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 pr-2">
                {latestNotice.content}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center pt-1 md:pt-0">
            <button
              onClick={() => setIsFullNoticeOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <span>{language === 'bn' ? 'সম্পূর্ণ নোটিশ পড়ুন' : 'View Full Notice'}</span>
            </button>

            <Link
              href="/notices"
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
            >
              <span>{language === 'bn' ? 'সব নোটিশ' : 'All Notices'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* FULL NOTICE MODAL */}
      {isFullNoticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 max-h-[88vh] overflow-y-auto">
            <button
              onClick={() => setIsFullNoticeOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap pr-8">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg border ${categoryConfig.badgeClass}`}
                >
                  <CategoryIcon className="w-3.5 h-3.5" />
                  {categoryLabel}
                </span>

                {latestNotice.isPinned && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    <Pin className="w-3 h-3 fill-current" />
                    {language === 'bn' ? 'পিন করা নোটিশ' : 'Pinned Announcement'}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {latestNotice.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(latestNotice.publishedAt)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {latestNotice.creatorName}
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-sm sm:text-base text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {latestNotice.content}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href="/notices"
                  onClick={() => setIsFullNoticeOpen(false)}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1"
                >
                  <span>{language === 'bn' ? 'সম্পূর্ণ নোটিশ বোর্ড দেখুন' : 'Go to Notice Billboard'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => setIsFullNoticeOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
