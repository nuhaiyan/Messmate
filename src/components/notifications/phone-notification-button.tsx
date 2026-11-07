'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Check, Send, Smartphone, Sparkles, X } from 'lucide-react';
import {
  getNotificationPermission,
  subscribePhoneNotifications,
  showDirectPhoneNotification,
  registerServiceWorker,
} from '@/lib/notifications/notification-client';
import { sendTestNotificationAction } from '@/app/actions/notifications';

export function PhoneNotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  useEffect(() => {
    // Register SW on load
    registerServiceWorker();
    const p = getNotificationPermission();
    setPermission(p);

    try {
      const dismissed = sessionStorage.getItem('messmate_notif_dismissed');
      if (dismissed === 'true') {
        setIsBannerDismissed(true);
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    setStatusMessage(null);
    try {
      const res = await subscribePhoneNotifications();
      setPermission(res.permission);
      if (res.success) {
        setStatusMessage('ফোনে নোটিফিকেশন সফলভাবে চালু হয়েছে!');
        setTimeout(() => setStatusMessage(null), 5000);
      } else {
        setStatusMessage(res.error || 'নোটিফিকেশন অনুমতি পাওয়া যায়নি।');
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    setStatusMessage(null);
    try {
      // 1. Trigger via server action (web push)
      await sendTestNotificationAction();

      // 2. Also trigger local phone notification for immediate instant vibration & banner
      await showDirectPhoneNotification(
        '🔔 MessMate টেস্ট অ্যালার্ট',
        'অভিনন্দন! আপনার ফোনে মেস নোটিফিকেশন সরাসরি আসছে।',
        '/dashboard'
      );

      setStatusMessage('টেস্ট নোটিফিকেশন আপনার ফোনে পাঠানো হয়েছে!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      // Fallback local
      await showDirectPhoneNotification(
        '🔔 MessMate টেস্ট অ্যালার্ট',
        'অভিনন্দন! আপনার ফোনে মেস নোটিফিকেশন সরাসরি আসছে।',
        '/dashboard'
      );
      setStatusMessage('টেস্ট নোটিফিকেশন তৈরি হয়েছে!');
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDismiss = () => {
    setIsBannerDismissed(true);
    try {
      sessionStorage.setItem('messmate_notif_dismissed', 'true');
    } catch {
      // Ignore
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Top Bar Notification Control Button */}
      {permission === 'granted' ? (
        <button
          onClick={handleSendTestNotification}
          disabled={isSendingTest}
          title="ফোনে টেস্ট নোটিফিকেশন পাঠান"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all cursor-pointer shadow-2xs"
        >
          <BellRing className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isSendingTest ? 'animate-bounce' : ''}`} />
          <span className="hidden sm:inline">
            {isSendingTest ? 'পাঠানো হচ্ছে...' : 'টেস্ট নোটিফিকেশন'}
          </span>
          <span className="sm:hidden">নোটিফিকেশন</span>
        </button>
      ) : (
        <button
          onClick={handleEnableNotifications}
          disabled={isSubscribing}
          title="ফোনে সরাসরি নোটিফিকেশন চালু করুন"
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all cursor-pointer animate-pulse"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{isSubscribing ? 'অনুমতি চাওয়া হচ্ছে...' : 'নোটিফিকেশন অন করুন'}</span>
        </button>
      )}

      {/* Floating Status / Toast */}
      {statusMessage && (
        <div className="fixed bottom-20 right-4 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Dedicated Banner component for Dashboard / Profile to prompt enabling push notifications
 */
export function PhoneNotificationBanner() {
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
    } catch {
      // Ignore
    }
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
    } catch {
      // Ignore
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-emerald-500/10 border border-amber-300 dark:border-amber-700/60 shadow-xs flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
            ফোনে সরাসরি মেসের নোটিফিকেশন পেতে চান?
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
            নোটিশ, বাজার খরচ ও বার্তা সরাসরি আপনার ফোনের নোটিফিকেশন বারে দেখাবে।
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleEnable}
          disabled={isSubscribing}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          {isSubscribing ? 'চালু হচ্ছে...' : 'নোটিফিকেশন অন করুন'}
        </button>
        <button
          onClick={handleDismiss}
          title="বাতিল করুন"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
