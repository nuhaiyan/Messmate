'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireManager } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside request context
  }
}

export type NoticeCategory =
  | 'BAZAR_LIST'
  | 'MEAL_SCHEDULE'
  | 'SHOPPING_REQ'
  | 'EXPENSES'
  | 'ANNOUNCEMENT'
  | 'MESS_RULES'
  | 'MAINTENANCE'
  | 'EMERGENCY'
  | 'GENERAL';

export async function getNoticesAction(params?: {
  category?: string;
  month?: number;
  year?: number;
}) {
  const session = await requireAuth();

  const whereClause: any = {
    messId: session.messId,
    isArchived: false,
  };

  if (params?.category && params.category !== 'ALL') {
    whereClause.category = params.category;
  }

  if (params?.month && params?.year) {
    whereClause.OR = [
      { month: params.month, year: params.year },
      { month: null, year: null }, // Global notices like rules
    ];
  }

  const notices = await prisma.notice.findMany({
    where: whereClause,
    orderBy: [
      { isPinned: 'desc' },
      { publishedAt: 'desc' },
    ],
    include: {
      creator: {
        select: {
          name: true,
        },
      },
    },
  });

  const isManagerOrAdmin =
    session.isPrimaryAdmin || session.isAdmin || session.isManager;

  return {
    notices: notices.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      category: n.category as NoticeCategory,
      isPinned: n.isPinned,
      month: n.month,
      year: n.year,
      publishedAt: n.publishedAt.toISOString(),
      expiresAt: n.expiresAt ? n.expiresAt.toISOString() : null,
      creatorName: n.creator?.name || 'Mess Administration',
    })),
    isManagerOrAdmin,
  };
}

export async function createNoticeAction(data: {
  title: string;
  content: string;
  category: NoticeCategory;
  isPinned?: boolean;
  month?: number;
  year?: number;
  expiresAt?: string | null;
}) {
  const session = await requireManager();

  const trimmedTitle = data.title.trim();
  const trimmedContent = data.content.trim();

  if (!trimmedTitle) {
    return { success: false, error: 'Notice title is required.' };
  }
  if (!trimmedContent) {
    return { success: false, error: 'Notice content is required.' };
  }

  const notice = await prisma.notice.create({
    data: {
      messId: session.messId,
      title: trimmedTitle,
      content: trimmedContent,
      category: data.category,
      isPinned: Boolean(data.isPinned),
      month: data.month || null,
      year: data.year || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdById: session.userId,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'NOTICE_CREATE',
    entity: 'NOTICE',
    details: {
      noticeId: notice.id,
      title: trimmedTitle,
      category: data.category,
    },
  });

  safeRevalidate('/notices');
  safeRevalidate('/dashboard');

  return { success: true, noticeId: notice.id };
}

export async function updateNoticeAction(data: {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  isPinned?: boolean;
  expiresAt?: string | null;
}) {
  const session = await requireManager();

  const trimmedTitle = data.title.trim();
  const trimmedContent = data.content.trim();

  if (!trimmedTitle) {
    return { success: false, error: 'Notice title is required.' };
  }
  if (!trimmedContent) {
    return { success: false, error: 'Notice content is required.' };
  }

  const notice = await prisma.notice.findFirst({
    where: { id: data.id, messId: session.messId },
  });

  if (!notice) {
    return { success: false, error: 'Notice not found.' };
  }

  await prisma.notice.update({
    where: { id: data.id },
    data: {
      title: trimmedTitle,
      content: trimmedContent,
      category: data.category,
      isPinned: Boolean(data.isPinned),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'NOTICE_UPDATE',
    entity: 'NOTICE',
    details: { noticeId: data.id, title: trimmedTitle },
  });

  safeRevalidate('/notices');
  return { success: true };
}

export async function deleteNoticeAction(id: string) {
  const session = await requireManager();

  const notice = await prisma.notice.findFirst({
    where: { id, messId: session.messId },
  });

  if (!notice) {
    return { success: false, error: 'Notice not found.' };
  }

  await prisma.notice.update({
    where: { id },
    data: { isArchived: true },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'NOTICE_DELETE',
    entity: 'NOTICE',
    details: { noticeId: id, title: notice.title },
  });

  safeRevalidate('/notices');
  return { success: true };
}

export async function togglePinNoticeAction(id: string) {
  const session = await requireManager();

  const notice = await prisma.notice.findFirst({
    where: { id, messId: session.messId },
  });

  if (!notice) {
    return { success: false, error: 'Notice not found.' };
  }

  await prisma.notice.update({
    where: { id },
    data: { isPinned: !notice.isPinned },
  });

  safeRevalidate('/notices');
  return { success: true, isPinned: !notice.isPinned };
}
