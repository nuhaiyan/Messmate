import { setVapidDetails, sendNotification } from 'web-push';
import fs from 'fs';
import path from 'path';

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BEE0JvErukoGZE58aFI9xq4vzlnyTTdpucKABhyMsEVfLaOM8P_Zi_4UlrW6Zc65jWv66Ls8owmImnyyTAAYBgs';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'LyuK8Uic2JZ4k3oR-OcTMsnZ9X7zz5GH-xMS8SbZjpA';

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@messmate.app';

try {
  setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.error('Failed to configure webpush VAPID details:', e);
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
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');

function ensureDataFile(): StoredSubscription[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SUBS_FILE)) {
      fs.writeFileSync(SUBS_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const content = fs.readFileSync(SUBS_FILE, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading push subscriptions file:', err);
    return [];
  }
}

function writeDataFile(subs: StoredSubscription[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing push subscriptions file:', err);
  }
}

/**
 * Saves or updates a member's phone push subscription
 */
export async function savePushSubscription(data: {
  memberId: string;
  messId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}) {
  const subs = ensureDataFile();
  // Filter out any existing subscription with the same endpoint
  const filtered = subs.filter((s) => s.endpoint !== data.endpoint);

  const newSub: StoredSubscription = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    memberId: data.memberId,
    messId: data.messId,
    endpoint: data.endpoint,
    keys: data.keys,
    createdAt: new Date().toISOString(),
  };

  filtered.push(newSub);
  writeDataFile(filtered);
  return newSub;
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
  const subs = ensureDataFile();
  const messSubs = subs.filter(
    (s) => s.messId === messId && (!excludeMemberId || s.memberId !== excludeMemberId)
  );

  if (messSubs.length === 0) {
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
    messSubs.map(async (sub) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payloadStr
        );
        sentCount++;
      } catch (err: unknown) {
        failCount++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription has expired or unsubscribed
          deadEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (deadEndpoints.length > 0) {
    const cleaned = subs.filter((s) => !deadEndpoints.includes(s.endpoint));
    writeDataFile(cleaned);
  }

  return { sent: sentCount, failed: failCount };
}

/**
 * Sends a push notification directly to a specific member's phone
 */
export async function sendPushToMember(
  memberId: string,
  payload: {
    title: string;
    body: string;
    url?: string;
  }
) {
  const subs = ensureDataFile();
  const memberSubs = subs.filter((s) => s.memberId === memberId);

  if (memberSubs.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payloadStr = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/dashboard',
    icon: '/icons/icon-192.png',
  });

  let sentCount = 0;
  await Promise.all(
    memberSubs.map(async (sub) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payloadStr
        );
        sentCount++;
      } catch (err) {
        console.error('Failed to send push to member device:', err);
      }
    })
  );

  return { sent: sentCount };
}
