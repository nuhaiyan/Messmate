'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/session';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside request context
  }
}

/**
 * Ensures the common group conversation exists and all active mess members are joined.
 */
async function ensureGroupConversation(messId: string) {
  let group = await prisma.conversation.findFirst({
    where: { messId, isGroup: true },
    orderBy: { createdAt: 'asc' },
    include: { participants: true },
  });

  const activeMembers = await prisma.messMember.findMany({
    where: { messId, isActive: true, isArchived: false },
    select: { id: true },
  });

  if (!group) {
    const newGroup = await prisma.conversation.create({
      data: {
        messId,
        isGroup: true,
        title: 'Mess Community Common Room',
        participants: {
          create: activeMembers.map((m) => ({
            memberId: m.id,
          })),
        },
      },
    });
    return newGroup.id;
  }

  // Check if any active member is missing from the group
  const existingIds = new Set(group.participants.map((p) => p.memberId));
  const missingMembers = activeMembers.filter((m) => !existingIds.has(m.id));

  if (missingMembers.length > 0) {
    await prisma.conversationParticipant.createMany({
      data: missingMembers.map((m) => ({
        conversationId: group.id,
        memberId: m.id,
      })),
    });
  }

  return group.id;
}

/**
 * Returns all conversations for the current member:
 * - Common group chat
 * - Direct chats (or members available for direct chat)
 */
export async function getConversationsAction() {
  const session = await requireAuth();

  const groupConvId = await ensureGroupConversation(session.messId);

  // Fetch all active members in this mess to list for direct messaging
  const allMembers = await prisma.messMember.findMany({
    where: { messId: session.messId, isActive: true, isArchived: false },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      roomNumber: true,
      isPrimaryAdmin: true,
      isManager: true,
      isAdmin: true,
    },
    orderBy: { fullName: 'asc' },
  });

  // Fetch all conversations where current member is a participant
  const userConversations = await prisma.conversation.findMany({
    where: {
      messId: session.messId,
      participants: {
        some: { memberId: session.memberId },
      },
    },
    include: {
      participants: {
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              isPrimaryAdmin: true,
              isManager: true,
              isAdmin: true,
            },
          },
        },
      },
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { id: true, fullName: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Transform conversations with participant info and unread status
  const conversations = userConversations.map((c) => {
    const myParticipant = c.participants.find((p) => p.memberId === session.memberId);
    const otherParticipant = c.participants.find((p) => p.memberId !== session.memberId);
    const lastMsg = c.messages[0];

    let name = c.title || 'Conversation';
    let avatarUrl: string | null = null;
    let otherMemberId: string | null = null;

    if (!c.isGroup && otherParticipant) {
      name = otherParticipant.member.fullName;
      avatarUrl = otherParticipant.member.avatarUrl;
      otherMemberId = otherParticipant.member.id;
    }

    const unread =
      lastMsg && myParticipant && lastMsg.createdAt > myParticipant.lastReadAt && lastMsg.senderMemberId !== session.memberId;

    return {
      id: c.id,
      isGroup: c.isGroup,
      title: name,
      avatarUrl,
      otherMemberId,
      unread: Boolean(unread),
      lastMessage: lastMsg
        ? {
            text: lastMsg.content,
            senderName: lastMsg.sender.fullName,
            time: lastMsg.createdAt.toISOString(),
          }
        : null,
      updatedAt: c.updatedAt.toISOString(),
    };
  });

  return {
    groupConvId,
    conversations,
    allMembers: allMembers.map((m) => ({
      id: m.id,
      name: m.fullName,
      avatarUrl: m.avatarUrl,
      roomNumber: m.roomNumber,
      isPrimaryAdmin: m.isPrimaryAdmin,
      isManager: m.isManager,
      isAdmin: m.isAdmin,
      isCurrentUser: m.id === session.memberId,
    })),
    currentMemberId: session.memberId,
    canModerate: session.isPrimaryAdmin || session.isAdmin || session.isManager,
  };
}

/**
 * Finds or creates a 1-to-1 direct conversation with another member.
 */
export async function getOrCreateDirectConversationAction(targetMemberId: string) {
  const session = await requireAuth();

  if (targetMemberId === session.memberId) {
    throw new Error('Cannot start conversation with yourself');
  }

  // Check if a direct conversation already exists between the two
  const existing = await prisma.conversation.findFirst({
    where: {
      messId: session.messId,
      isGroup: false,
      AND: [
        { participants: { some: { memberId: session.memberId } } },
        { participants: { some: { memberId: targetMemberId } } },
      ],
    },
  });

  if (existing) {
    return { conversationId: existing.id };
  }

  // Create new direct conversation
  const created = await prisma.conversation.create({
    data: {
      messId: session.messId,
      isGroup: false,
      participants: {
        create: [{ memberId: session.memberId }, { memberId: targetMemberId }],
      },
    },
  });

  safeRevalidate('/messages');
  return { conversationId: created.id };
}

/**
 * Fetches messages for a specific conversation.
 */
export async function getMessagesAction(conversationId: string) {
  const session = await requireAuth();

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      messId: session.messId,
    },
    include: {
      participants: {
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              isPrimaryAdmin: true,
              isManager: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Update participant lastReadAt
  await prisma.conversationParticipant.updateMany({
    where: {
      conversationId,
      memberId: session.memberId,
    },
    data: {
      lastReadAt: new Date(),
    },
  });

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      isDeleted: false,
    },
    orderBy: { createdAt: 'asc' },
    take: 500,
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          isPrimaryAdmin: true,
          isManager: true,
        },
      },
    },
  });

  return {
    conversation: {
      id: conversation.id,
      isGroup: conversation.isGroup,
      title: conversation.title,
    },
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.sender.id,
      senderName: m.sender.fullName,
      senderAvatar: m.sender.avatarUrl,
      isPrimaryAdmin: m.sender.isPrimaryAdmin,
      isManager: m.sender.isManager,
      isOwn: m.sender.id === session.memberId,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/**
 * Sends a message in a conversation.
 */
export async function sendMessageAction(conversationId: string, content: string) {
  const session = await requireAuth();

  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: 'Message cannot be empty.' };
  }

  // Ensure member is participant
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_memberId: {
        conversationId,
        memberId: session.memberId,
      },
    },
  });

  if (!isParticipant) {
    // If it's a group, add them
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (conv?.isGroup) {
      await prisma.conversationParticipant.create({
        data: { conversationId, memberId: session.memberId },
      });
    } else {
      return { success: false, error: 'You are not a participant in this conversation.' };
    }
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderMemberId: session.memberId,
      content: trimmed,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  safeRevalidate('/messages');

  try {
    const { broadcastMessagePush } = await import('@/app/actions/notifications');
    await broadcastMessagePush(session.name, trimmed, conversationId);
  } catch {
    // Non-blocking push notification error
  }

  return {
    success: true,
    messageId: message.id,
  };
}

/**
 * Deletes a message (soft delete: isDeleted = true).
 * Allowed for the original sender, or Admin / Manager (moderation).
 */
export async function deleteMessageAction(messageId: string) {
  const session = await requireAuth();

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return { success: false, error: 'Message not found.' };
  }

  const isOwn = message.senderMemberId === session.memberId;
  const isAuthorized = isOwn || session.isPrimaryAdmin || session.isAdmin || session.isManager;

  if (!isAuthorized) {
    return { success: false, error: 'You do not have permission to delete this message.' };
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { isDeleted: true },
  });

  safeRevalidate('/messages');
  return { success: true };
}
