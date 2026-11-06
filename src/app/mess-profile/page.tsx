import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MessProfileClient } from './mess-profile-client';
import { getMessProfileAction } from '@/app/actions/mess-profile';

export default async function MessProfilePage() {
  const session = await requireAuth();

  const messData = await getMessProfileAction();

  const allMembers = await prisma.messMember.findMany({
    where: { messId: session.messId, isArchived: false },
    select: {
      id: true,
      fullName: true,
      isActive: true,
      isPrimaryAdmin: true,
      isAdmin: true,
      isManager: true,
      avatarUrl: true,
    },
    orderBy: { fullName: 'asc' },
  });

  const primaryAdmin = allMembers.find((m) => m.isPrimaryAdmin) || { fullName: 'Mohammad Tarek Hossen' };
  const currentManager = allMembers.find((m) => m.isManager) || { fullName: 'Tanvir' };

  const isManagerOrAdmin = session.isPrimaryAdmin || session.isAdmin || session.isManager;

  return (
    <DashboardShell
      userRole={session.role}
      userName={session.name}
      messName={messData.name}
      messLogoUrl={messData.logoUrl}
      membersList={allMembers}
      activeMemberId={session.memberId}
      isPrimaryAdmin={session.isPrimaryAdmin}
      isAdmin={session.isAdmin}
      isManager={session.isManager}
      currentManagerName={currentManager.fullName}
      primaryAdminName={primaryAdmin.fullName}
    >
      <MessProfileClient
        initialMess={{
          id: messData.id,
          messId: messData.messId,
          name: messData.name,
          code: messData.id.slice(0, 8),
          address: messData.address,
          location: messData.location,
          contactPhone: messData.contactPhone,
          email: messData.email,
          description: messData.description,
          establishedDate: messData.establishedDate,
          logoUrl: messData.logoUrl,
          coverUrl: messData.coverUrl,
          managerName: currentManager.fullName,
          activeMemberCount: messData.activeMemberCount,
          createdAt: messData.createdAt,
        }}
        isManagerOrAdmin={isManagerOrAdmin}
        primaryAdminName={primaryAdmin.fullName}
      />
    </DashboardShell>
  );
}
