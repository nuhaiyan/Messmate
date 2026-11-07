'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Utensils,
  ShoppingCart,
  Wallet,
  Receipt,
  Megaphone,
  MessageSquare,
  UserCheck,
  Building2,
  Users,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

interface MobileTopNavProps {
  isAdminOrManager?: boolean;
}

export function MobileTopNav({ isAdminOrManager = false }: MobileTopNavProps) {
  const pathname = usePathname();
  const { language, t } = useI18n();
  const navContainerRef = useRef<HTMLDivElement | null>(null);

  const navItems = [
    {
      name: language === 'bn' ? 'ড্যাশবোর্ড' : (t.nav?.dashboard || 'Dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: language === 'bn' ? 'মিল এন্ট্রি' : (t.nav?.dailyMeals || 'Meals'),
      href: '/meals',
      icon: Utensils,
    },
    {
      name: language === 'bn' ? 'বাজার খরচ' : (t.nav?.bazarExpenses || 'Bazar'),
      href: '/bazar',
      icon: ShoppingCart,
    },
    {
      name: language === 'bn' ? 'জমা হিসাব' : (t.nav?.deposits || 'Deposits'),
      href: '/deposits',
      icon: Wallet,
    },
    {
      name: language === 'bn' ? 'ফিক্সড খরচ' : (t.nav?.additionalExpenses || 'Expenses'),
      href: '/additional-expenses',
      icon: Receipt,
    },
    {
      name: language === 'bn' ? 'নোটিশ বোর্ড' : (t.nav?.notices || 'Notices'),
      href: '/notices',
      icon: Megaphone,
    },
    {
      name: language === 'bn' ? 'কমিউনিটি' : (t.nav?.messages || 'Chat'),
      href: '/messages',
      icon: MessageSquare,
    },
    {
      name: language === 'bn' ? 'প্রোফাইল' : (t.nav?.myProfile || 'Profile'),
      href: '/profile',
      icon: UserCheck,
    },
  ];

  if (isAdminOrManager) {
    // Insert Members list at position 5
    navItems.splice(5, 0, {
      name: language === 'bn' ? 'সদস্য তালিকা' : 'Members',
      href: '/members',
      icon: Users,
    });
    // Add Mess Profile at end
    navItems.push({
      name: language === 'bn' ? 'মেস প্রোফাইল' : 'Mess Info',
      href: '/mess-profile',
      icon: Building2,
    });
  }

  // Smoothly auto-scroll the active pill into view on page navigation
  useEffect(() => {
    if (!navContainerRef.current) return;
    const activeEl = navContainerRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [pathname]);

  return (
    <nav
      aria-label="Mobile Top Navigation"
      className="md:hidden sticky top-16 z-20 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-2xs transition-colors"
    >
      <div
        ref={navContainerRef}
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 py-2 scroll-smooth"
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={isActive ? 'true' : 'false'}
              prefetch
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs shrink-0 transition-all select-none ${
                isActive
                  ? 'bg-orange-600 text-white font-bold shadow-xs shadow-orange-600/30'
                  : 'text-slate-700 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
