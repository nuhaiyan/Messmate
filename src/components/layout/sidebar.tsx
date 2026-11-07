'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Utensils,
  ShoppingCart,
  Wallet,
  Receipt,
  FileCheck2,
  BarChart3,
  BookOpenText,
  History,
  ShieldCheck,
  User,
  Crown,
  Shield,
  LogOut,
  Building2,
  UserCheck,
  MessageSquare,
  Megaphone,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { logoutAction } from '@/app/actions/auth';

interface SidebarProps {
  userRole?: string;
  userName?: string;
  messName?: string;
  messLogoUrl?: string | null;
  isPrimaryAdmin?: boolean;
  isAdmin?: boolean;
  isManager?: boolean;
  currentManagerName?: string;
  primaryAdminName?: string;
  onClose?: () => void;
}

export function Sidebar({
  userRole = 'PRIMARY_ADMIN',
  userName = 'Mohammad Tarek Hossen',
  messName = "Tarek's Residence",
  messLogoUrl = null,
  isPrimaryAdmin = false,
  isAdmin = false,
  isManager = false,
  currentManagerName = 'Tanvir',
  primaryAdminName = 'Mohammad Tarek Hossen',
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  // Any management authority (Primary Admin, Shared Admin, or Manager) has full operational nav
  const hasManagerAccess = isPrimaryAdmin || isAdmin || isManager;

  const managerNav = [
    { name: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
    { name: t.nav.messProfile || 'Mess Profile', href: '/mess-profile', icon: Building2 },
    { name: t.nav.myProfile || 'My Profile', href: '/profile', icon: UserCheck },
    { name: t.nav.notices || 'Notice Board', href: '/notices', icon: Megaphone },
    { name: t.nav.messages || 'Community Chat', href: '/messages', icon: MessageSquare },
    { name: 'Members & Roles', href: '/members', icon: Users },
    { name: t.nav.dailyMeals, href: '/meals', icon: Utensils },
    { name: t.nav.bazarExpenses, href: '/bazar', icon: ShoppingCart },
    { name: t.nav.deposits, href: '/deposits', icon: Wallet },
    { name: t.nav.additionalExpenses, href: '/additional-expenses', icon: Receipt },
    { name: t.nav.monthlyAccounting, href: '/closing', icon: FileCheck2 },
    { name: t.nav.reports, href: '/reports', icon: BarChart3 },
    { name: t.nav.memberLedger, href: '/my-ledger', icon: BookOpenText },
    { name: t.nav.activityLogs, href: '/activities', icon: History },
  ];

  const memberNav = [
    { name: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
    { name: t.nav.myProfile || 'My Profile', href: '/profile', icon: UserCheck },
    { name: t.nav.notices || 'Notice Board', href: '/notices', icon: Megaphone },
    { name: t.nav.messages || 'Community Chat', href: '/messages', icon: MessageSquare },
    { name: 'My Personal Ledger', href: '/my-ledger', icon: BookOpenText },
    { name: t.nav.messProfile || 'Mess Profile', href: '/mess-profile', icon: Building2 },
    { name: t.nav.dailyMeals, href: '/meals', icon: Utensils },
    { name: t.nav.bazarExpenses, href: '/bazar', icon: ShoppingCart },
    { name: t.nav.deposits, href: '/deposits', icon: Wallet },
    { name: t.nav.additionalExpenses, href: '/additional-expenses', icon: Receipt },
    { name: t.nav.reports, href: '/reports', icon: BarChart3 },
  ];

  const navItems = hasManagerAccess ? managerNav : memberNav;

  // Determine current badge
  let roleTitle = 'Mess Member';
  let roleIcon = <User className="w-4 h-4 text-sky-400" />;
  let badgeColor = 'bg-sky-500/10 text-sky-400 border-sky-500/30';

  if (isPrimaryAdmin) {
    roleTitle = 'Primary Admin';
    roleIcon = <Crown className="w-4 h-4 text-amber-400" />;
    badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  } else if (isManager) {
    roleTitle = 'Current Manager';
    roleIcon = <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (isAdmin) {
    roleTitle = 'Shared Admin';
    roleIcon = <Shield className="w-4 h-4 text-indigo-400" />;
    badgeColor = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
  }

  return (
    <aside className="w-full h-full bg-slate-900 dark:bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 text-slate-300 transition-colors">
      {/* Brand Header */}
      <div className="h-16 px-5 sm:px-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 shrink-0">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2.5"
        >
          {messLogoUrl ? (
            <img
              src={messLogoUrl}
              alt="Mess Logo"
              className="w-9 h-9 rounded-xl object-cover border border-orange-500/40 shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-950/50">
              <Utensils className="w-5 h-5" />
            </div>
          )}
          <div>
            <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              MessMate
              <span className="text-[10px] bg-orange-500/20 text-orange-400 font-semibold px-1.5 py-0.5 rounded-full border border-orange-500/30">
                PRO
              </span>
            </span>
            <p className="text-[11px] text-slate-400 truncate max-w-[130px]">{messName}</p>
          </div>
        </Link>

        {/* Close Button for Mobile Drawer */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close menu drawer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role Pill */}
      <div className="px-4 py-2.5 mx-4 my-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {roleIcon}
          <span className="text-xs font-semibold text-slate-200 truncate">{roleTitle}</span>
        </div>
        <span className={cn('text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm border', badgeColor)}>
          {isPrimaryAdmin ? 'Owner' : isManager ? 'Active' : 'Active'}
        </span>
      </div>

      {/* System Administration Summary */}
      <div className="mx-4 mb-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/70 text-[11px] space-y-1 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-amber-400" /> Admin:
          </span>
          <span className="font-semibold text-slate-200 truncate max-w-[110px]" title={primaryAdminName}>
            {primaryAdminName}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Manager:
          </span>
          <span className="font-semibold text-emerald-300 truncate max-w-[110px]" title={currentManagerName}>
            {currentManagerName}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group select-none',
                isActive
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-950/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 transition-transform group-hover:scale-110',
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Current Active Persona Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center gap-2.5 overflow-hidden p-1.5 rounded-xl hover:bg-slate-800/60 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
            {userName.charAt(0)}
          </div>
          <div className="truncate flex-1">
            <p className="text-xs font-medium text-slate-200 truncate">{userName}</p>
            <p className="text-[10px] text-slate-400 truncate">{roleTitle}</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => logoutAction()}
          className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.nav.logout || 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  );
}
