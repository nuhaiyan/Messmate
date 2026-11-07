'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import {
  savePushSubscription,
  removePushSubscription,
  sendPushToMess,
  sendPushToMembers,
  sendPushToMember,
} from '@/lib/notifications/web-push';

export async function saveSubscriptionAction(data: {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}) {
  const session = await requireAuth();

  const sub = await savePushSubscription({
    memberId: session.memberId,
    messId: session.messId,
    endpoint: data.endpoint,
    keys: data.keys,
    userAgent: data.userAgent,
  });

  return { success: true, id: sub.id };
}

export async function removeSubscriptionAction(endpoint: string) {
  await requireAuth();
  const res = await removePushSubscription(endpoint);
  return res;
}

export async function sendTestNotificationAction() {
  const session = await requireAuth();

  // Create in-app notification entry
  await prisma.notification.create({
    data: {
      messId: session.messId,
      memberId: session.memberId,
      title: 'Test Notification Received',
      titleBn: 'টেস্ট নোটিফিকেশন পৌঁছেছে',
      body: `Hello ${session.name}! Web push notifications and in-app alerts are active on your device.`,
      bodyBn: `হ্যালো ${session.name}! আপনার ডিভাইসে পুশ নোটিফিকেশন ও ইন-অ্যাপ অ্যালার্ট সঠিকভাবে চালু আছে।`,
      type: 'SYSTEM',
      url: '/dashboard',
    },
  });

  const res = await sendPushToMember(session.memberId, {
    title: '🔔 MessMate টেস্ট নোটিফিকেশন',
    body: `হ্যালো ${session.name}! আপনার ফোনে ওয়েব অ্যাপের নোটিফিকেশন সফলভাবে কাজ করছে।`,
    url: '/dashboard',
    tag: 'messmate-test',
  });

  return { success: true, count: res.sent };
}

export async function broadcastNoticePush(title: string, snippet: string) {
  const session = await requireAuth();

  // 1. Create in-app broadcast notification for everyone
  await prisma.notification.create({
    data: {
      messId: session.messId,
      memberId: null, // Broadcast to all
      title: `Notice: ${title}`,
      titleBn: `নতুন নোটিশ: ${title}`,
      body: snippet || 'Tap to view the new mess billboard notice.',
      bodyBn: snippet || 'মেসের নতুন নোটিশ দেখতে এখানে ট্যাপ করুন।',
      type: 'NOTICE',
      url: '/notices',
    },
  });

  // 2. Dispatch push to all other members in the mess
  return await sendPushToMess(
    session.messId,
    {
      title: `📢 নতুন মেস নোটিশ: ${title}`,
      body: snippet || 'মেসের নতুন নোটিশ দেখতে এখানে ট্যাপ করুন।',
      url: '/notices',
      tag: 'mess-notice',
    },
    session.memberId // Don't push to sender
  );
}

export async function broadcastMessagePush(senderName: string, text: string, convId: string) {
  const session = await requireAuth();

  // Inspect the conversation to know if it's a DM or group chat, and get participants
  const conv = await prisma.conversation.findUnique({
    where: { id: convId },
    include: {
      participants: {
        select: { memberId: true },
      },
    },
  });

  if (!conv) return { sent: 0 };

  // Filter out the sender
  const recipientMemberIds = conv.participants
    .map((p) => p.memberId)
    .filter((id) => id !== session.memberId);

  if (recipientMemberIds.length === 0) return { sent: 0 };

  const snippet = text.length > 80 ? text.slice(0, 77) + '...' : text;

  // Create in-app notifications for each recipient
  await Promise.all(
    recipientMemberIds.map((mId) =>
      prisma.notification.create({
        data: {
          messId: session.messId,
          memberId: mId,
          title: conv.isGroup ? `Message in ${conv.title || 'Community'}` : `Message from ${senderName}`,
          titleBn: conv.isGroup ? `কমিউনিটিতে নতুন বার্তা: ${senderName}` : `${senderName}-এর কাছ থেকে বার্তা`,
          body: snippet,
          bodyBn: snippet,
          type: 'MESSAGE',
          url: '/messages',
        },
      })
    )
  );

  // Send push only to the participants of this conversation!
  return await sendPushToMembers(recipientMemberIds, {
    title: conv.isGroup ? `💬 ${senderName} (${conv.title || 'কমিউনিটি'})` : `💬 ${senderName}`,
    body: snippet,
    url: '/messages',
    tag: `mess-chat-${convId}`,
  });
}

export async function getInAppNotificationsAction() {
  const session = await requireAuth();

  const notifications = await prisma.notification.findMany({
    where: {
      messId: session.messId,
      OR: [
        { memberId: session.memberId },
        { memberId: null },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      titleBn: n.titleBn || n.title,
      body: n.body,
      bodyBn: n.bodyBn || n.body,
      type: n.type,
      url: n.url,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

export async function markNotificationReadAction(notificationId: string) {
  const session = await requireAuth();

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      messId: session.messId,
    },
    data: {
      isRead: true,
    },
  });

  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const session = await requireAuth();

  await prisma.notification.updateMany({
    where: {
      messId: session.messId,
      OR: [
        { memberId: session.memberId },
        { memberId: null },
      ],
    },
    data: {
      isRead: true,
    },
  });

  return { success: true };
}
