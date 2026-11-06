import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MessMate database seed with 14 preloaded members (Clean Fresh Start)...');

  // Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.adminPrivilegeLog.deleteMany();
  await prisma.managerAssignment.deleteMany();
  await prisma.memberLedgerEntry.deleteMany();
  await prisma.monthlyClosingDetail.deleteMany();
  await prisma.monthlyClosing.deleteMany();
  await prisma.sharedExpenseAllocation.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.mealEntry.deleteMany();
  await prisma.monthlyPeriod.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.messSetting.deleteMany();
  await prisma.messProfile.deleteMany();
  await prisma.messMember.deleteMany();
  await prisma.mess.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Mess
  const mess = await prisma.mess.create({
    data: {
      name: 'Bashundhara Bachelor Mess',
      address: 'House 42, Road 8, Block C, Bashundhara R/A, Dhaka 1229',
      currency: 'BDT',
      currencySymbol: '৳',
      timezone: 'Asia/Dhaka',
      fractionalMeals: true,
    },
  });

  // 2. Settings
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

  // 2b. Mess Profile
  await prisma.messProfile.create({
    data: {
      messId: mess.id,
      messName: mess.name,
      fullAddress: mess.address,
      location: 'Bashundhara R/A, Dhaka, Bangladesh',
      contactPhone: '01711000001',
      description: 'Private bachelor accommodation and transparent digital accounting system.',
      establishedDate: new Date('2026-09-01'),
    },
  });

  // 3. Default Expense Categories
  const categories: { name: string; nameBn: string; type: 'BAZAR' | 'SHARED' | 'INDIVIDUAL' }[] = [
    { name: 'Rice', nameBn: 'চাল', type: 'BAZAR' },
    { name: 'Vegetables', nameBn: 'শাক-সবজি', type: 'BAZAR' },
    { name: 'Fish', nameBn: 'মাছ', type: 'BAZAR' },
    { name: 'Meat', nameBn: 'মাংস (গরু/খাসি)', type: 'BAZAR' },
    { name: 'Chicken', nameBn: 'মুরগি', type: 'BAZAR' },
    { name: 'Eggs', nameBn: 'ডিম', type: 'BAZAR' },
    { name: 'Grocery', nameBn: 'মুদি সামগ্রী', type: 'BAZAR' },
    { name: 'Milk', nameBn: 'দুধ', type: 'BAZAR' },
    { name: 'Spices', nameBn: 'মসলাপাতি', type: 'BAZAR' },
    { name: 'Cook / Maid Salary', nameBn: 'খালা / রাঁধুনি বেতন', type: 'SHARED' },
    { name: 'Electricity', nameBn: 'বিদ্যুৎ বিল', type: 'SHARED' },
    { name: 'Internet', nameBn: 'ইন্টারনেট / ওয়াইফাই', type: 'SHARED' },
    { name: 'Gas Cylinder', nameBn: 'গ্যাস সিলিন্ডার', type: 'SHARED' },
    { name: 'Drinking Water', nameBn: 'খাবার পানি', type: 'SHARED' },
    { name: 'Waste Management', nameBn: 'ময়লা বিল', type: 'SHARED' },
    { name: 'Maintenance', nameBn: 'মেরামত ও রক্ষণাবেক্ষণ', type: 'SHARED' },
  ];

  for (const cat of categories) {
    await prisma.expenseCategory.create({
      data: {
        messId: mess.id,
        name: cat.name,
        nameBn: cat.nameBn,
        type: cat.type,
        isDefault: true,
      },
    });
  }

  // 4. Exact 14 Members Preloaded with Clean Initial Opening Balances (0)
  const defaultPasswordHash = await bcrypt.hash('mess1234', 10);

  const memberDefs = [
    { name: 'Mohammad Tarek Hossen', phone: '01711000001', room: 'Room 101', openingBal: 0, isPrimaryAdmin: true, isAdmin: true, isManager: false },
    { name: 'Forkan', phone: '01711000002', room: 'Room 101', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: false },
    { name: 'Tanvir', phone: '01711000003', room: 'Room 102', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: true }, // Current Manager
    { name: 'Sayed', phone: '01711000004', room: 'Room 102', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: false },
    { name: 'Rafi', phone: '01711000005', room: 'Room 103', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: false },
    { name: 'Mahin', phone: '01711000006', room: 'Room 103', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: false },
    { name: 'Misu', phone: '01711000007', room: 'Room 201', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: false },
    { name: 'Safi', phone: '01711000008', room: 'Room 201', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: false },
    { name: 'Mahi', phone: '01711000009', room: 'Room 202', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: false },
    { name: 'Yousuf', phone: '01711000010', room: 'Room 202', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: false },
    { name: 'Masum', phone: '01711000011', room: 'Room 203', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: false },
    { name: 'Forid', phone: '01711000012', room: 'Room 203', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: false },
    { name: 'Fahim', phone: '01711000013', room: 'Room 204', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: false },
    { name: 'Muaz', phone: '01711000014', room: 'Room 204', openingBal: 0, isPrimaryAdmin: false, isAdmin: false, isManager: false },
  ];

  let tarekMemberId = '';
  let tanvirMemberId = '';
  let tarekUserId = '';

  for (const m of memberDefs) {
    const user = await prisma.user.create({
      data: {
        name: m.name,
        phone: m.phone,
        passwordHash: defaultPasswordHash,
        role: m.isPrimaryAdmin ? 'ADMIN' : m.isManager ? 'MANAGER' : 'MEMBER',
        isActive: true,
      },
    });

    const member = await prisma.messMember.create({
      data: {
        messId: mess.id,
        userId: user.id,
        fullName: m.name,
        phone: m.phone,
        roomNumber: m.room,
        initialOpeningBalance: m.openingBal,
        joiningDate: new Date('2026-09-01'),
        isActive: true,
        isArchived: false,
        isPrimaryAdmin: m.isPrimaryAdmin,
        isAdmin: m.isAdmin,
        isManager: m.isManager,
      },
    });

    if (m.isPrimaryAdmin) {
      tarekMemberId = member.id;
      tarekUserId = user.id;
    }
    if (m.isManager) {
      tanvirMemberId = member.id;
    }
  }

  // Update Mess primary admin & manager pointers
  await prisma.mess.update({
    where: { id: mess.id },
    data: {
      primaryAdminMemberId: tarekMemberId,
      currentManagerMemberId: tanvirMemberId,
      primaryManagerId: tanvirMemberId,
    },
  });

  // Record initial ManagerAssignment for Tanvir assigned by Mohammad Tarek Hossen
  await prisma.managerAssignment.create({
    data: {
      messId: mess.id,
      memberId: tanvirMemberId,
      assignedById: tarekMemberId,
      notes: 'Initial mess manager assignment by Primary Admin Mohammad Tarek Hossen',
    },
  });

  // 5. Monthly Period: Clean Open State for November 2026
  await prisma.monthlyPeriod.create({
    data: {
      messId: mess.id,
      year: 2026,
      month: 11,
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-30'),
      isClosed: false,
    },
  });

  // 6. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      messId: mess.id,
      userId: tarekUserId,
      action: 'SYSTEM_FRESH_START_INITIALIZATION',
      entity: 'MESS',
      entityId: mess.id,
      details: JSON.stringify({
        primaryAdmin: 'Mohammad Tarek Hossen',
        manager: 'Tanvir',
        totalMembers: 14,
        status: 'CLEAN_FRESH_START',
        allBalancesAtZero: true,
      }),
    },
  });

  console.log('✅ Preloaded all 14 members in clean state:');
  memberDefs.forEach((m, idx) => {
    console.log(`   ${idx + 1}. ${m.name} (${m.isPrimaryAdmin ? 'Primary Admin' : m.isManager ? 'Current Manager' : 'Regular Member'}) - Password: mess1234`);
  });
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
