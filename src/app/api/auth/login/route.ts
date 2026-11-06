import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/audit/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Phone number/email and password are required.' },
        { status: 400 }
      );
    }

    // Find user by phone or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: identifier }, { email: identifier }],
      },
      include: {
        memberships: {
          include: { mess: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid credentials or inactive account.' },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials or incorrect password.' },
        { status: 401 }
      );
    }

    const membership = user.memberships[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'User is not assigned to any mess.' },
        { status: 403 }
      );
    }

    // Set authenticated session cookie
    await createSession({
      userId: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role as 'MANAGER' | 'MEMBER',
      messId: membership.messId,
      memberId: membership.id,
    });

    await logActivity({
      messId: membership.messId,
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'USER',
      entityId: user.id,
      details: { name: user.name, role: user.role },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        messName: membership.mess.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login.' },
      { status: 500 }
    );
  }
}
