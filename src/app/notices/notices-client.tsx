'use client';

import React, { useState, useTransition } from 'react';
import {
  Megaphone,
  Pin,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  AlertTriangle,
  ShoppingCart,
  Utensils,
  BookOpen,
  Wrench,
  Info,
  CheckCircle2,
  X,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { formatDate } from '@/lib/utils';
import {
  createNoticeAction,
  updateNoticeAction,
  deleteNoticeAction,
  togglePinNoticeAction,
  NoticeCategory,
} from '@/app/actions/notices';

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  isPinned: boolean;
  month: number | null;
  year: number | null;
  publishedAt: string;
  expiresAt: string | null;
  creatorName: string;
}

export interface BazarScheduleNoticeItem {
  id: string;
  memberName: string;
  memberPhone: string | null;
  startDate: string;
  endDate: string;
  formattedRange: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  notes: string | null;
}

interface NoticesClientProps {
  initialNotices: NoticeItem[];
  bazarSchedules?: BazarScheduleNoticeItem[];
  isManagerOrAdmin: boolean;
  selectedMonth: number;
  selectedYear: number;
}

export function NoticesClient({
  initialNotices,
  bazarSchedules = [],
  isManagerOrAdmin,
  selectedMonth,
  selectedYear,
}: NoticesClientProps) {
  const { t } = useI18n();
  const [notices, setNotices] = useState<NoticeItem[]>(initialNotices);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<NoticeCategory>('ANNOUNCEMENT');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formExpiresAt, setFormExpiresAt] = useState('');

  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categoriesList: { key: NoticeCategory; label: string; icon: any; color: string }[] = [
    { key: 'ANNOUNCEMENT', label: t.notices?.categories?.ANNOUNCEMENT || 'Announcement', icon: Megaphone, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
    { key: 'BAZAR_SCHEDULE', label: 'Bazar Schedule', icon: Calendar, color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-300' },
    { key: 'BAZAR_LIST', label: t.notices?.categories?.BAZAR_LIST || 'Bazar List', icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
    { key: 'MEAL_SCHEDULE', label: t.notices?.categories?.MEAL_SCHEDULE || 'Meal Schedule', icon: Utensils, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 border-teal-200' },
    { key: 'SHOPPING_REQ', label: t.notices?.categories?.SHOPPING_REQ || 'Shopping Req', icon: ShoppingCart, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 border-sky-200' },
    { key: 'EXPENSES', label: t.notices?.categories?.EXPENSES || 'Expenses Notice', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200' },
    { key: 'MESS_RULES', label: t.notices?.categories?.MESS_RULES || 'Mess Rules', icon: ShieldCheck, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
    { key: 'MAINTENANCE', label: t.notices?.categories?.MAINTENANCE || 'Maintenance', icon: Wrench, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200' },
    { key: 'EMERGENCY', label: t.notices?.categories?.EMERGENCY || 'Emergency', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200' },
    { key: 'GENERAL', label: t.notices?.categories?.GENERAL || 'General', icon: Info, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900 border-slate-200' },
  ];

  const openCreateModal = () => {
    setEditingNoticeId(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('ANNOUNCEMENT');
    setFormIsPinned(false);
    setFormExpiresAt('');
    setIsModalOpen(true);
  };

  const openEditModal = (notice: NoticeItem) => {
    setEditingNoticeId(notice.id);
    setFormTitle(notice.title);
    setFormContent(notice.content);
    setFormCategory(notice.category);
    setFormIsPinned(notice.isPinned);
    setFormExpiresAt(notice.expiresAt ? notice.expiresAt.split('T')[0] : '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagerOrAdmin) return;
    setSuccessMsg(null);
    setErrorMsg(null);

    startTransition(async () => {
      if (editingNoticeId) {
        const res = await updateNoticeAction({
          id: editingNoticeId,
          title: formTitle,
          content: formContent,
          category: formCategory,
          isPinned: formIsPinned,
          expiresAt: formExpiresAt ? `${formExpiresAt}T23:59:59Z` : null,
        });

        if (res.success) {
          setNotices((prev) =>
            prev.map((n) =>
              n.id === editingNoticeId
                ? {
                    ...n,
                    title: formTitle.trim(),
                    content: formContent.trim(),
                    category: formCategory,
                    isPinned: formIsPinned,
                    expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
                  }
                : n
            )
          );
          setIsModalOpen(false);
          setSuccessMsg('Notice updated successfully.');
        } else {
          setErrorMsg(res.error || 'Failed to update notice.');
        }
      } else {
        const res = await createNoticeAction({
          title: formTitle,
          content: formContent,
          category: formCategory,
          isPinned: formIsPinned,
          month: selectedMonth,
          year: selectedYear,
          expiresAt: formExpiresAt ? `${formExpiresAt}T23:59:59Z` : null,
        });

        if (res.success && res.noticeId) {
          const newNotice: NoticeItem = {
            id: res.noticeId,
            title: formTitle.trim(),
            content: formContent.trim(),
            category: formCategory,
            isPinned: formIsPinned,
            month: selectedMonth,
            year: selectedYear,
            publishedAt: new Date().toISOString(),
            expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
            creatorName: 'Admin / Manager',
          };
          setNotices((prev) => [newNotice, ...prev]);
          setIsModalOpen(false);
          setSuccessMsg('Notice published successfully on digital billboard.');
        } else {
          setErrorMsg(res.error || 'Failed to publish notice.');
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(t.notices?.confirmDelete || 'Are you sure you want to delete this notice?')) return;
    startTransition(async () => {
      const res = await deleteNoticeAction(id);
      if (res.success) {
        setNotices((prev) => prev.filter((n) => n.id !== id));
      }
    });
  };

  const handleTogglePin = (id: string) => {
    startTransition(async () => {
      const res = await togglePinNoticeAction(id);
      if (res.success) {
        setNotices((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isPinned: res.isPinned! } : n))
        );
      }
    });
  };

  const filteredNotices = notices.filter(
    (n) => selectedCategory === 'ALL' || n.category === selectedCategory
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            {t.notices?.title || 'Mess Billboard & Notices'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t.notices?.subtitle || 'Monthly announcements, bazar lists, rules, and schedules'}
          </p>
        </div>

        {isManagerOrAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t.notices?.createNotice || 'Create New Notice'}</span>
          </button>
        )}
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Live Synced Bazar Schedule Billboard */}
      {bazarSchedules.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Bazar Schedule Notice</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                    Auto-Synced
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Asia/Dhaka real-time schedule tracking for monthly mess bazar duties
                </p>
              </div>
            </div>
            <a
              href="/bazar"
              className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Manage & View Full Bazar Details</span>
              <span>→</span>
            </a>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {/* Ongoing Buyer */}
            {(() => {
              const ongoing = bazarSchedules.find((s) => s.status === 'ONGOING');
              return (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-amber-300/80 dark:border-amber-700/50 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                      ONGOING BAZAR PERSON
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {ongoing ? ongoing.memberName : 'No ongoing duty today'}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {ongoing ? ongoing.formattedRange : 'Schedule up to date'}
                    </p>
                  </div>
                  {ongoing?.memberPhone && (
                    <span className="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                      {ongoing.memberPhone}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Upcoming Buyer */}
            {(() => {
              const upcoming = bazarSchedules.find((s) => s.status === 'UPCOMING');
              return (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border border-blue-200 dark:border-blue-900/50 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200">
                      NEXT UPCOMING BAZAR PERSON
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {upcoming ? upcoming.memberName : 'No upcoming schedules'}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {upcoming ? upcoming.formattedRange : 'Check with Manager'}
                    </p>
                  </div>
                  {upcoming?.memberPhone && (
                    <span className="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                      {upcoming.memberPhone}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Schedule Timeline Strip */}
          <div className="bg-white/90 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 p-3 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {bazarSchedules.slice(0, 7).map((s) => {
                const isOngoing = s.status === 'ONGOING';
                const isUpcoming = s.status === 'UPCOMING';
                return (
                  <div
                    key={s.id}
                    className={`px-3 py-2 rounded-lg border text-xs flex flex-col gap-0.5 ${
                      isOngoing
                        ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs'
                        : isUpcoming
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{s.memberName}</span>
                      <span className="text-[10px] uppercase font-bold opacity-80">{s.status}</span>
                    </div>
                    <span className="text-[11px] opacity-90">{s.formattedRange}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          {t.notices?.allCategories || 'All Categories'} ({notices.length})
        </button>

        {categoriesList.map((cat) => {
          const Icon = cat.icon;
          const count = notices.filter((n) => n.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                selectedCategory === cat.key
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              {count > 0 && <span className="opacity-75">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Billboard Notice Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredNotices.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <Megaphone className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-medium">{t.notices?.noNotices || 'No notices published for this period.'}</p>
          </div>
        ) : (
          filteredNotices.map((notice) => {
            const catMeta = categoriesList.find((c) => c.key === notice.category) || categoriesList[0];
            const Icon = catMeta.icon;

            return (
              <div
                key={notice.id}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between shadow-2xs relative ${
                  notice.isPinned
                    ? 'border-amber-400/80 dark:border-amber-500/60 ring-2 ring-amber-400/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Notice Top Strip */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${catMeta.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{catMeta.label}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      {notice.isPinned && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 px-2 py-0.5 rounded-md">
                          <Pin className="w-3 h-3 fill-amber-500" />
                          <span>Pinned</span>
                        </span>
                      )}

                      {isManagerOrAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(notice.id)}
                            title={notice.isPinned ? 'Unpin Notice' : 'Pin Notice'}
                            className="p-1 rounded-md text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(notice)}
                            title="Edit Notice"
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(notice.id)}
                            title="Delete Notice"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 leading-snug">
                    {notice.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {notice.content}
                  </p>
                </div>

                {/* Notice Footer */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatDate(notice.publishedAt)}
                  </span>
                  <span>By {notice.creatorName}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Notice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              {editingNoticeId ? t.notices?.editNotice || 'Edit Notice' : t.notices?.createNotice || 'Create New Notice'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Publish announcements, bazar lists, and monthly schedules for roommates.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  placeholder="e.g. Monthly Grocery Shopping Requirements"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.notices?.category || 'Notice Category'} *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as NoticeCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expires On (Optional)
                  </label>
                  <input
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notice Details / Content *
                </label>
                <textarea
                  rows={5}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  required
                  placeholder="Write notice instructions, shopping items, or schedule rules..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="pinCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 text-amber-500" />
                  {t.notices?.pinNotice || 'Pin to Top of Billboard'}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isPending ? 'Publishing...' : editingNoticeId ? 'Update Notice' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
