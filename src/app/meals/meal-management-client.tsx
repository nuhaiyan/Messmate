'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Utensils,
  Calendar,
  Copy,
  Save,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { saveBulkMealsAction, copyPreviousDayMealsAction } from '@/app/actions/meals';

interface MemberMealRow {
  memberId: string;
  fullName: string;
  roomNumber: string | null;
  breakfast: number;
  lunch: number;
  dinner: number;
  monthTotal: number;
}

export function MealManagementClient({
  selectedDate,
  initialMeals,
  isManager,
  isClosed,
}: {
  selectedDate: string;
  initialMeals: MemberMealRow[];
  isManager: boolean;
  isClosed: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState(selectedDate);
  const [mealsState, setMealsState] = useState<Record<string, { b: number; l: number; d: number }>>(() => {
    const init: Record<string, { b: number; l: number; d: number }> = {};
    for (const m of initialMeals) {
      init[m.memberId] = { b: m.breakfast, l: m.lunch, d: m.dinner };
    }
    return init;
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    router.push(`/meals?date=${newDate}`);
  };

  const handleMealChange = (memberId: string, type: 'b' | 'l' | 'd', val: number) => {
    if (!isManager || isClosed) return;
    setMealsState((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [type]: val,
      },
    }));
  };

  const handleSave = async () => {
    if (!isManager) return;
    setLoading(true);
    setMessage(null);

    try {
      const payload = initialMeals.map((m) => ({
        memberId: m.memberId,
        breakfast: mealsState[m.memberId]?.b ?? 0,
        lunch: mealsState[m.memberId]?.l ?? 0,
        dinner: mealsState[m.memberId]?.d ?? 0,
      }));

      const res = await saveBulkMealsAction({
        date,
        meals: payload,
      });

      if (!res.success) throw new Error(res.error || 'Failed to save meals.');
      setMessage({ type: 'success', text: `Saved meals for ${payload.length} members successfully!` });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error saving meals.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyYesterday = async () => {
    if (!isManager || isClosed) return;
    if (!confirm(`Copy yesterday's meals into ${date}?`)) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await copyPreviousDayMealsAction(date);
      if (!res.success) throw new Error(res.error || 'Failed to copy yesterday.');
      setMessage({ type: 'success', text: "Yesterday's meals copied and applied!" });
      router.refresh();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error copying meals.' });
    } finally {
      setLoading(false);
    }
  };

  // Quick preset helper
  const setPreset = (type: 'all_full' | 'lunch_dinner' | 'all_zero') => {
    if (!isManager || isClosed) return;
    const next = { ...mealsState };
    for (const m of initialMeals) {
      if (type === 'all_full') {
        next[m.memberId] = { b: 1, l: 1, d: 1 };
      } else if (type === 'lunch_dinner') {
        next[m.memberId] = { b: 0, l: 1, d: 1 };
      } else {
        next[m.memberId] = { b: 0, l: 0, d: 0 };
      }
    }
    setMealsState(next);
  };

  // Compute daily totals
  let dailyBf = 0;
  let dailyLn = 0;
  let dailyDn = 0;
  for (const m of initialMeals) {
    const row = mealsState[m.memberId] || { b: 0, l: 0, d: 0 };
    dailyBf += row.b;
    dailyLn += row.l;
    dailyDn += row.d;
  }
  const dailyTotal = dailyBf + dailyLn + dailyDn;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Daily Meal Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Bulk meal entry for Breakfast, Lunch &amp; Dinner with fractional 0.5 support
          </p>
        </div>

        {/* Date Selector & Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-2xs">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="text-xs font-semibold text-slate-800 dark:text-slate-100 bg-transparent outline-hidden cursor-pointer"
            />
          </div>

          {isManager && !isClosed && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyYesterday}
                disabled={loading}
                className="flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Yesterday
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {loading ? 'Saving...' : 'Save Meals'}
              </Button>
            </>
          )}
        </div>
      </div>

      {isClosed && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>This month is CLOSED and locked. Meal entries are view-only.</span>
        </div>
      )}

      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Preset Toolbar (Manager Only) */}
      {isManager && !isClosed && (
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Quick Presets:</span>
          <button
            onClick={() => setPreset('all_full')}
            className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer font-medium"
          >
            All Full (1, 1, 1)
          </button>
          <button
            onClick={() => setPreset('lunch_dinner')}
            className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer font-medium"
          >
            Lunch &amp; Dinner (0, 1, 1)
          </button>
          <button
            onClick={() => setPreset('all_zero')}
            className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer font-medium"
          >
            Clear All (0, 0, 0)
          </button>
        </div>
      )}

      {/* Daily Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Breakfast Total</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{dailyBf}</p>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lunch Total</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{dailyLn}</p>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dinner Total</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{dailyDn}</p>
        </div>
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-2xs">
          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Today’s Grand Total</p>
          <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">{dailyTotal} Meals</p>
        </div>
      </div>

      {/* Fast Entry Grid Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4 text-center">Breakfast</th>
                  <th className="py-3 px-4 text-center">Lunch</th>
                  <th className="py-3 px-4 text-center">Dinner</th>
                  <th className="py-3 px-4 text-center font-bold">Today Total</th>
                  <th className="py-3 px-4 text-right">Month Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {initialMeals.map((m) => {
                  const current = mealsState[m.memberId] || { b: 0, l: 0, d: 0 };
                  const rowTotal = current.b + current.l + current.d;

                  return (
                    <tr key={m.memberId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {m.fullName}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {m.roomNumber || '—'}
                      </td>

                      {/* Breakfast Input */}
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="99"
                          disabled={!isManager || isClosed}
                          value={current.b === 0 ? 0 : current.b}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            handleMealChange(m.memberId, 'b', isNaN(val) ? 0 : Math.max(0, val));
                          }}
                          aria-label={`Breakfast for ${m.fullName}`}
                          className={`w-16 py-1 px-1.5 text-center rounded-lg border text-xs font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed ${
                            current.b > 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        />
                      </td>

                      {/* Lunch Input */}
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="99"
                          disabled={!isManager || isClosed}
                          value={current.l === 0 ? 0 : current.l}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            handleMealChange(m.memberId, 'l', isNaN(val) ? 0 : Math.max(0, val));
                          }}
                          aria-label={`Lunch for ${m.fullName}`}
                          className={`w-16 py-1 px-1.5 text-center rounded-lg border text-xs font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed ${
                            current.l > 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        />
                      </td>

                      {/* Dinner Input */}
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="99"
                          disabled={!isManager || isClosed}
                          value={current.d === 0 ? 0 : current.d}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            handleMealChange(m.memberId, 'd', isNaN(val) ? 0 : Math.max(0, val));
                          }}
                          aria-label={`Dinner for ${m.fullName}`}
                          className={`w-16 py-1 px-1.5 text-center rounded-lg border text-xs font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed ${
                            current.d > 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        />
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-slate-100">
                        {rowTotal}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400">
                        {m.monthTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
