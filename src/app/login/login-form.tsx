'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Utensils,
  Crown,
  User,
  ShieldCheck,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminDirectLoginAction, memberLoginAction } from '@/app/actions/auth';

interface MemberItem {
  id: string;
  fullName: string;
  roomNumber: string | null;
  phone: string;
  isPrimaryAdmin: boolean;
  isManager: boolean;
}

interface LoginFormProps {
  members: MemberItem[];
  messName: string;
  messLogoUrl?: string | null;
}

export function LoginForm({ members, messName, messLogoUrl }: LoginFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'admin' | 'member'>('admin');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Admin Direct Login Handler
  const handleAdminDirectLogin = async () => {
    setError(null);
    startTransition(async () => {
      try {
        await adminDirectLoginAction();
      } catch (err: any) {
        // Next.js redirect throws NEXT_REDIRECT, which is expected
        if (err?.message && !err.message.includes('NEXT_REDIRECT')) {
          setError(err.message || 'Failed to enter Admin Panel.');
        }
      }
    });
  };

  // Member Login Handler
  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedMemberId) {
      setError('Please select your member name from the list.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await memberLoginAction({
          memberId: selectedMemberId,
          password,
        });

        if (res.success && res.redirectUrl) {
          router.push(res.redirectUrl);
          router.refresh();
        } else {
          setError(res.error || 'Invalid credentials or inactive account.');
        }
      } catch (err: any) {
        if (err?.message && !err.message.includes('NEXT_REDIRECT')) {
          setError(err.message || 'An unexpected error occurred during login.');
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {messLogoUrl ? (
          <img
            src={messLogoUrl}
            alt={messName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-500/40 shadow-xl mx-auto mb-3"
          />
        ) : (
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-tr from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-950/50 mb-3">
            <Utensils className="w-7 h-7" />
          </div>
        )}
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          MessMate
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Private Mess Management &amp; Accounting System
        </p>
        <span className="inline-block mt-1.5 text-xs font-semibold px-3 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
          {messName}
        </span>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl border border-slate-100 sm:px-10">
          {/* Segmented Control / Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setError(null);
              }}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Admin Access</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('member');
                setError(null);
              }}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'member'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4 text-emerald-600" />
              <span>Member Portal</span>
            </button>
          </div>

          {/* Feedback error alert */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* =========================================================
              A. ADMIN PANEL DIRECT ACCESS (PASSWORD-FREE)
          ========================================================= */}
          {activeTab === 'admin' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 font-bold shrink-0">
                    <Crown className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                      Permanent Primary Admin
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      Mohammad Tarek Hossen
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Direct authorized access for central mess administration. Full system authority to manage members, assign passwords, supervise the Manager, edit accounting records, and generate reports.
                </p>

                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Password-Free Admin Access
                  </span>
                  <span>Private Host</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleAdminDirectLogin}
                disabled={isPending}
                className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>{isPending ? 'Entering Admin Panel...' : 'Enter Admin Panel'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <p className="text-center text-[11px] text-slate-400">
                Authorized for Mohammad Tarek Hossen and shared administrators.
              </p>
            </div>
          )}

          {/* =========================================================
              B. MEMBER PORTAL LOGIN (ACCOUNT + PASSWORD)
          ========================================================= */}
          {activeTab === 'member' && (
            <form onSubmit={handleMemberLogin} className="space-y-4 animate-in fade-in duration-200">
              {/* Member Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Member Account *
                </label>
                <div className="relative">
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden transition-all cursor-pointer"
                  >
                    <option value="">-- Choose your name --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} {m.roomNumber ? `(${m.roomNumber})` : ''} {m.isManager ? '♚ Manager' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  All 14 preloaded bachelor mess members have individual access.
                </p>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Default: <code className="bg-slate-100 text-emerald-700 px-1 py-0.5 rounded font-mono font-bold">mess1234</code>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your assigned password"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden pr-10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Passwords are created and assigned by the Admin.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm mt-2"
              >
                <span>{isPending ? 'Verifying Credentials...' : 'Sign In to Member Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">Member Permissions:</span> View your personal meals, deposits, individual expenses, and live due/advance balance statement.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
