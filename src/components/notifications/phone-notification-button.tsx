'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Smartphone,
  Sparkles,
  X,
  Megaphone,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import {
  getNotificationPermission,
  subscribePhoneNotifications,
  unsubscribePhoneNotifications,
  showDirectPhoneNotification,
  registerServiceWorker,
} from '@/lib/notifications/notification-client';
import {
  sendTestNotificationAction,
  getInAppNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/app/actions/notifications';

export interface InAppNotification {
  id: string;
  title: string;
  titleBn: string;
  body: string;
  bodyBn: string;
  type: string;
  url: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationCenter() {
  const router = useRouter();
  const { language, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial notifications & register SW
  const loadNotifications = async () => {
    try {
      const data = await getInAppNotificationsAction();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    registerServiceWorker();
    setPermission(getNotificationPermission());
    loadNotifications();

    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTogglePushNotifications = async () => {
    setIsSubscribing(true);
    setStatusMessage(null);
    try {
      if (permission === 'granted') {
        const success = await unsubscribePhoneNotifications();
        if (success) {
          setStatusMessage(
            language === 'bn'
              ? 'এই ডিভাইসে পুশ নোটিফিকেশন বন্ধ করা হয়েছে।'
              : 'Push notifications disabled on this device.'
          );
        }
      } else {
        const res = await subscribePhoneNotifications();
        setPermission(res.permission);
        if (res.success) {
          setStatusMessage(
            language === 'bn'
              ? 'ফোনে নোটিফিকেশন সফলভাবে চালু হয়েছে!'
              : 'Phone push notifications successfully enabled!'
          );
        } else {
          setStatusMessage(res.error || 'Permission not granted.');
        }
      }
      loadNotifications();
    } finally {
      setIsSubscribing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    setStatusMessage(null);
    try {
      await sendTestNotificationAction();
      await showDirectPhoneNotification(
        language === 'bn' ? '🔔 MessMate টেস্ট অ্যালার্ট' : '🔔 MessMate Test Alert',
        language === 'bn'
          ? 'অভিনন্দন! আপনার ফোনে মেস নোটিফিকেশন সরাসরি আসছে।'
          : 'Congratulations! Mess push alerts are working on your phone.',
        '/dashboard'
      );
      setStatusMessage(
        language === 'bn'
          ? 'টেস্ট নোটিফিকেশন পাঠানো হয়েছে!'
          : 'Test notification sent to your device!'
      );
      loadNotifications();
    } catch {
      setStatusMessage(
        language === 'bn'
          ? 'টেস্ট নোটিফিকেশন তৈরি হয়েছে!'
          : 'Local notification triggered!'
      );
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleMarkAsRead = async (id: string, url: string) => {
    await markNotificationReadAction(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    setIsOpen(false);
    if (url) {
      router.push(url);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const filteredNotifications =
    activeFilter === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (language === 'bn') {
      if (diffMin < 1) return 'এইমাত্র';
      if (diffMin < 60) return `${diffMin} মিনিট আগে`;
      if (diffHour < 24) return `${diffHour} ঘণ্টা আগে`;
      return `${diffDay} দিন আগে`;
    }

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${diffDay}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Header Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
        aria-label="Notifications"
        title={language === 'bn' ? 'নোটিফিকেশন' : 'Notifications'}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed sm:absolute top-16 sm:top-12 right-2 sm:right-0 z-50 w-[94vw] sm:w-[380px] max-w-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {language === 'bn' ? 'নোটিফিকেশন' : 'Notifications'}
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {unreadCount > 0
                    ? language === 'bn'
                      ? `${unreadCount}টি অপঠিত নোটিফিকেশন`
                      : `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}`
                    : language === 'bn'
                    ? 'কোনো অপঠিত নোটিফিকেশন নেই'
                    : 'All caught up'}
                </span>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'সব পঠিত করুন' : 'Mark all read'}</span>
              </button>
            )}
          </div>

          {/* Device Push Preferences Strip */}
          <div className="px-4 py-2.5 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Smartphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-[11px] font-medium text-amber-900 dark:text-amber-200 truncate">
                {permission === 'granted'
                  ? language === 'bn'
                    ? 'মোবাইল পুশ নোটিফিকেশন চালু'
                    : 'Phone push alerts active'
                  : language === 'bn'
                  ? 'ফোনে সরাসরি নোটিফিকেশন পান'
                  : 'Get phone push alerts'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {permission === 'granted' ? (
                <button
                  onClick={handleSendTestNotification}
                  disabled={isSendingTest}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 cursor-pointer"
                >
                  {isSendingTest
                    ? language === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...'
                    : language === 'bn' ? 'টেস্ট পাঠান' : 'Test Push'}
                </button>
              ) : (
                <button
                  onClick={handleTogglePushNotifications}
                  disabled={isSubscribing}
                  className="px-2.5 py-0.5 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold shadow-xs cursor-pointer"
                >
                  {isSubscribing
                    ? language === 'bn' ? 'অপেক্ষা করুন...' : 'Enabling...'
                    : language === 'bn' ? 'অন করুন' : 'Enable'}
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-1.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {language === 'bn' ? 'সকল' : 'All'} ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                activeFilter === 'unread'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {language === 'bn' ? 'অপঠিত' : 'Unread'} ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {language === 'bn' ? 'কোনো নোটিফিকেশন নেই' : 'No notifications'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'bn'
                    ? 'নতুন নোটিশ বা বার্তা আসলে এখানে দেখতে পাবেন।'
                    : 'New notices and messages will appear here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const titleText = language === 'bn' ? notif.titleBn : notif.title;
                const bodyText = language === 'bn' ? notif.bodyBn : notif.body;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif.id, notif.url)}
                    className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                      !notif.isRead ? 'bg-orange-50/30 dark:bg-orange-950/10' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                        notif.type === 'NOTICE'
                          ? 'bg-amber-500'
                          : notif.type === 'MESSAGE'
                          ? 'bg-sky-500'
                          : 'bg-orange-500'
                      }`}
                    >
                      {notif.type === 'NOTICE' ? (
                        <Megaphone className="w-4 h-4" />
                      ) : notif.type === 'MESSAGE' ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs truncate ${
                            !notif.isRead
                              ? 'font-bold text-slate-900 dark:text-slate-100'
                              : 'font-medium text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {titleText}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {bodyText}
                      </p>
                    </div>

                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Status Toast */}
      {statusMessage && (
        <div className="fixed bottom-20 right-4 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
}

// Backward-compatible alias
export const PhoneNotificationButton = NotificationCenter;

/**
 * Opt-in banner for dashboard hero to prompt enabling push notifications
 */
export function PhoneNotificationBanner() {
  const { language } = useI18n();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    setPermission(getNotificationPermission());
    try {
      if (sessionStorage.getItem('messmate_notif_banner_hidden') === 'true') {
        setIsDismissed(true);
      }
    } catch {}
  }, []);

  if (permission === 'granted' || isDismissed) {
    return null;
  }

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      const res = await subscribePhoneNotifications();
      setPermission(res.permission);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('messmate_notif_banner_hidden', 'true');
    } catch {}
  };

  return (
    <div className="rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
          <BellRing className="w-5 h-5 text-white animate-bounce" />
        </div>
        <div className="space-y-0.5">
          <h3 className="text-sm font-extrabold tracking-tight">
            {language === 'bn'
              ? 'মেস নোটিফিকেশন আপনার ফোনে পান'
              : 'Enable Phone Push Notifications'}
          </h3>
          <p className="text-xs text-orange-100 max-w-xl">
            {language === 'bn'
              ? 'নতুন নোটিশ, বাজার শিডিউল বা ডিরেক্ট মেসেজ এলে আপনার ফোনে সরাসরি নোটিফিকেশন যাবে।'
              : 'Receive real-time push alerts on your phone whenever an announcement, notice, or message is posted.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <button
          onClick={handleEnable}
          disabled={isSubscribing}
          className="px-4 py-2 bg-white text-orange-700 hover:bg-orange-50 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>
            {isSubscribing
              ? language === 'bn' ? 'চালু করা হচ্ছে...' : 'Enabling...'
              : language === 'bn' ? 'নোটিফিকেশন চালু করুন' : 'Enable Notifications'}
          </span>
        </button>

        <button
          onClick={handleDismiss}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
          title={language === 'bn' ? 'বাতিল' : 'Dismiss'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
