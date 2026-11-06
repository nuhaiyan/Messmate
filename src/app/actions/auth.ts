'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { comparePassword } from '@/lib/auth/password';
import { setSessionCookie, clearSessionCookie, getSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

/**
 * 1. Admin Direct Login (Password-Free Access)
 * Authenticates directly as the Permanent Primary Admin (Mohammad Tarek Hossen)
 * for private bachelor mess deployment.
 */
export async function adminDirectLoginAction() {
  const tarek = await prisma.messMember.findFirst({
    where: { isPrimaryAdmin: true },
    include: { mess: true, user: true },
  });

  if (!tarek) {
    return { success: false, error: 'Primary Admin account (Mohammad Tarek Hossen) not found in system.' };
  }

  await setSessionCookie({
    userId: tarek.userId,
    memberId: tarek.id,
    name: tarek.fullName,
    phone: tarek.phone,
    email: tarek.email,
    role: 'PRIMARY_ADMIN',
    messId: tarek.messId,
    isPrimaryAdmin: true,
    isAdmin: true,
    isManager: false,
  });

  await logActivity({
    messId: tarek.messId,
    userId: tarek.userId,
    action: 'ADMIN_LOGIN_PASSWORD_FREE',
    entity: 'USER',
    entityId: tarek.userId,
    details: { name: tarek.fullName, role: 'PRIMARY_ADMIN', method: 'DIRECT_ADMIN_ACCESS' },
    reason: 'Admin entered the Admin Panel via direct password-free access',
  });

  redirect('/dashboard');
}

/**
 * 2. Member Portal Login (Name + Admin-Assigned Password)
 */
export async function memberLoginAction(data: {
  memberId: string;
  password: string;
}) {
  if (!data.memberId || !data.password) {
    return { success: false, error: 'Please select your member account and enter your password.' };
  }

  const member = await prisma.messMember.findUnique({
    where: { id: data.memberId },
    include: { mess: true, user: true },
  });

  if (!member) {
    return { success: false, error: 'Selected member account not found.' };
  }

  if (!member.isActive || member.isArchived) {
    return {
      success: false,
      error: 'This member account is deactivated or archived. Please contact the Mess Admin.',
    };
  }

  if (!member.user.isActive) {
    return {
      success: false,
      error: 'Login access for your account has been disabled by the Mess Admin.',
    };
  }

  if (!member.user.passwordHash || member.user.passwordHash.trim().length === 0) {
    return {
      success: false,
      error: 'No password has been assigned yet. Please ask the Mess Admin to assign your password.',
    };
  }

  const isValid = await comparePassword(data.password, member.user.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Incorrect password. Please verify with the Mess Admin.' };
  }

  let role: 'PRIMARY_ADMIN' | 'ADMIN' | 'MANAGER' | 'MEMBER' = 'MEMBER';
  if (member.isPrimaryAdmin) role = 'PRIMARY_ADMIN';
  else if (member.isManager) role = 'MANAGER';
  else if (member.isAdmin) role = 'ADMIN';

  await setSessionCookie({
    userId: member.userId,
    memberId: member.id,
    name: member.fullName,
    phone: member.phone,
    email: member.email,
    role,
    messId: member.messId,
    isPrimaryAdmin: member.isPrimaryAdmin,
    isAdmin: member.isAdmin,
    isManager: member.isManager,
  });

  await logActivity({
    messId: member.messId,
    userId: member.userId,
    action: 'MEMBER_LOGIN',
    entity: 'USER',
    entityId: member.userId,
    details: { name: member.fullName, role },
    reason: 'Member authenticated to portal',
  });

  // Regular members land on their personal ledger, management on dashboard
  const destination = (member.isPrimaryAdmin || member.isManager || member.isAdmin) ? '/dashboard' : '/my-ledger';
  return { success: true, redirectUrl: destination };
}

/**
 * 3. Logout Action
 */
export async function logoutAction() {
  await clearSessionCookie();
  redirect('/login');
}

/**
 * 4. Fetch Active Members for Member Login Dropdown
 */
export async function getLoginMembersListAction() {
  const members = await prisma.messMember.findMany({
    where: { isArchived: false, isActive: true },
    select: {
      id: true,
      fullName: true,
      roomNumber: true,
      phone: true,
      isPrimaryAdmin: true,
      isManager: true,
    },
    orderBy: { fullName: 'asc' },
  });

  return members;
}
