import { prisma } from '../prisma';
import { hashPassword } from '../auth/password';

export const PRELOADED_MEMBERS_LIST = [
  { name: 'Mohammad Tarek Hossen', phone: '01711000001', room: 'Room 101', isPrimaryAdmin: true, isAdmin: true, isManager: false },
  { name: 'Forkan', phone: '01711000002', room: 'Room 101', isPrimaryAdmin: false, isAdmin: false, isManager: false },
  { name: 'Tanvir', phone: '01711000003', room: 'Room 102', isPrimaryAdmin: false, isAdmin: false, isManager: true }, // Initial Manager!
  { name: 'Sayed', phone: '01711000004', room: 'Room 102', isPrimaryAdmin: false, isAdmin: false, isManager: false },
  { name: 'Rafi', phone: '01711000005', room: 'Room 103', isPrimaryAdmin: false, isAdmin: false, isManager: false },
  { name: 'Mahin', phone: '01711000006', room: 'Room 103', isPrimaryAdmin: false, isAdmin: false, isManager: false },
  { name: 'Misu', phone: '01711000007', room: 'Room 201', isPrimaryAdmin: false, isAdmin: false, isManager: false },
  { name: 'Safi', phone: '01711000008', room: 'Room 201', isPrimaryAdmin: false, isAdmin: false, isManager: false },
  { name: 'Mahi', phone: '01711000009', room: 'Room 202', isPrimaryAdmin: false, isAdmin: false, isManager: false },
  { name: 'Yousuf', phone: '01711000010', room: 'Room 202', isPrimaryAdmin: false, isAdmin: false, isManager: false },
  { name: 'Masum', phone: '01711000011', room: 'Room 203', isPrimaryAdmin: false, isAdmin: false, isManager: false },
  { name: 'Forid', phone: '01711000012', room: 'Room 203', isPrimaryAdmin: false, isAdmin: false, isManager: false },
  { name: 'Fahim', phone: '01711000013', room: 'Room 204', isPrimaryAdmin: false, isAdmin: false, isManager: false },
  { name: 'Muaz', phone: '01711000014', room: 'Room 204', isPrimaryAdmin: false, isAdmin: false, isManager: false },
];

export async function ensurePreloadedMembers(messId?: string) {
  // 1. Get or create primary mess
  let mess = messId ? await prisma.mess.findUnique({ where: { id: messId } }) : await prisma.mess.findFirst();

  if (!mess) {
    mess = await prisma.mess.create({
      data: {
        name: 'Bashundhara Bachelor Mess',
        address: 'House 42, Road 8, Block C, Bashundhara R/A, Dhaka 1229',
        currency: 'BDT',
        currencySymbol: '৳',
        timezone: 'Asia/Dhaka',
        fractionalMeals: true,
      },
    });

    await prisma.messSetting.create({
      data: {
        messId: mess.id,
        allowFractionalMeals: true,
        defaultAllocationMethod: 'EQUAL',
        autoCarryForwardBalance: true,
        lowBalanceThreshold: 500.0,
        language: 'en',
        timezone: 'Asia/Dhaka',
        currency: 'BDT',
      },
    });
  }

  // 2. Map existing members by name (case-insensitive or partial match)
  const existingMembers = await prisma.messMember.findMany({
    where: { messId: mess.id },
    include: { user: true },
  });

  const memberByName: Record<string, (typeof existingMembers)[0] | undefined> = {};
  for (const m of existingMembers) {
    memberByName[m.fullName.toLowerCase().trim()] = m;
  }

  let tarekMemberId: string | null = null;
  let currentManagerMemberId: string | null = null;

  for (const target of PRELOADED_MEMBERS_LIST) {
    const key = target.name.toLowerCase().trim();
    // Also check partial matching (e.g. "Tanvir Hossain" -> "Tanvir")
    let match: (typeof existingMembers)[0] | undefined = memberByName[key];
    if (!match) {
      match = existingMembers.find(
        (em) => em.fullName.toLowerCase().includes(key) || key.includes(em.fullName.toLowerCase())
      );
    }

    if (match) {
      // Update existing record
      const isPrimary = target.name === 'Mohammad Tarek Hossen';
      const updated = await prisma.messMember.update({
        where: { id: match.id },
        data: {
          fullName: target.name,
          isPrimaryAdmin: isPrimary,
          isAdmin: isPrimary ? true : match.isAdmin,
          isManager: isPrimary ? false : (target.isManager ? true : match.isManager),
          roomNumber: match.roomNumber || target.room,
        },
      });

      if (isPrimary) tarekMemberId = updated.id;
      if (updated.isManager) currentManagerMemberId = updated.id;
    } else {
      // Create new user and member
      let user = await prisma.user.findUnique({
        where: { phone: target.phone },
      });

      if (!user) {
        const defaultHash = await hashPassword('mess1234');
        user = await prisma.user.create({
          data: {
            name: target.name,
            phone: target.phone,
            passwordHash: defaultHash,
            role: target.isPrimaryAdmin ? 'ADMIN' : target.isManager ? 'MANAGER' : 'MEMBER',
            isActive: true,
          },
        });
      }

      const isPrimary = target.name === 'Mohammad Tarek Hossen';
      const newMember = await prisma.messMember.create({
        data: {
          messId: mess.id,
          userId: user.id,
          fullName: target.name,
          phone: target.phone,
          roomNumber: target.room,
          isPrimaryAdmin: isPrimary,
          isAdmin: isPrimary,
          isManager: target.isManager,
          isActive: true,
          initialOpeningBalance: 0,
        },
      });

      if (isPrimary) tarekMemberId = newMember.id;
      if (newMember.isManager) currentManagerMemberId = newMember.id;
    }
  }

  // Ensure Tanvir is set as Manager if no other current manager is set
  if (!currentManagerMemberId) {
    const tanvir = await prisma.messMember.findFirst({
      where: { messId: mess.id, fullName: { contains: 'Tanvir' } },
    });
    if (tanvir) {
      await prisma.messMember.update({
        where: { id: tanvir.id },
        data: { isManager: true },
      });
      currentManagerMemberId = tanvir.id;
    }
  }

  // Ensure Mohammad Tarek Hossen is Primary Admin
  const tarek = await prisma.messMember.findFirst({
    where: { messId: mess.id, fullName: 'Mohammad Tarek Hossen' },
  });
  if (tarek) {
    tarekMemberId = tarek.id;
    if (!tarek.isPrimaryAdmin || !tarek.isAdmin) {
      await prisma.messMember.update({
        where: { id: tarek.id },
        data: { isPrimaryAdmin: true, isAdmin: true, isManager: false },
      });
    }
  }

  // Update Mess pointers
  await prisma.mess.update({
    where: { id: mess.id },
    data: {
      primaryAdminMemberId: tarekMemberId,
      currentManagerMemberId: currentManagerMemberId,
    },
  });

  // Ensure initial manager assignment record exists
  if (currentManagerMemberId) {
    const existingAssignment = await prisma.managerAssignment.findFirst({
      where: { messId: mess.id, memberId: currentManagerMemberId, endedAt: null },
    });

    if (!existingAssignment) {
      await prisma.managerAssignment.create({
        data: {
          messId: mess.id,
          memberId: currentManagerMemberId,
          assignedById: tarekMemberId,
          notes: 'Initial mess manager assignment',
        },
      });
    }
  }

  return { messId: mess.id, tarekMemberId, currentManagerMemberId };
}
