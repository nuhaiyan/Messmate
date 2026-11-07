'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Utensils,
  ShoppingCart,
  Megaphone,
  UserCheck,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

export function BottomNav() {
  const pathname = usePathname();
  const { t, language } = useI18n();

  const navItems = [
    {
      name: language === 'bn' ? 'ড্যাশবোর্ড' : (t.nav.dashboard || 'Home'),
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: language === 'bn' ? 'মিল' : (t.nav.dailyMeals || 'Meals'),
      href: '/meals',
      icon: Utensils,
    },
    {
      name: language === 'bn' ? 'বাজার' : (t.nav.bazarExpenses || 'Bazar'),
      href: '/bazar',
      icon: ShoppingCart,
    },
    {
      name: language === 'bn' ? 'নোটিশ' : (t.nav.notices || 'Notices'),
      href: '/notices',
      icon: Megaphone,
    },
    {
      name: language === 'bn' ? 'প্রোফাইল' : (t.nav.myProfile || 'Profile'),
      href: '/profile',
      icon: UserCheck,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1 px-2 transition-colors"
    >
      <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-orange-600 dark:text-orange-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
              }`}
            >
              <div
                className={`relative p-1 rounded-xl transition-all ${
                  isActive
                    ? 'bg-orange-50 dark:bg-orange-950/60 scale-105'
                    : ''
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                {isActive && (
                  <span className="absolute -top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-orange-600 dark:bg-orange-400 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] tracking-tight truncate max-w-[62px] text-center mt-0.5">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
