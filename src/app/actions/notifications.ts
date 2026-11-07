'use server';

import { requireAuth } from '@/lib/auth/session';
import { savePushSubscription, sendPushToMess, sendPushToMember } from '@/lib/notifications/web-push';

export async function saveSubscriptionAction(data: {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}) {
  const session = await requireAuth();

  const sub = await savePushSubscription({
    memberId: session.memberId,
    messId: session.messId,
    endpoint: data.endpoint,
    keys: data.keys,
  });

  return { success: true, id: sub.id };
}

export async function sendTestNotificationAction() {
  const session = await requireAuth();

  const res = await sendPushToMember(session.memberId, {
    title: '🔔 MessMate টেস্ট নোটিফিকেশন',
    body: `হ্যালো ${session.name}! আপনার ফোনে ওয়েব অ্যাপের নোটিফিকেশন সফলভাবে কাজ করছে।`,
    url: '/dashboard',
  });

  return { success: true, count: res.sent };
}

export async function broadcastNoticePush(title: string, snippet: string) {
  const session = await requireAuth();

  return await sendPushToMess(
    session.messId,
    {
      title: `📢 নতুন মেস নোটিশ: ${title}`,
      body: snippet || 'মেসের নতুন নোটিশ দেখতে এখানে ট্যাপ করুন।',
      url: '/notices',
      tag: 'mess-notice',
    },
    session.memberId // Don't push to self
  );
}

export async function broadcastMessagePush(senderName: string, text: string, convId: string) {
  const session = await requireAuth();

  return await sendPushToMess(
    session.messId,
    {
      title: `💬 ${senderName} (মেস বার্তা)`,
      body: text.length > 80 ? text.slice(0, 77) + '...' : text,
      url: `/messages`,
      tag: `mess-chat-${convId}`,
    },
    session.memberId // Don't push to self
  );
}
