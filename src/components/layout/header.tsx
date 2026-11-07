'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Calendar,
  TrendingUp,
  Menu,
  Shield,
  Crown,
  User,
  LogOut,
  Sun,
  Moon,
  LayoutDashboard,
  Users,
  Utensils,
  ShoppingCart,
  Wallet,
  FileCheck2,
  Megaphone,
  BarChart3,
  Settings,
  Search,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { PhoneNotificationButton } from '@/components/notifications/phone-notification-button';
import { useTheme } from '@/lib/theme/context';
import { logoutAction } from '@/app/actions/auth';
import { MemberNavigationDropdown, INITIAL_14_MEMBERS } from '@/components/navigation/member-navigation-dropdown';
import { GlobalSearchDialog } from '@/components/navigation/global-search-dialog';
import { QuickActionsMenu } from '@/components/navigation/quick-actions-menu';

export interface MemberOption {
  id: string;
  fullName: string;
  isPrimaryAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  avatarUrl?: string | null;
  isActive?: boolean;
  roomNumber?: string | null;
  phone?: string | null;
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
  isPrimaryAdmin?: boolean;
  isAdmin?: boolean;
  isManager?: boolean;
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
  isPrimaryAdmin = false,
  isAdmin = false,
  isManager = false,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language, setLanguage, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
  const effectiveMembers = membersList && membersList.length > 0 ? membersList : INITIAL_14_MEMBERS;
  const currentActiveMember = effectiveMembers.find((m) => m.id === activeMemberId);

  const hasManagerAccess = isPrimaryAdmin || isAdmin || isManager;
  const isStrictAdmin = isPrimaryAdmin || isAdmin;

  // 9 Modules Navigation Definition for Top Navigation
  const navModules = [
    {
      id: 'dashboard',
      name: language === 'bn' ? 'ড্যাশবোর্ড' : (t.nav?.dashboard || 'Dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      id: 'members',
      name: language === 'bn' ? 'সদস্যবৃন্দ' : 'Members',
      href: '/members',
      icon: Users,
      show: true, // Visible to all 14 members! General members see directory and open own profile.
      isDropdown: true,
    },
    {
      id: 'meals',
      name: language === 'bn' ? 'দৈনিক মিল' : (t.nav?.dailyMeals || 'Meals'),
      href: '/meals',
      icon: Utensils,
      show: true,
    },
    {
      id: 'bazar',
      name: language === 'bn' ? 'বাজার' : (t.nav?.bazarExpenses || 'Bazar'),
      href: '/bazar',
      icon: ShoppingCart,
      show: true,
    },
    {
      id: 'finance',
      name: language === 'bn' ? 'আর্থিক ফান্ড' : 'Finance',
      href: '/finance',
      icon: Wallet,
      show: hasManagerAccess,
    },
    {
      id: 'closing',
      name: language === 'bn' ? 'ক্লোজিং' : (t.nav?.monthlyAccounting || 'Closing'),
      href: '/closing',
      icon: FileCheck2,
      show: hasManagerAccess,
    },
    {
      id: 'notices',
      name: language === 'bn' ? 'নোটিশ' : (t.nav?.notices || 'Notices'),
      href: '/notices',
      icon: Megaphone,
      show: true,
    },
    {
      id: 'reports',
      name: language === 'bn' ? 'রিপোর্ট' : (t.nav?.reports || 'Reports'),
      href: '/reports',
      icon: BarChart3,
      show: hasManagerAccess,
    },
    {
      id: 'settings',
      name: language === 'bn' ? 'সেটিংস' : 'Settings',
      href: '/mess-profile',
      icon: Settings,
      show: isStrictAdmin,
    },
  ];

  return (
    <div className="sticky top-0 z-40 w-full max-w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-2xs transition-colors">
      {/* 1. Main Utility Top Row */}
      <header className="h-14 sm:h-16 px-2.5 sm:px-4 md:px-8 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 w-full max-w-full relative overflow-visible z-20">
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

          {/* Global Search Shortcut Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            title="Global Search across Members, Bazar, Notices, and Finances (Ctrl+K)"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden md:inline-block font-mono text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 text-slate-400">
              Ctrl+K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
          {/* Quick Actions Shortcuts Dropdown */}
          <QuickActionsMenu isManagement={hasManagerAccess} activeMemberId={activeMemberId} />

          {/* Meal rate pill */}
          {currentMealRate !== undefined && (
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50 rounded-full text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
              <span>
                {t.dashboard?.currentMealRate || 'Meal Rate'}: <strong className="text-orange-900 dark:text-orange-200 font-bold">৳{currentMealRate}</strong>
              </span>
            </div>
          )}

          {/* Phone Notification Bell */}
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

          {/* Logged in User Profile Badge */}
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

      {/* 2. Top Navigation Bar for 9 Modules (Orange, Off-white, Soft-gray Theme, Mobile Responsive) */}
      <nav
        aria-label="Top Module Navigation"
        className="w-full bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs px-2 sm:px-4 md:px-8 py-1 sm:py-1.5 overflow-x-auto sm:overflow-visible scrollbar-none relative z-10"
      >
        <div className="flex items-center gap-1 sm:gap-2 min-w-max">
          {navModules
            .filter((m) => m.show)
            .map((item) => {
              // If item is Members, render the Member Navigation Dropdown popover
              if (item.isDropdown && item.id === 'members') {
                return (
                  <MemberNavigationDropdown
                    key={item.id}
                    variant="top-nav"
                    members={effectiveMembers}
                    activeMemberId={activeMemberId}
                    isManagement={hasManagerAccess}
                    isActiveRoute={pathname.startsWith('/members')}
                  />
                );
              }

              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all select-none cursor-pointer ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-xs dark:bg-orange-600 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
        </div>
      </nav>

      {/* Global Search Dialog Modal */}
      <GlobalSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        isManagement={hasManagerAccess}
        activeMemberId={activeMemberId}
        members={effectiveMembers}
      />
    </div>
  );
}
