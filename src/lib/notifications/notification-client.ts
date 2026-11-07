'use client';

import { saveSubscriptionAction } from '@/app/actions/notifications';

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BEE0JvErukoGZE58aFI9xq4vzlnyTTdpucKABhyMsEVfLaOM8P_Zi_4UlrW6Zc65jWv66Ls8owmImnyyTAAYBgs';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return reg;
  } catch (err) {
    console.error('Service worker registration failed:', err);
    return null;
  }
}

/**
 * Checks current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

/**
 * Requests push notification permission and subscribes phone to Web Push
 */
export async function subscribePhoneNotifications(): Promise<{
  success: boolean;
  permission: NotificationPermission;
  error?: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      success: false,
      permission: 'denied',
      error: 'This browser or device does not support push notifications.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, permission, error: 'Notification permission was not granted.' };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: true, permission };
    }

    // Subscribe to PushManager
    if ('pushManager' in reg) {
      try {
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        }

        const subJson = sub.toJSON();
        if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
          await saveSubscriptionAction({
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
          });
        }
      } catch (pushErr) {
        console.warn('PushManager subscription warning (using local fallback):', pushErr);
      }
    }

    // Show initial confirmation phone notification
    await showDirectPhoneNotification(
      'MessMate নোটিফিকেশন চালু হয়েছে 🎉',
      'আপনার ফোনে মেসের নোটিফিকেশন ও মেসেজ সরাসরি আসবে।',
      '/dashboard'
    );

    return { success: true, permission: 'granted' };
  } catch (err: unknown) {
    return {
      success: false,
      permission: 'denied',
      error: err instanceof Error ? err.message : 'Unknown notification error',
    };
  }
}

/**
 * Displays a direct native phone notification using Service Worker or Notification API
 */
export async function showDirectPhoneNotification(title: string, body: string, url = '/dashboard') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        if ('vibrate' in navigator) {
          try { navigator.vibrate([200, 100, 200]); } catch {}
        }
        await reg.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `messmate-${Date.now()}`,
          data: { url },
        } as NotificationOptions);
        return;
      }
    }

    // Fallback standard Notification
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    });
  } catch (err) {
    console.error('Failed to show phone notification:', err);
  }
}
