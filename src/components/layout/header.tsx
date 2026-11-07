'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Calendar, TrendingUp, Menu, Shield, Crown, User, LogOut, Sun, Moon } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { PhoneNotificationButton } from '@/components/notifications/phone-notification-button';
import { useTheme } from '@/lib/theme/context';
import { logoutAction } from '@/app/actions/auth';

export interface MemberOption {
  id: string;
  fullName: string;
  isPrimaryAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  avatarUrl?: string | null;
}

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  currentMealRate?: string | number;
  selectedMonth?: number;
  selectedYear?: number;
  membersList?: MemberOption[];
  activeMemberId?: string;
  currentManagerName?: string;
  primaryAdminName?: string;
}

export function Header({
  onMobileMenuToggle,
  currentMealRate,
  selectedMonth = 11,
  selectedYear = 2026,
  membersList = [],
  activeMemberId,
  currentManagerName = 'Tanvir',
  primaryAdminName = 'Mohammad Tarek Hossen',
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language, setLanguage, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [year, month] = e.target.value.split('-');
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', year);
    params.set('month', month);
    router.push(`${pathname}?${params.toString()}`);
  };

  const monthOptions = [
    { label: 'November 2026', value: '2026-11' },
    { label: 'October 2026 (Closed)', value: '2026-10' },
    { label: 'September 2026', value: '2026-09' },
    { label: 'August 2026', value: '2026-08' },
  ];

  const currentSelection = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const currentActiveMember = membersList.find((m) => m.id === activeMemberId);

  return (
    <header className="h-16 px-3 sm:px-4 md:px-8 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-30 shadow-2xs transition-colors w-full max-w-full overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Month Selector */}
        <div className="flex items-center gap-1 sm:gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-xs text-slate-700 dark:text-slate-300 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 shrink-0" />
          <span className="font-semibold text-slate-600 dark:text-slate-400 hidden sm:inline">
            {t.dashboard?.selectMonth || 'Month'}:
          </span>
          <select
            value={currentSelection}
            onChange={handleMonthChange}
            aria-label={t.dashboard?.selectMonth || 'Select Month'}
            className="bg-transparent font-medium text-slate-900 dark:text-slate-100 border-none outline-hidden cursor-pointer text-xs max-w-[105px] sm:max-w-none truncate"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="dark:bg-slate-800 dark:text-slate-100">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Current Manager Pill on Header */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50 rounded-full text-xs font-medium">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span>Manager: <strong className="font-semibold">{currentManagerName}</strong></span>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
        {/* Meal rate pill */}
        {currentMealRate !== undefined && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50 rounded-full text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
            <span>
              {t.dashboard?.currentMealRate || 'Meal Rate'}: <strong className="text-orange-900 dark:text-orange-200 font-bold">৳{currentMealRate}</strong>
            </span>
          </div>
        )}

        {/* Phone Notification Bell & Direct Test */}
        <PhoneNotificationButton />

        {/* Dark/Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? t.theme?.light || 'Switch to Light Mode' : t.theme?.dark || 'Switch to Dark Mode'}
          className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Language switch toggle */}
        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-800/80 shrink-0">
          <button
            onClick={() => setLanguage('en')}
            className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('bn')}
            className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              language === 'bn'
                ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            বাং
          </button>
        </div>

        {/* Logged in User Profile Badge / Link to /profile */}
        <Link
          href="/profile"
          className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-1.5 sm:px-3 sm:py-1 text-xs hover:border-orange-400 dark:hover:border-orange-500 transition-colors shrink-0"
          title="Open My Profile"
        >
          {currentActiveMember?.isPrimaryAdmin ? (
            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          ) : currentActiveMember?.isManager ? (
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : currentActiveMember?.isAdmin ? (
            <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          ) : (
            <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          )}
          <span className="font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline-block max-w-[140px] truncate">
            {currentActiveMember?.fullName || primaryAdminName}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden xl:inline">
            ({currentActiveMember?.isPrimaryAdmin ? 'Admin' : currentActiveMember?.isManager ? 'Manager' : currentActiveMember?.isAdmin ? 'Admin' : 'Member'})
          </span>
        </Link>

        {/* Logout Button */}
        <button
          onClick={() => {
            startTransition(async () => {
              await logoutAction();
            });
          }}
          disabled={isPending}
          title="Sign out of MessMate"
          className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{t.nav?.logout || 'Logout'}</span>
        </button>
      </div>
    </header>
  );
}
