'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Utensils,
  ShoppingCart,
  Wallet,
  Menu,
  Megaphone,
  MessageSquare,
  UserCheck,
  Building2,
  Users,
  Receipt,
  FileCheck2,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

interface BottomNavProps {
  isAdminOrManager?: boolean;
  isDrawerOpen?: boolean;
  onToggleDrawer?: () => void;
}

export function BottomNav({
  isAdminOrManager = false,
  isDrawerOpen = false,
  onToggleDrawer,
}: BottomNavProps) {
  const pathname = usePathname();
  const { language, t } = useI18n();

  // Core navigation items in floating dock
  const baseNavItems = [
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
  ];

  // If user navigates to an auxiliary route from the drawer, show it dynamically in the dock
  let auxiliaryActiveItem: { name: string; href: string; icon: any } | null = null;
  if (pathname.startsWith('/notices')) {
    auxiliaryActiveItem = { name: language === 'bn' ? 'নোটিশ' : 'Notices', href: '/notices', icon: Megaphone };
  } else if (pathname.startsWith('/messages')) {
    auxiliaryActiveItem = { name: language === 'bn' ? 'চ্যাট' : 'Chat', href: '/messages', icon: MessageSquare };
  } else if (pathname.startsWith('/profile')) {
    auxiliaryActiveItem = { name: language === 'bn' ? 'প্রোফাইল' : 'Profile', href: '/profile', icon: UserCheck };
  } else if (pathname.startsWith('/additional-expenses')) {
    auxiliaryActiveItem = { name: language === 'bn' ? 'ফিক্সড' : 'Fixed', href: '/additional-expenses', icon: Receipt };
  } else if (pathname.startsWith('/mess-profile')) {
    auxiliaryActiveItem = { name: language === 'bn' ? 'মেস' : 'Mess', href: '/mess-profile', icon: Building2 };
  } else if (pathname.startsWith('/members')) {
    auxiliaryActiveItem = { name: language === 'bn' ? 'সদস্য' : 'Members', href: '/members', icon: Users };
  } else if (pathname.startsWith('/closing')) {
    auxiliaryActiveItem = { name: language === 'bn' ? 'ক্লোজিং' : 'Closing', href: '/closing', icon: FileCheck2 };
  }

  return (
    <nav
      aria-label="Mobile Floating Bottom Navigation"
      className={`md:hidden fixed bottom-5 inset-x-0 mx-auto z-40 w-fit max-w-[94vw] transition-all duration-300 ease-out select-none ${
        isDrawerOpen
          ? 'opacity-0 pointer-events-none translate-y-8 scale-95'
          : 'opacity-100 pointer-events-auto translate-y-0 scale-100'
      }`}
    >
      <div className="bg-slate-950/92 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/10 dark:border-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.45)] rounded-full p-1.5 flex items-center justify-center gap-1 sm:gap-2">
        {baseNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex items-center justify-center transition-all duration-200 select-none ${
                isActive
                  ? 'bg-orange-600 text-white font-bold rounded-full px-3.5 py-2 shadow-lg shadow-orange-600/40 text-xs gap-1.5 scale-102'
                  : 'w-10 h-10 rounded-full text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title={item.name}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
              {isActive && (
                <span className="text-xs font-semibold tracking-tight whitespace-nowrap">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}

        {/* Dynamic auxiliary active tab when visiting secondary pages */}
        {auxiliaryActiveItem && (
          <Link
            href={auxiliaryActiveItem.href}
            prefetch
            className="bg-orange-600 text-white font-bold rounded-full px-3.5 py-2 shadow-lg shadow-orange-600/40 text-xs gap-1.5 scale-102 flex items-center justify-center select-none"
            title={auxiliaryActiveItem.name}
          >
            <auxiliaryActiveItem.icon className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span className="text-xs font-semibold tracking-tight whitespace-nowrap">
              {auxiliaryActiveItem.name}
            </span>
          </Link>
        )}

        {/* Menu Drawer Toggle Button */}
        {onToggleDrawer && (
          <button
            type="button"
            onClick={onToggleDrawer}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title={language === 'bn' ? 'সব মেনু' : 'All Menu'}
            aria-label="Toggle Side Panel"
          >
            <Menu className="w-4 h-4 stroke-[2]" />
          </button>
        )}
      </div>
    </nav>
  );
}
