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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Daily Meal Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bulk meal entry for Breakfast, Lunch & Dinner with fractional 0.5 support
          </p>
        </div>

        {/* Date Selector & Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-2xs">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent outline-hidden cursor-pointer"
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
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This month is CLOSED and locked. Meal entries are view-only.</span>
        </div>
      )}

      {message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Preset Toolbar (Manager Only) */}
      {isManager && !isClosed && (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="font-semibold text-slate-700">Quick Presets:</span>
          <button
            onClick={() => setPreset('all_full')}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer font-medium"
          >
            All Full (1, 1, 1)
          </button>
          <button
            onClick={() => setPreset('lunch_dinner')}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer font-medium"
          >
            Lunch & Dinner (0, 1, 1)
          </button>
          <button
            onClick={() => setPreset('all_zero')}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer font-medium"
          >
            Clear All (0, 0, 0)
          </button>
        </div>
      )}

      {/* Daily Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <p className="text-xs text-slate-500 font-medium">Breakfast Total</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{dailyBf}</p>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <p className="text-xs text-slate-500 font-medium">Lunch Total</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{dailyLn}</p>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <p className="text-xs text-slate-500 font-medium">Dinner Total</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{dailyDn}</p>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl shadow-2xs">
          <p className="text-xs text-emerald-700 font-semibold">Today’s Grand Total</p>
          <p className="text-xl font-bold text-emerald-800 mt-1">{dailyTotal} Meals</p>
        </div>
      </div>

      {/* Fast Entry Grid Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100">
                {initialMeals.map((m) => {
                  const current = mealsState[m.memberId] || { b: 0, l: 0, d: 0 };
                  const rowTotal = current.b + current.l + current.d;

                  return (
                    <tr key={m.memberId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {m.fullName}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {m.roomNumber || '—'}
                      </td>

                      {/* Breakfast Select / Input */}
                      <td className="py-2.5 px-4 text-center">
                        <select
                          disabled={!isManager || isClosed}
                          value={current.b}
                          onChange={(e) => handleMealChange(m.memberId, 'b', parseFloat(e.target.value))}
                          aria-label={`Breakfast for ${m.fullName}`}
                          className={`w-16 py-1 px-2 text-center rounded-md border text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                            current.b > 0
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <option value="0">0</option>
                          <option value="0.5">0.5</option>
                          <option value="1">1</option>
                          <option value="1.5">1.5</option>
                          <option value="2">2</option>
                        </select>
                      </td>

                      {/* Lunch Select / Input */}
                      <td className="py-2.5 px-4 text-center">
                        <select
                          disabled={!isManager || isClosed}
                          value={current.l}
                          onChange={(e) => handleMealChange(m.memberId, 'l', parseFloat(e.target.value))}
                          aria-label={`Lunch for ${m.fullName}`}
                          className={`w-16 py-1 px-2 text-center rounded-md border text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                            current.l > 0
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <option value="0">0</option>
                          <option value="0.5">0.5</option>
                          <option value="1">1</option>
                          <option value="1.5">1.5</option>
                          <option value="2">2</option>
                        </select>
                      </td>

                      {/* Dinner Select / Input */}
                      <td className="py-2.5 px-4 text-center">
                        <select
                          disabled={!isManager || isClosed}
                          value={current.d}
                          onChange={(e) => handleMealChange(m.memberId, 'd', parseFloat(e.target.value))}
                          aria-label={`Dinner for ${m.fullName}`}
                          className={`w-16 py-1 px-2 text-center rounded-md border text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                            current.d > 0
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <option value="0">0</option>
                          <option value="0.5">0.5</option>
                          <option value="1">1</option>
                          <option value="1.5">1.5</option>
                          <option value="2">2</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {rowTotal}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-600">
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
