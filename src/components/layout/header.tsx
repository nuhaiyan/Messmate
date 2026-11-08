'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
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
  Utensils,
  ShoppingCart,
  Wallet,
  FileCheck2,
  Megaphone,
  BarChart3,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { PhoneNotificationButton } from '@/components/notifications/phone-notification-button';
import { useTheme } from '@/lib/theme/context';
import { logoutAction } from '@/app/actions/auth';
import { INITIAL_14_MEMBERS } from '@/components/navigation/member-navigation-dropdown';
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
    { label: language === 'bn' ? 'নভেম্বর ২০২৬' : 'November 2026', value: '2026-11' },
    { label: language === 'bn' ? 'অক্টোবর ২০২৬ (বন্ধ)' : 'October 2026 (Closed)', value: '2026-10' },
    { label: language === 'bn' ? 'সেপ্টেম্বর ২০২৬' : 'September 2026', value: '2026-09' },
    { label: language === 'bn' ? 'আগস্ট ২০২৬' : 'August 2026', value: '2026-08' },
  ];

  const currentSelection = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const effectiveMembers = membersList && membersList.length > 0 ? membersList : INITIAL_14_MEMBERS;
  const currentActiveMember = effectiveMembers.find((m) => m.id === activeMemberId);

  const hasManagerAccess = isPrimaryAdmin || isAdmin || isManager;
  const isStrictAdmin = isPrimaryAdmin || isAdmin;

  // Top Navigation Bar Modules (Members option removed as requested)
  const navModules = [
    {
      id: 'dashboard',
      name: language === 'bn' ? 'ড্যাশবোর্ড' : (t.nav?.dashboard || 'Dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
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

  const navScrollRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!navScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = navScrollRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  useEffect(() => {
    if (activeItemRef.current && navScrollRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
    const timer = setTimeout(checkScroll, 200);
    return () => clearTimeout(timer);
  }, [pathname]);

  const scrollNav = (direction: 'left' | 'right') => {
    if (!navScrollRef.current) return;
    const offset = direction === 'left' ? -180 : 180;
    navScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

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
              className="bg-transparent font-medium text-slate-900 dark:text-slate-100 border-none outline-hidden cursor-pointer text-xs"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="dark:bg-slate-800 dark:text-slate-100">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Current Manager Pill on Header */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50 rounded-full text-xs font-medium shrink-0">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span>Manager: <strong className="font-semibold">{currentManagerName}</strong></span>
          </div>

          {/* Global Search Shortcut Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            title="Global Search across Members, Bazar, Notices, and Finances (Ctrl+K)"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400 transition-colors cursor-pointer shrink-0"
          >
            <Search className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden md:inline-block font-mono text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 text-slate-400">
              Ctrl+K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
          {/* Quick Actions Shortcuts Dropdown */}
          <QuickActionsMenu isManagement={hasManagerAccess} activeMemberId={activeMemberId} />

          {/* Meal rate pill */}
          {currentMealRate !== undefined && (
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50 rounded-full text-xs font-semibold shrink-0">
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
            className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-1.5 sm:px-3 sm:py-1 text-xs hover:border-orange-400 dark:hover:border-orange-500 transition-colors shrink-0"
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
            className="hidden sm:flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.nav?.logout || 'Logout'}</span>
          </button>
        </div>
      </header>

      {/* 2. Top Navigation Bar (User Friendly, Fully Mobile & Multi-Device Responsive, Smooth Touch Scroll) */}
      <nav
        aria-label="Top Module Navigation"
        className="relative w-full bg-slate-50/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 transition-colors"
      >
        {/* Left scroll fade & button */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pr-3 pl-1.5 bg-gradient-to-r from-slate-50 dark:from-slate-900 via-slate-50/90 dark:via-slate-900/90 to-transparent pointer-events-auto">
            <button
              type="button"
              onClick={() => scrollNav('left')}
              className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-all cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable module pills */}
        <div
          ref={navScrollRef}
          onScroll={checkScroll}
          className="w-full px-2.5 sm:px-4 md:px-8 py-1.5 sm:py-2 overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain flex items-center gap-1.5 sm:gap-2 [-webkit-overflow-scrolling:touch]"
        >
          {navModules
            .filter((m) => m.show)
            .map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  ref={isActive ? activeItemRef : undefined}
                  href={item.href}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-150 select-none cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.98] ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-[0_2px_8px_rgba(249,115,22,0.35)] border border-orange-500/40 dark:from-orange-600 dark:to-amber-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50/70 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-orange-500'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
        </div>

        {/* Right scroll fade & button */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pl-3 pr-1.5 bg-gradient-to-l from-slate-50 dark:from-slate-900 via-slate-50/90 dark:via-slate-900/90 to-transparent pointer-events-auto">
            <button
              type="button"
              onClick={() => scrollNav('right')}
              className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-all cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
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
