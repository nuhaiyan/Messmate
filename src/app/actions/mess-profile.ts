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

export async function getMessProfileAction() {
  const session = await requireAuth();

  const mess = await prisma.mess.findUnique({
    where: { id: session.messId },
    include: {
      profile: true,
      members: {
        where: { isActive: true, isArchived: false },
        select: { id: true, fullName: true, isManager: true, isPrimaryAdmin: true },
      },
    },
  });

  if (!mess) {
    throw new Error('Mess not found');
  }

  // Ensure dedicated MessProfile exists
  let profile = mess.profile;
  if (!profile) {
    profile = await prisma.messProfile.create({
      data: {
        messId: mess.id,
        messName: mess.name || "Tarek's Residence",
        logoUrl: mess.logoUrl || null,
        coverUrl: mess.coverUrl || null,
        fullAddress: mess.address || 'Bohoddarhat, Chattogram, Bangladesh',
        location: 'Chattogram, Bangladesh',
        contactPhone: mess.contactPhone || '01700-000000',
        description: mess.description || 'A comfortable and transparent bachelor mess management community.',
      },
    });
  }

  const manager = mess.members.find((m) => m.isManager);

  return {
    id: profile.id,
    messId: mess.id,
    name: profile.messName,
    logoUrl: profile.logoUrl || mess.logoUrl || null,
    coverUrl: profile.coverUrl || mess.coverUrl || null,
    address: profile.fullAddress || mess.address || '',
    location: profile.location || 'Chattogram, Bangladesh',
    contactPhone: profile.contactPhone || mess.contactPhone || '',
    email: profile.email || '',
    description: profile.description || mess.description || '',
    establishedDate: profile.establishedDate ? profile.establishedDate.toISOString().split('T')[0] : '',
    managerName: manager?.fullName || 'Tanvir',
    activeMemberCount: mess.members.length,
    createdAt: profile.createdAt.toISOString(),
  };
}

export async function updateMessProfileAction(data: {
  name: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  address?: string | null;
  location?: string | null;
  contactPhone?: string | null;
  email?: string | null;
  description?: string | null;
  establishedDate?: string | null;
}) {
  const session = await requireManager();

  const trimmedName = data.name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Mess name cannot be empty.' };
  }

  const establishedDateTime = data.establishedDate ? new Date(`${data.establishedDate}T00:00:00Z`) : null;

  // 1. Upsert dedicated MessProfile model
  const profile = await prisma.messProfile.upsert({
    where: { messId: session.messId },
    create: {
      messId: session.messId,
      messName: trimmedName,
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : null,
      coverUrl: data.coverUrl !== undefined ? data.coverUrl : null,
      fullAddress: data.address !== undefined ? data.address : null,
      location: data.location !== undefined ? data.location : null,
      contactPhone: data.contactPhone !== undefined ? data.contactPhone : null,
      email: data.email !== undefined ? data.email : null,
      description: data.description !== undefined ? data.description : null,
      establishedDate: establishedDateTime,
    },
    update: {
      messName: trimmedName,
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : undefined,
      coverUrl: data.coverUrl !== undefined ? data.coverUrl : undefined,
      fullAddress: data.address !== undefined ? data.address : undefined,
      location: data.location !== undefined ? data.location : undefined,
      contactPhone: data.contactPhone !== undefined ? data.contactPhone : undefined,
      email: data.email !== undefined ? data.email : undefined,
      description: data.description !== undefined ? data.description : undefined,
      establishedDate: establishedDateTime,
    },
  });

  // 2. Synchronize main Mess entity for backward compatibility (global branding)
  const updatedMess = await prisma.mess.update({
    where: { id: session.messId },
    data: {
      name: trimmedName,
      logoUrl: profile.logoUrl,
      coverUrl: profile.coverUrl,
      address: profile.fullAddress,
      contactPhone: profile.contactPhone,
      description: profile.description,
    },
  });

  await logActivity({
    messId: session.messId,
    userId: session.userId,
    action: 'MESS_PROFILE_UPDATE',
    entity: 'MESS_PROFILE',
    details: {
      messName: trimmedName,
      updatedBy: session.name,
      location: profile.location,
    },
  });

  safeRevalidate('/mess-profile');
  safeRevalidate('/dashboard');
  safeRevalidate('/profile');
  safeRevalidate('/members');
  safeRevalidate('/meals');
  safeRevalidate('/closing');

  return {
    success: true,
    profile: {
      id: profile.id,
      messId: profile.messId,
      name: profile.messName,
      logoUrl: profile.logoUrl,
      coverUrl: profile.coverUrl,
      address: profile.fullAddress,
      location: profile.location,
      contactPhone: profile.contactPhone,
      email: profile.email,
      description: profile.description,
      establishedDate: profile.establishedDate ? profile.establishedDate.toISOString().split('T')[0] : '',
    },
    mess: {
      id: updatedMess.id,
      name: updatedMess.name,
      logoUrl: updatedMess.logoUrl,
      coverUrl: updatedMess.coverUrl,
      address: updatedMess.address,
      contactPhone: updatedMess.contactPhone,
      description: updatedMess.description,
    },
  };
}
