import { setVapidDetails, sendNotification } from 'web-push';
import { prisma } from '@/lib/prisma';

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BEE0JvErukoGZE58aFI9xq4vzlnyTTdpucKABhyMsEVfLaOM8P_Zi_4UlrW6Zc65jWv66Ls8owmImnyyTAAYBgs';

const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@messmate.app';

let isVapidConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    isVapidConfigured = true;
  } catch (e) {
    console.error('Failed to configure webpush VAPID details:', e);
  }
} else {
  console.warn('VAPID_PRIVATE_KEY or NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing. Web push dispatch will be disabled.');
}

export interface StoredSubscription {
  id: string;
  memberId: string;
  messId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt?: string | Date;
}

/**
 * Saves or updates a member's phone push subscription in PostgreSQL
 */
export async function savePushSubscription(data: {
  memberId: string;
  messId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}) {
  try {
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        messId: data.messId,
        memberId: data.memberId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent || null,
      },
      update: {
        messId: data.messId,
        memberId: data.memberId,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent || null,
      },
    });

    return {
      id: sub.id,
      memberId: sub.memberId,
      messId: sub.messId,
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
  } catch (err) {
    console.error('Failed to save push subscription in database:', err);
    throw err;
  }
}

/**
 * Unsubscribes / removes a device push subscription
 */
export async function removePushSubscription(endpoint: string) {
  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to remove push subscription:', err);
    return { success: false };
  }
}

/**
 * Sends a push notification payload to all subscribed devices of a Mess
 */
export async function sendPushToMess(
  messId: string,
  payload: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
  },
  excludeMemberId?: string
) {
  if (!isVapidConfigured) {
    return { sent: 0, failed: 0, reason: 'VAPID not configured' };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      messId,
      ...(excludeMemberId ? { memberId: { not: excludeMemberId } } : {}),
    },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payloadStr = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/dashboard',
    tag: payload.tag || 'messmate-update',
    icon: '/icons/icon-192.png',
  });

  const deadEndpoints: string[] = [];
  let sentCount = 0;
  let failCount = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payloadStr
        );
        sentCount++;
      } catch (err: unknown) {
        failCount++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          deadEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (deadEndpoints.length > 0) {
    try {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: deadEndpoints } },
      });
    } catch (cleanupErr) {
      console.error('Failed to cleanup dead endpoints:', cleanupErr);
    }
  }

  return { sent: sentCount, failed: failCount };
}

/**
 * Sends a push notification directly to specific members' phones (e.g. for Direct Messages or assigned tasks)
 */
export async function sendPushToMembers(
  memberIds: string[],
  payload: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
  }
) {
  if (!isVapidConfigured || memberIds.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      memberId: { in: memberIds },
    },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payloadStr = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/dashboard',
    tag: payload.tag || 'messmate-direct',
    icon: '/icons/icon-192.png',
  });

  const deadEndpoints: string[] = [];
  let sentCount = 0;
  let failCount = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payloadStr
        );
        sentCount++;
      } catch (err: unknown) {
        failCount++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          deadEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (deadEndpoints.length > 0) {
    try {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: deadEndpoints } },
      });
    } catch {}
  }

  return { sent: sentCount, failed: failCount };
}

/**
 * Sends a push notification directly to a single member's phone
 */
export async function sendPushToMember(
  memberId: string,
  payload: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
  }
) {
  return sendPushToMembers([memberId], payload);
}
