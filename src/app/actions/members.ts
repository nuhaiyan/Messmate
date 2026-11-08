'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, requireManager, requirePrimaryAdmin, setActiveMemberId } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';
import { hashPassword } from '@/lib/auth/password';

function safeRevalidate(path?: string) {
  try {
    revalidatePath('/', 'layout');
    if (path) revalidatePath(path);
    revalidatePath('/dashboard');
    revalidatePath('/members');
    revalidatePath('/finance');
    revalidatePath('/profile');
    revalidatePath('/reports');
    revalidatePath('/my-ledger');
  } catch {
    // Ignore outside request context (e.g. CLI script or testing)
  }
}

export async function switchActiveMemberAction(memberId: string) {
  await setActiveMemberId(memberId);
  safeRevalidate('/dashboard');
  safeRevalidate('/members');
  return { success: true };
}

export async function addMemberAction(data: {
  fullName: string;
  phone?: string;
  email?: string;
  roomNumber?: string;
  joiningDate?: string;
  initialBalance?: number;
}) {
  const session = await requireAdmin();

  if (!data.fullName || data.fullName.trim().length === 0) {
    return { success: false, error: 'Member full name is required.' };
  }

  const phone = data.phone?.trim() || `017${Math.floor(10000000 + Math.random() * 90000000)}`;

  // Find or create user
  let user = await prisma.user.findFirst({
    where: { phone },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: data.fullName.trim(),
        phone,
        email: data.email?.trim() || null,
        role: 'MEMBER',
        isActive: true,
      },
    });
  }

  const newMember = await prisma.messMember.create({
    data: {
      messId: session.messId,
      userId: user.id,
      fullName: data.fullName.trim(),
      phone,
      email: data.email?.trim() || null,
      roomNumber: data.roomNumber || null,
      initialOpeningBalance: data.initialBalance || 0,
      joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
      isActive: true,
      isArchived: false,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MEMBER_ADDED',
    entity: 'MEMBER',
    entityId: newMember.id,
    details: { fullName: data.fullName, phone, initialBalance: data.initialBalance },
  });

  safeRevalidate('/members');
  safeRevalidate('/dashboard');
  return { success: true, memberId: newMember.id };
}

export async function updateMemberAction(memberId: string, data: {
  fullName: string;
  phone?: string;
  email?: string;
  roomNumber?: string;
  joiningDate?: string;
  leavingDate?: string | null;
  initialBalance?: number;
}) {
  const session = await requireAuth();

  const member = await prisma.messMember.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    return { success: false, error: 'Member not found.' };
  }

  // Prevent renaming Primary Admin away from Mohammad Tarek Hossen
  if (member.isPrimaryAdmin && data.fullName !== 'Mohammad Tarek Hossen') {
    return { success: false, error: 'Mohammad Tarek Hossen is the permanent Primary Admin and cannot be renamed.' };
  }

  await prisma.messMember.update({
    where: { id: memberId },
    data: {
      fullName: data.fullName,
      phone: data.phone || member.phone,
      email: data.email || null,
      roomNumber: data.roomNumber || null,
      initialOpeningBalance: data.initialBalance !== undefined ? data.initialBalance : member.initialOpeningBalance,
      joiningDate: data.joiningDate ? new Date(data.joiningDate) : member.joiningDate,
      leavingDate: data.leavingDate ? new Date(data.leavingDate) : null,
    },
  });

  await prisma.user.update({
    where: { id: member.userId },
    data: {
      name: data.fullName,
      phone: data.phone || member.phone,
      email: data.email || null,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MEMBER_UPDATED',
    entity: 'MEMBER',
    entityId: memberId,
    details: data,
  });

  safeRevalidate('/members');
  safeRevalidate('/dashboard');
  return { success: true };
}

export async function deactivateMemberAction(memberId: string) {
  const session = await requireAdmin();

  const member = await prisma.messMember.findUnique({
    where: { id: memberId },
  });

  if (!member) return { success: false, error: 'Member not found.' };

  if (member.isPrimaryAdmin) {
    return { success: false, error: 'The Primary Admin (Mohammad Tarek Hossen) cannot be deactivated.' };
  }

  if (member.isManager) {
    return { success: false, error: 'Cannot deactivate the active Manager. Please assign another Manager first.' };
  }

  await prisma.messMember.update({
    where: { id: memberId },
    data: { isActive: false },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MEMBER_DEACTIVATED',
    entity: 'MEMBER',
    entityId: memberId,
    details: { fullName: member.fullName },
    reason: 'Member deactivated (meals and transactions disabled, history preserved)',
  });

  safeRevalidate('/members');
  safeRevalidate('/meals');
  safeRevalidate('/dashboard');
  return { success: true };
}

export async function activateMemberAction(memberId: string) {
  const session = await requireAdmin();

  const member = await prisma.messMember.findUnique({
    where: { id: memberId },
  });

  if (!member) return { success: false, error: 'Member not found.' };

  await prisma.messMember.update({
    where: { id: memberId },
    data: { isActive: true, isArchived: false },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MEMBER_ACTIVATED',
    entity: 'MEMBER',
    entityId: memberId,
    details: { fullName: member.fullName },
    reason: 'Member reactivated for active mess operations',
  });

  safeRevalidate('/members');
  safeRevalidate('/meals');
  safeRevalidate('/dashboard');
  return { success: true };
}

export async function archiveMemberAction(memberId: string) {
  const session = await requireAdmin();

  const member = await prisma.messMember.findUnique({
    where: { id: memberId },
  });

  if (!member) return { success: false, error: 'Member not found.' };

  if (member.isPrimaryAdmin) {
    return { success: false, error: 'The Primary Admin (Mohammad Tarek Hossen) cannot be deleted or archived.' };
  }

  if (member.isManager) {
    return { success: false, error: 'Cannot archive the current Manager. Please reassign the Manager first.' };
  }

  // Soft-deletion/archival to preserve 100% of historical transactions and ledger
  await prisma.messMember.update({
    where: { id: memberId },
    data: {
      isArchived: true,
      isActive: false,
      archivedAt: new Date(),
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MEMBER_ARCHIVED',
    entity: 'MEMBER',
    entityId: memberId,
    details: { fullName: member.fullName },
    reason: 'Member archived. Historical accounting records and ledgers are preserved.',
  });

  safeRevalidate('/members');
  safeRevalidate('/meals');
  safeRevalidate('/dashboard');
  return { success: true };
}

/**
 * DYNAMIC MANAGER CHANGE
 * Only Primary Admin (Mohammad Tarek Hossen) can change the manager.
 */
export async function changeManagerAction(newManagerMemberId: string, notes?: string) {
  const session = await requirePrimaryAdmin();

  const targetMember = await prisma.messMember.findUnique({
    where: { id: newManagerMemberId },
  });

  if (!targetMember || targetMember.isArchived || !targetMember.isActive) {
    return { success: false, error: 'Target member is not active or eligible to be Manager.' };
  }

  if (targetMember.isPrimaryAdmin) {
    return { success: false, error: 'Primary Admin (Mohammad Tarek Hossen) cannot be set as Manager. Manager changes must never affect Primary Admin.' };
  }

  // Find current manager
  const currentManager = await prisma.messMember.findFirst({
    where: { messId: session.messId, isManager: true },
  });

  await prisma.$transaction(async (tx) => {
    // 1. Demote old manager (only revokes isManager, preserves any separately granted isAdmin)
    if (currentManager) {
      await tx.messMember.update({
        where: { id: currentManager.id },
        data: { isManager: false },
      });

      // Close previous manager assignment history
      await tx.managerAssignment.updateMany({
        where: { messId: session.messId, memberId: currentManager.id, endedAt: null },
        data: { endedAt: new Date() },
      });
    }

    // 2. Promote target member as new Manager
    await tx.messMember.update({
      where: { id: targetMember.id },
      data: { isManager: true },
    });

    // 3. Update Mess pointer
    await tx.mess.update({
      where: { id: session.messId },
      data: { currentManagerMemberId: targetMember.id },
    });

    // 4. Create new ManagerAssignment history record
    await tx.managerAssignment.create({
      data: {
        messId: session.messId,
        memberId: targetMember.id,
        assignedById: session.memberId,
        notes: notes || `Manager changed to ${targetMember.fullName} by Primary Admin`,
      },
    });
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MANAGER_CHANGED',
    entity: 'MESS',
    entityId: session.messId,
    details: {
      previousManager: currentManager?.fullName || 'None',
      newManager: targetMember.fullName,
      assignedBy: session.name,
    },
    reason: notes || 'Primary Admin assigned new Mess Manager',
  });

  safeRevalidate('/dashboard');
  safeRevalidate('/members');
  return { success: true };
}

/**
 * ADMIN PRIVILEGE SHARING
 * Primary Admin can grant Admin privileges to any active eligible member.
 */
export async function grantAdminPrivilegeAction(memberId: string, notes?: string) {
  const session = await requirePrimaryAdmin();

  const member = await prisma.messMember.findUnique({
    where: { id: memberId },
  });

  if (!member || member.isArchived || !member.isActive) {
    return { success: false, error: 'Member is not active or eligible.' };
  }

  if (member.isPrimaryAdmin) {
    return { success: false, error: 'Member is already the Primary Admin.' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.messMember.update({
      where: { id: memberId },
      data: {
        isAdmin: true,
        adminGrantedAt: new Date(),
        adminGrantedById: session.memberId,
      },
    });

    await tx.adminPrivilegeLog.create({
      data: {
        messId: session.messId,
        memberId: member.id,
        action: 'GRANTED',
        performedById: session.memberId,
        notes: notes || `Admin privileges granted by Primary Admin`,
      },
    });
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'ADMIN_PRIVILEGE_GRANTED',
    entity: 'MEMBER',
    entityId: memberId,
    details: { grantedTo: member.fullName, grantedBy: session.name },
    reason: notes,
  });

  safeRevalidate('/members');
  safeRevalidate('/dashboard');
  return { success: true };
}

/**
 * REVOKE ADMIN PRIVILEGES
 * Primary Admin can revoke previously granted Admin privileges.
 */
export async function revokeAdminPrivilegeAction(memberId: string, notes?: string) {
  const session = await requirePrimaryAdmin();

  const member = await prisma.messMember.findUnique({
    where: { id: memberId },
  });

  if (!member) return { success: false, error: 'Member not found.' };

  if (member.isPrimaryAdmin) {
    return { success: false, error: 'The Primary Admin (Mohammad Tarek Hossen) cannot be demoted or revoked.' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.messMember.update({
      where: { id: memberId },
      data: {
        isAdmin: false,
        adminGrantedAt: null,
        adminGrantedById: null,
      },
    });

    await tx.adminPrivilegeLog.create({
      data: {
        messId: session.messId,
        memberId: member.id,
        action: 'REVOKED',
        performedById: session.memberId,
        notes: notes || `Admin privileges revoked by Primary Admin`,
      },
    });
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'ADMIN_PRIVILEGE_REVOKED',
    entity: 'MEMBER',
    entityId: memberId,
    details: { revokedFrom: member.fullName, revokedBy: session.name },
    reason: notes,
  });

  safeRevalidate('/members');
  safeRevalidate('/dashboard');
  return { success: true };
}

/**
 * Password & Login Access Management (Admin Controlled)
 */

export async function setMemberPasswordAction(memberId: string, newPassword: string) {
  const session = await requireManager();

  if (!memberId) {
    return { success: false, error: 'Member ID is required.' };
  }

  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  const member = await prisma.messMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!member) {
    return { success: false, error: 'Member not found.' };
  }

  if (member.isPrimaryAdmin && !session.isPrimaryAdmin) {
    return { success: false, error: 'শুধুমাত্র মোহাম্মদ তারেক হোসেন অ্যাডমিন পাসওয়ার্ড পরিবর্তন করতে পারবেন।' };
  }

  const passwordHash = await hashPassword(newPassword.trim());

  await prisma.user.update({
    where: { id: member.userId },
    data: { passwordHash },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MEMBER_PASSWORD_SET',
    entity: 'USER',
    entityId: member.userId,
    details: {
      memberName: member.fullName,
      assignedBy: session.name,
    },
    reason: `Password updated by Admin/Manager ${session.name}`,
  });

  safeRevalidate('/members');
  return { success: true, message: `Password for ${member.fullName} updated successfully.` };
}

export async function resetMemberPasswordToDefaultAction(memberId: string) {
  const session = await requireManager();

  if (!memberId) {
    return { success: false, error: 'Member ID is required.' };
  }

  const member = await prisma.messMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!member) {
    return { success: false, error: 'Member not found.' };
  }

  if (member.isPrimaryAdmin) {
    return { success: false, error: 'প্রাইমারি অ্যাডমিনের পাসওয়ার্ড মেম্বার ডিফল্টে রিসেট করা যাবে না।' };
  }

  const defaultPassword = 'mess1234';
  const passwordHash = await hashPassword(defaultPassword);

  await prisma.user.update({
    where: { id: member.userId },
    data: { passwordHash },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MEMBER_PASSWORD_RESET_DEFAULT',
    entity: 'USER',
    entityId: member.userId,
    details: {
      memberName: member.fullName,
      defaultPassword,
      resetBy: session.name,
    },
    reason: `Password reset to default (mess1234) by ${session.name}`,
  });

  safeRevalidate('/members');
  return {
    success: true,
    message: `Password for ${member.fullName} reset to default: mess1234`,
    defaultPassword,
  };
}

export async function toggleMemberLoginAccessAction(memberId: string, loginEnabled: boolean) {
  const session = await requireManager();

  const member = await prisma.messMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!member) {
    return { success: false, error: 'Member not found.' };
  }

  if (member.isPrimaryAdmin) {
    return { success: false, error: 'Primary Admin login access cannot be disabled.' };
  }

  await prisma.user.update({
    where: { id: member.userId },
    data: { isActive: loginEnabled },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: loginEnabled ? 'MEMBER_LOGIN_ENABLED' : 'MEMBER_LOGIN_DISABLED',
    entity: 'USER',
    entityId: member.userId,
    details: {
      memberName: member.fullName,
      loginEnabled,
      performedBy: session.name,
    },
    reason: `Login access ${loginEnabled ? 'enabled' : 'disabled'} by ${session.name}`,
  });

  safeRevalidate('/members');
  return {
    success: true,
    message: `Login access for ${member.fullName} has been ${loginEnabled ? 'enabled' : 'disabled'}.`,
  };
}

/**
 * Backward compatibility exports
 */
export async function toggleMemberStatusAction(memberId: string) {
  const member = await prisma.messMember.findUnique({ where: { id: memberId } });
  if (!member) return { success: false, error: 'Member not found' };
  if (member.isActive) {
    return deactivateMemberAction(memberId);
  } else {
    return activateMemberAction(memberId);
  }
}

export async function resetMemberPasswordAction(memberId?: string, newPassword?: string) {
  if (memberId && newPassword) {
    return setMemberPasswordAction(memberId, newPassword);
  } else if (memberId) {
    return resetMemberPasswordToDefaultAction(memberId);
  }
  return { success: true, message: 'Password action completed.' };
}

export async function updateMemberOpeningBalanceAction(memberId: string, initialBalance: number) {
  const session = await requireManager();
  const member = await prisma.messMember.findUnique({
    where: { id: memberId },
  });
  if (!member || member.messId !== session.messId) {
    return { success: false, error: 'Member not found.' };
  }

  await prisma.messMember.update({
    where: { id: memberId },
    data: {
      initialOpeningBalance: Number(initialBalance),
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MEMBER_INITIAL_BALANCE_UPDATED',
    entity: 'MEMBER',
    entityId: memberId,
    details: {
      member: member.fullName,
      oldBalance: member.initialOpeningBalance,
      newBalance: Number(initialBalance),
      updatedBy: session.name,
    },
  });

  safeRevalidate();
  return { success: true, message: 'সদস্যের প্রারম্ভিক ব্যালেন্স সফলভাবে আপডেট করা হয়েছে।' };
}
