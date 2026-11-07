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

interface BottomNavProps {
  isAdminOrManager?: boolean;
}

export function BottomNav({ isAdminOrManager = false }: BottomNavProps) {
  const pathname = usePathname();
  const { language, t } = useI18n();
  const navContainerRef = useRef<HTMLDivElement | null>(null);

  const navItems = [
    {
      name: language === 'bn' ? 'ড্যাশবোর্ড' : (t.nav?.dashboard || 'Home'),
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: language === 'bn' ? 'মিল' : (t.nav?.dailyMeals || 'Meals'),
      href: '/meals',
      icon: Utensils,
    },
    {
      name: language === 'bn' ? 'বাজার' : (t.nav?.bazarExpenses || 'Bazar'),
      href: '/bazar',
      icon: ShoppingCart,
    },
    {
      name: language === 'bn' ? 'জমা' : (t.nav?.deposits || 'Deposits'),
      href: '/deposits',
      icon: Wallet,
    },
    {
      name: language === 'bn' ? 'ফিক্সড' : (t.nav?.additionalExpenses || 'Expenses'),
      href: '/additional-expenses',
      icon: Receipt,
    },
    {
      name: language === 'bn' ? 'নোটিশ' : (t.nav?.notices || 'Notices'),
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
    navItems.splice(5, 0, {
      name: language === 'bn' ? 'সদস্য' : 'Members',
      href: '/members',
      icon: Users,
    });
    navItems.push({
      name: language === 'bn' ? 'মেস' : 'Mess',
      href: '/mess-profile',
      icon: Building2,
    });
  }

  // Smoothly auto-scroll the active square card into view
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
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] py-2 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] transition-colors"
    >
      <div
        ref={navContainerRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth max-w-2xl mx-auto py-0.5 justify-start sm:justify-center"
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
              className={`flex flex-col items-center justify-center shrink-0 w-[58px] h-[58px] rounded-xl border transition-all select-none ${
                isActive
                  ? 'bg-orange-600 border-orange-600 text-white font-bold shadow-md shadow-orange-600/30 scale-102'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] tracking-tight leading-none font-semibold truncate max-w-[50px] text-center">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
