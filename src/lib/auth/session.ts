import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '../prisma';

export interface AuthSession {
  userId: string;
  name: string;
  phone: string;
  email?: string | null;
  role: 'PRIMARY_ADMIN' | 'ADMIN' | 'MANAGER' | 'MEMBER';
  messId: string;
  memberId: string;
  isPrimaryAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
}

export const SESSION_COOKIE_NAME = 'messmate_session';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'messmate-super-secret-jwt-key-2026-bachelor-accounting-system-dhaka'
);

/**
 * Creates a cryptographically signed JWT for the session.
 */
export async function createSessionToken(session: AuthSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

/**
 * Verifies and decodes the JWT session token.
 */
export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Sets the signed HTTP-only cookie for the authenticated session.
 */
export async function setSessionCookie(session: AuthSession) {
  try {
    const token = await createSessionToken(session);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  } catch (error: any) {
    if (!error?.message?.includes('outside a request scope')) {
      console.error('Failed to set session cookie:', error);
    }
  }
}

/**
 * Clears the session cookie on logout.
 */
export async function clearSessionCookie() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    // Also clear legacy cookie if present
    cookieStore.delete('messmate_active_member_id');
  } catch {
    // Ignore outside request context
  }
}

/**
 * Resolves the authenticated session from the signed HTTP-only cookie.
 * Returns null if no valid authenticated session is present.
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    let token: string | undefined;
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Outside request scope (e.g. CLI script or unit testing)
      const tarek = await prisma.messMember.findFirst({
        where: { isPrimaryAdmin: true },
        include: { mess: true, user: true },
      });
      if (!tarek) return null;
      return {
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
      };
    }

    if (!token) {
      return null;
    }

    const payload = await verifySessionToken(token);
    if (!payload || !payload.memberId) {
      return null;
    }

    // Verify member still exists and account is active
    const member = await prisma.messMember.findUnique({
      where: { id: payload.memberId },
      include: { mess: true, user: true },
    });

    if (!member || !member.isActive || member.isArchived || !member.user.isActive) {
      return null;
    }

    let role: 'PRIMARY_ADMIN' | 'ADMIN' | 'MANAGER' | 'MEMBER' = 'MEMBER';
    if (member.isPrimaryAdmin) {
      role = 'PRIMARY_ADMIN';
    } else if (member.isAdmin) {
      role = 'ADMIN';
    } else if (member.isManager) {
      role = 'MANAGER';
    }

    return {
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
    };
  } catch (error) {
    console.error('Failed to get active session:', error);
    return null;
  }
}

/**
 * Backward compatibility functions
 */
export async function setActiveMemberId(memberId: string) {
  const member = await prisma.messMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (member) {
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
  }
}

export async function clearActiveMember() {
  await clearSessionCookie();
}

export async function createSession(sessionData: { memberId?: string; [key: string]: any }) {
  if (sessionData?.memberId) {
    await setActiveMemberId(sessionData.memberId);
  }
}

export async function destroySession() {
  await clearSessionCookie();
}

/**
 * Enforces authenticated session.
 * Redirects to /login if unauthenticated.
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/**
 * Enforces Manager or Admin authority.
 */
export async function requireManager(): Promise<AuthSession> {
  const session = await requireAuth();
  const hasAuthority = session.isPrimaryAdmin || session.isAdmin || session.isManager;
  if (!hasAuthority) {
    throw new Error('Access Denied: This operation requires Manager or Admin authority.');
  }
  return session;
}

/**
 * Enforces Permanent Primary Admin authority (Mohammad Tarek Hossen).
 */
export async function requirePrimaryAdmin(): Promise<AuthSession> {
  const session = await requireAuth();
  if (!session.isPrimaryAdmin) {
    throw new Error('Access Denied: This operation requires Permanent Primary Admin authority (Mohammad Tarek Hossen).');
  }
  return session;
}
