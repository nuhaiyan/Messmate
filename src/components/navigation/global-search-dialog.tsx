'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Users,
  ShoppingCart,
  Calendar,
  Megaphone,
  Wallet,
  ArrowRight,
  Plus,
  Utensils,
  Receipt,
  FileCheck2,
  Lock,
} from 'lucide-react';
import { INITIAL_14_MEMBERS } from './member-navigation-dropdown';
import { MemberOption } from '@/components/layout/header';

interface GlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isManagement: boolean;
  activeMemberId?: string;
  members?: MemberOption[];
}

export function GlobalSearchDialog({
  isOpen,
  onClose,
  isManagement,
  activeMemberId,
  members = INITIAL_14_MEMBERS,
}: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();

  // Search Results
  const matchedMembers = members.filter(
    (m) =>
      m.fullName.toLowerCase().includes(trimmed) ||
      (m.roomNumber && m.roomNumber.toLowerCase().includes(trimmed))
  );

  const modules = [
    { name: 'Dashboard Financial Overview', href: '/dashboard', icon: FileCheck2, category: 'Module' },
    { name: 'All Members Directory', href: '/members', icon: Users, category: 'Module' },
    { name: 'Daily Meal Entry & History', href: '/meals', icon: Utensils, category: 'Module' },
    { name: 'Bazar Schedule & Grocery List', href: '/bazar', icon: ShoppingCart, category: 'Module' },
    { name: 'Finance & Fine Fund', href: '/finance', icon: Wallet, category: 'Module', restricted: !isManagement },
    { name: 'Monthly Closing Snapshot', href: '/closing', icon: FileCheck2, category: 'Module', restricted: !isManagement },
    { name: 'Mess Notice Billboard', href: '/notices', icon: Megaphone, category: 'Module' },
    { name: 'Reports & Analytics', href: '/reports', icon: Receipt, category: 'Module', restricted: !isManagement },
    { name: 'My Personal Profile & Ledger', href: '/profile', icon: Users, category: 'Module' },
  ].filter((mod) => !mod.restricted && (!trimmed || mod.name.toLowerCase().includes(trimmed)));

  const handleSelect = (url: string) => {
    router.push(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-orange-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search members, modules, notices, schedules, or actions... (Esc to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Members Search Section */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-orange-500" />
              <span>Mess Members ({matchedMembers.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {matchedMembers.slice(0, 8).map((m) => {
                const isSelf = m.id === activeMemberId;
                const canOpen = isManagement || isSelf;

                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (canOpen) {
                        handleSelect(isSelf ? '/profile' : `/members/${m.id}`);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                      canOpen
                        ? 'hover:bg-orange-50/80 dark:hover:bg-orange-950/30 border border-transparent hover:border-orange-200 dark:hover:border-orange-800'
                        : 'opacity-70 bg-slate-50 dark:bg-slate-800/40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-linear-to-tr from-orange-500 to-amber-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {m.fullName.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {m.fullName} {isSelf && '(You)'}
                      </span>
                    </div>
                    {canOpen ? (
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modules Navigation Section */}
          <div className="pt-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Application Modules
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {modules.slice(0, 6).map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.href}
                    onClick={() => handleSelect(mod.href)}
                    className="flex items-center gap-2.5 p-2 rounded-xl text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="font-medium truncate">{mod.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Search with real-time permissions</span>
          <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">Esc to close</span>
        </div>
      </div>
    </div>
  );
}
