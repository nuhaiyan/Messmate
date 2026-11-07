import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MessagesClient } from './messages-client';
import { getConversationsAction } from '@/app/actions/messages';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MessagesPage() {
  const session = await requireAuth();

  const convData = await getConversationsAction();

  const mess = await prisma.mess.findUnique({
    where: { id: session.messId },
    select: { name: true, logoUrl: true },
  });

  const allMembers = await prisma.messMember.findMany({
    where: { messId: session.messId, isActive: true },
    select: {
      id: true,
      fullName: true,
      isPrimaryAdmin: true,
      isAdmin: true,
      isManager: true,
      avatarUrl: true,
    },
    orderBy: { fullName: 'asc' },
  });

  const primaryAdmin = allMembers.find((m) => m.isPrimaryAdmin) || { fullName: 'Mohammad Tarek Hossen' };
  const currentManager = allMembers.find((m) => m.isManager) || { fullName: 'Tanvir' };

  return (
    <DashboardShell
      userRole={session.role}
      userName={session.name}
      messName={mess?.name || 'MessMate'}
      messLogoUrl={mess?.logoUrl}
      membersList={allMembers}
      activeMemberId={session.memberId}
      isPrimaryAdmin={session.isPrimaryAdmin}
      isAdmin={session.isAdmin}
      isManager={session.isManager}
      currentManagerName={currentManager.fullName}
      primaryAdminName={primaryAdmin.fullName}
    >
      <MessagesClient
        initialGroupConvId={convData.groupConvId}
        initialConversations={convData.conversations}
        allMembers={convData.allMembers}
        currentMemberId={convData.currentMemberId}
        canModerate={convData.canModerate}
      />
    </DashboardShell>
  );
}
