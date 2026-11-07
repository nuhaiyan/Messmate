'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Utensils,
  Wallet,
  Calendar,
  ShoppingCart,
  AlertTriangle,
  Megaphone,
  ChevronDown,
  User,
  Sparkles,
} from 'lucide-react';

interface QuickActionsMenuProps {
  isManagement: boolean;
  activeMemberId?: string;
}

export function QuickActionsMenu({ isManagement, activeMemberId }: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const actions = [
    {
      title: 'Submit Daily Meal (মিল এন্ট্রি)',
      description: 'Record daily consumed meals',
      href: '/meals',
      icon: Utensils,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
      allowed: true,
    },
    {
      title: 'My Profile & Balance (আমার প্রোফাইল)',
      description: 'View 9 overview cards & ledger',
      href: '/profile',
      icon: User,
      color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40',
      allowed: true,
    },
    {
      title: 'Bazar Schedule (বাজার শিডিউল)',
      description: 'Check assigned date ranges',
      href: '/bazar',
      icon: Calendar,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
      allowed: true,
    },
    {
      title: 'Mess Notices (মেস নোটিশ)',
      description: 'View latest announcements',
      href: '/notices',
      icon: Megaphone,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40',
      allowed: true,
    },
    {
      title: 'Add Bazar Expense (বাজার খরচ)',
      description: 'Record grocery purchase payment',
      href: '/bazar?tab=expenses',
      icon: ShoppingCart,
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40',
      allowed: isManagement,
    },
    {
      title: 'Record Deposit (টাকা জমা)',
      description: 'Credit member money to mess fund',
      href: '/deposits',
      icon: Wallet,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40',
      allowed: isManagement,
    },
    {
      title: 'Issue Fine (জরিমানা নির্ধারণ)',
      description: 'Record fine for mess rule breach',
      href: '/finance',
      icon: AlertTriangle,
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
      allowed: isManagement,
    },
  ];

  const visibleActions = actions.filter((a) => a.allowed);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0"
        aria-expanded={isOpen}
        title="Quick Actions & Shortcuts (দ্রুত অ্যাকশন)"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Quick Action</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              Quick Actions (শর্টকাট)
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              {isManagement ? 'Manager' : 'Member'}
            </span>
          </div>

          <div className="space-y-0.5 max-h-[70vh] overflow-y-auto">
            {visibleActions.map((act) => {
              const Icon = act.icon;
              return (
                <Link
                  key={act.title}
                  href={act.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group text-left"
                >
                  <span className={`p-1.5 rounded-lg shrink-0 ${act.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                      {act.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {act.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
