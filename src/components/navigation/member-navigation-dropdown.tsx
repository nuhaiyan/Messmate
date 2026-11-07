'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  User,
  Crown,
  ShieldCheck,
  Shield,
  Lock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { MemberOption } from '@/components/layout/header';

export const INITIAL_14_MEMBERS: MemberOption[] = [
  { id: 'cmw5juyuy0013v1z4ggx3z404', fullName: 'Mohammad Tarek Hossen', isPrimaryAdmin: true, isAdmin: false, isManager: false, isActive: true, roomNumber: '101' },
  { id: 'cmw5juzgl0016v1z4othgokca', fullName: 'Forkan', isPrimaryAdmin: false, isAdmin: false, isManager: false, isActive: true, roomNumber: '102' },
  { id: 'cmw5juzuo0019v1z4aps2mmq4', fullName: 'Tanvir', isPrimaryAdmin: false, isAdmin: false, isManager: true, isActive: true, roomNumber: '103' },
  { id: 'cmw5jv092001cv1z4gwu24tfy', fullName: 'Sayed', isPrimaryAdmin: false, isAdmin: false, isManager: false, isActive: true, roomNumber: '104' },
  { id: 'cmw5jv0n0001fv1z4fkpnix5g', fullName: 'Rafi', isPrimaryAdmin: false, isAdmin: false, isManager: false, isActive: true, roomNumber: '105' },
  { id: 'cmw5jv11d001iv1z4ocfp29ya', fullName: 'Mahin', isPrimaryAdmin: false, isAdmin: false, isManager: false, isActive: true, roomNumber: '106' },
  { id: 'cmw5jv1fj001lv1z46cisj8tj', fullName: 'Misu', isPrimaryAdmin: false, isAdmin: false, isManager: false, isActive: true, roomNumber: '107' },
  { id: 'cmw5jv1tg001ov1z4y22kr2lx', fullName: 'Safi', isPrimaryAdmin: false, isAdmin: false, isManager: false, isActive: true, roomNumber: '108' },
  { id: 'cmw5jv27e001rv1z4xy5tamtw', fullName: 'Mahi', isPrimaryAdmin: false, isAdmin: false, isManager: false, isActive: true, roomNumber: '109' },
  { id: 'cmw5jv2lf001uv1z4n5k6067o', fullName: 'Yousuf', isPrimaryAdmin: false, isAdmin: false, isManager: false, isActive: false, roomNumber: '110' },
  { id: 'cmw5jv2zj001xv1z4u5um2azv', fullName: 'Masum', isPrimaryAdmin: false, isAdmin: false, isManager: false, isActive: true, roomNumber: '111' },
  { id: 'cmw5jv3dn0020v1z4xxlfs8t2', fullName: 'Forid', isPrimaryAdmin: false, isAdmin: false, isManager: false, isActive: true, roomNumber: '112' },
  { id: 'cmw5jv3s20023v1z494srw8t8', fullName: 'Fahim', isPrimaryAdmin: false, isAdmin: false, isManager: false, isActive: true, roomNumber: '113' },
  { id: 'cmw5jv45z0026v1z4t5xu3hs6', fullName: 'Muaz', isPrimaryAdmin: false, isAdmin: false, isManager: false, isActive: true, roomNumber: '114' },
];

interface MemberNavDropdownProps {
  members?: MemberOption[];
  activeMemberId?: string;
  isManagement: boolean; // isPrimaryAdmin || isAdmin || isManager
  variant: 'top-nav' | 'sidebar' | 'mobile';
  isActiveRoute?: boolean;
  onClose?: () => void;
}

export function MemberNavigationDropdown({
  members = [],
  activeMemberId,
  isManagement,
  variant,
  isActiveRoute = false,
  onClose,
}: MemberNavDropdownProps) {
  // Merge prop members with baseline 14 members to guarantee all 14 are displayed
  const displayMembers = React.useMemo(() => {
    if (!members || members.length === 0) return INITIAL_14_MEMBERS;
    const map = new Map<string, MemberOption>();
    INITIAL_14_MEMBERS.forEach((m) => map.set(m.fullName.toLowerCase(), m));
    members.forEach((m) => {
      const key = m.fullName.toLowerCase();
      const existing = map.get(key);
      map.set(key, { ...existing, ...m });
    });
    return Array.from(map.values());
  }, [members]);

  const [isOpen, setIsOpen] = useState(variant === 'sidebar');
  const [searchQuery, setSearchQuery] = useState('');
  const [protectedNotice, setProtectedNotice] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click for top-nav variant
  useEffect(() => {
    if (variant !== 'top-nav') return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [variant]);

  const filteredMembers = displayMembers.filter((m) =>
    m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.roomNumber && m.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleMemberClick = (m: MemberOption, e: React.MouseEvent) => {
    const isSelf = m.id === activeMemberId;
    if (!isManagement && !isSelf) {
      e.preventDefault();
      setProtectedNotice(`“${m.fullName}” এর ব্যক্তিগত তথ্য সুরক্ষিত। সাধারণ সদস্যরা কেবল নিজের প্রোফাইল দেখতে পারেন।`);
      setTimeout(() => setProtectedNotice(null), 3500);
      return;
    }
    if (variant === 'top-nav') {
      setIsOpen(false);
    }
    if (onClose) onClose();
  };

  // 1. TOP NAVIGATION VARIANT (Dropdown popover)
  if (variant === 'top-nav') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all select-none cursor-pointer ${
            isActiveRoute || isOpen
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/80'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Members</span>
          <span className="text-[10px] bg-black/15 dark:bg-white/20 px-1.5 py-0.2 rounded-full font-bold">
            14
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-150">
            {/* Header & Search */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-orange-500" />
                <span>Mess Members ({displayMembers.length})</span>
              </span>
              <Link
                href="/members"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
              >
                <span>Directory</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Search Input */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                autoFocus
              />
            </div>

            {/* Privacy Protection Notice Toast */}
            {protectedNotice && (
              <div className="mb-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{protectedNotice}</span>
              </div>
            )}

            {/* Scrollable Members List */}
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {filteredMembers.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No members match “{searchQuery}”</p>
              ) : (
                filteredMembers.map((m) => {
                  const isSelf = m.id === activeMemberId;
                  const canOpen = isManagement || isSelf;

                  return (
                    <Link
                      key={m.id}
                      href={canOpen ? (isSelf ? '/profile' : `/members/${m.id}`) : '#'}
                      onClick={(e) => handleMemberClick(m, e)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                        isSelf
                          ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-orange-900 dark:text-orange-200'
                          : canOpen
                          ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                          : 'opacity-70 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-full bg-linear-to-tr from-orange-500 to-amber-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          {m.avatarUrl ? (
                            <img src={m.avatarUrl} alt={m.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{m.fullName.charAt(0)}</span>
                          )}
                        </div>

                        {/* Name & Room */}
                        <div className="min-w-0">
                          <p className="font-semibold truncate flex items-center gap-1">
                            <span>{m.fullName}</span>
                            {isSelf && <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold">(You)</span>}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            {m.roomNumber && <span>R: {m.roomNumber}</span>}
                            <span>•</span>
                            <span className={m.isActive ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                              {m.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Tag */}
                      <div className="shrink-0 flex items-center gap-1">
                        {m.isPrimaryAdmin ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                            Admin
                          </span>
                        ) : m.isManager ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                            Manager
                          </span>
                        ) : !canOpen ? (
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        ) : null}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {/* Bottom Link */}
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-center">
              <Link
                href="/members"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline block py-1"
              >
                Open Full Member Directory & Roles →
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. SIDEBAR & MOBILE DRAWER VARIANT (Collapsible Submenu)
  return (
    <div className="w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
          isActiveRoute
            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-orange-400" />
          <span>Members Directory</span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full font-bold">
            14
          </span>
        </div>
        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </div>

      {isOpen && (
        <div className="mt-1.5 pl-3 pr-1 py-1 space-y-1 bg-slate-950/50 rounded-xl border border-slate-800/60">
          {/* Quick Search */}
          <div className="p-1.5">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter 14 members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-[11px] rounded-lg border border-slate-800 bg-slate-900 text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          {/* Privacy Notice */}
          {protectedNotice && (
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800 text-[10px] text-amber-300 flex items-start gap-1">
              <Lock className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              <span>{protectedNotice}</span>
            </div>
          )}

          {/* Member items */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 scrollbar-thin">
            {filteredMembers.map((m) => {
              const isSelf = m.id === activeMemberId;
              const canOpen = isManagement || isSelf;

              return (
                <Link
                  key={m.id}
                  href={canOpen ? (isSelf ? '/profile' : `/members/${m.id}`) : '#'}
                  onClick={(e) => handleMemberClick(m, e)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isSelf
                      ? 'bg-orange-500/20 text-orange-300 font-bold'
                      : canOpen
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-500 hover:bg-slate-900 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{m.fullName.charAt(0)}</span>
                      )}
                    </div>
                    <span className="truncate">{m.fullName}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {m.isPrimaryAdmin ? (
                      <Crown className="w-3 h-3 text-amber-400" />
                    ) : m.isManager ? (
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    ) : !canOpen ? (
                      <Lock className="w-3 h-3 text-slate-600" />
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="pt-1 border-t border-slate-900 text-center">
            <Link
              href="/members"
              onClick={onClose}
              className="text-[11px] font-semibold text-orange-400 hover:underline block py-1"
            >
              All Members Directory →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
