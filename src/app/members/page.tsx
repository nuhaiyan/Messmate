import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MemberManagementClient } from './member-management-client';

interface MembersPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const session = await requireAuth();

  // Protect Admin/Manager panel: regular members cannot access member administration
  if (!session.isPrimaryAdmin && !session.isAdmin && !session.isManager) {
    redirect('/my-ledger');
  }

  const sp = await searchParams;
  const initialTab = sp.tab || 'members';

  const mess = await prisma.mess.findUnique({
    where: { id: session.messId },
    include: { profile: true },
  });

  const messName = mess?.profile?.messName || mess?.name || "Tarek's Residence";
  const messLogoUrl = mess?.profile?.logoUrl || mess?.logoUrl || null;

  const members = await prisma.messMember.findMany({
    where: { messId: session.messId },
    include: { user: true },
    orderBy: { fullName: 'asc' },
  });

  const managerAssignments = await prisma.managerAssignment.findMany({
    where: { messId: session.messId },
    include: {
      member: true,
    },
    orderBy: { assignedAt: 'desc' },
  });

  const adminLogs = await prisma.adminPrivilegeLog.findMany({
    where: { messId: session.messId },
    include: {
      member: true,
    },
    orderBy: { performedAt: 'desc' },
  });

  const primaryAdmin = members.find((m) => m.isPrimaryAdmin) || { fullName: 'Mohammad Tarek Hossen' };
  const currentManager = members.find((m) => m.isManager) || { fullName: 'Tanvir' };

  const memberById = new Map(members.map((m) => [m.id, m]));

  const memberList = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    fullName: m.fullName,
    phone: m.phone,
    email: m.email,
    roomNumber: m.roomNumber,
    joiningDate: m.joiningDate.toISOString(),
    leavingDate: m.leavingDate ? m.leavingDate.toISOString() : null,
    isActive: m.isActive,
    isArchived: m.isArchived,
    initialOpeningBalance: Number(m.initialOpeningBalance),
    isPrimaryAdmin: m.isPrimaryAdmin,
    isAdmin: m.isAdmin,
    isManager: m.isManager,
    adminGrantedAt: m.adminGrantedAt ? m.adminGrantedAt.toISOString() : null,
    role: m.isPrimaryAdmin ? 'PRIMARY_ADMIN' : m.isAdmin ? 'ADMIN' : m.isManager ? 'MANAGER' : 'MEMBER',
    loginEnabled: m.user.isActive,
    hasPassword: Boolean(m.user.passwordHash && m.user.passwordHash.length > 0),
  }));

  const membersOptions = members
    .filter((m) => !m.isArchived)
    .map((m) => ({
      id: m.id,
      fullName: m.fullName,
      isPrimaryAdmin: m.isPrimaryAdmin,
      isAdmin: m.isAdmin,
      isManager: m.isManager,
    }));

  const mappedAssignments = managerAssignments.map((a) => {
    const assignedBy = a.assignedById ? memberById.get(a.assignedById) : null;
    return {
      id: a.id,
      memberName: a.member.fullName,
      assignedByName: assignedBy?.fullName || primaryAdmin.fullName,
      assignedAt: a.assignedAt.toISOString(),
      endedAt: a.endedAt ? a.endedAt.toISOString() : null,
      notes: a.notes,
    };
  });

  const mappedAdminLogs = adminLogs.map((l) => {
    const performedBy = l.performedById ? memberById.get(l.performedById) : null;
    return {
      id: l.id,
      action: l.action,
      memberName: l.member.fullName,
      performedByName: performedBy?.fullName || primaryAdmin.fullName,
      performedAt: l.performedAt.toISOString(),
      notes: l.notes,
    };
  });

  return (
    <DashboardShell
      userRole={session.role}
      userName={session.name}
      messName={messName}
      messLogoUrl={messLogoUrl}
      activeMemberId={session.memberId}
      isPrimaryAdmin={session.isPrimaryAdmin}
      isAdmin={session.isAdmin}
      isManager={session.isManager}
      membersList={membersOptions}
      currentManagerName={currentManager.fullName}
      primaryAdminName={primaryAdmin.fullName}
    >
      <MemberManagementClient
        members={memberList}
        managerAssignments={mappedAssignments}
        adminLogs={mappedAdminLogs}
        currentUser={{
          memberId: session.memberId,
          name: session.name,
          isPrimaryAdmin: session.isPrimaryAdmin,
          isAdmin: session.isAdmin,
          isManager: session.isManager,
        }}
        initialTab={initialTab}
      />
    </DashboardShell>
  );
}