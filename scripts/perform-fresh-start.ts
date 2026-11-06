import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

async function performFreshStartReset() {
  console.log('\n================================================================');
  console.log('MessMate – Complete Fresh Start & Operational Data Reset');
  console.log('================================================================\n');

  // 1. BACKUP EXISTING DATA BEFORE RESET
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `operational_backup_${timestamp}.json`);

  console.log('📦 Step 1: Exporting full operational backup...');
  const backupData = {
    timestamp: new Date().toISOString(),
    messes: await prisma.mess.findMany(),
    users: await prisma.user.findMany(),
    members: await prisma.messMember.findMany(),
    mealEntries: await prisma.mealEntry.findMany(),
    expenses: await prisma.expense.findMany(),
    sharedAllocations: await prisma.sharedExpenseAllocation.findMany(),
    deposits: await prisma.deposit.findMany(),
    monthlyPeriods: await prisma.monthlyPeriod.findMany(),
    monthlyClosings: await prisma.monthlyClosing.findMany(),
    closingDetails: await prisma.monthlyClosingDetail.findMany(),
    memberLedgerEntries: await prisma.memberLedgerEntry.findMany(),
    auditLogs: await prisma.auditLog.findMany(),
  };

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`   ✓ Backup successfully preserved at: ${backupFilePath}\n`);

  // 2. CLEAR ALL OPERATIONAL & FINANCIAL TRANSACTION DATA
  console.log('🧹 Step 2: Resetting all operational records to zero...');

  // Delete transaction records in reverse dependency order
  const delShared = await prisma.sharedExpenseAllocation.deleteMany({});
  console.log(`   - Deleted ${delShared.count} shared expense allocations.`);

  const delExpenses = await prisma.expense.deleteMany({});
  console.log(`   - Deleted ${delExpenses.count} expenses (bazar, shared & individual).`);

  const delDeposits = await prisma.deposit.deleteMany({});
  console.log(`   - Deleted ${delDeposits.count} deposits.`);

  const delMeals = await prisma.mealEntry.deleteMany({});
  console.log(`   - Deleted ${delMeals.count} meal entries.`);

  const delClosingDetails = await prisma.monthlyClosingDetail.deleteMany({});
  console.log(`   - Deleted ${delClosingDetails.count} monthly closing details.`);

  const delClosings = await prisma.monthlyClosing.deleteMany({});
  console.log(`   - Deleted ${delClosings.count} monthly closings.`);

  const delLedgers = await prisma.memberLedgerEntry.deleteMany({});
  console.log(`   - Deleted ${delLedgers.count} member ledger entries.`);

  // 3. REINITIALIZE CURRENT ACCOUNTING PERIOD TO CLEAN OPEN STATE
  console.log('\n📅 Step 3: Reinitializing monthly accounting period...');
  const mess = await prisma.mess.findFirst();
  if (!mess) throw new Error('Mess record not found');

  // Remove old historical closed periods
  await prisma.monthlyPeriod.deleteMany({
    where: { messId: mess.id, NOT: { year: 2026, month: 11 } },
  });

  // Ensure current active period (11/2026) is completely open and clean
  const currentPeriod = await prisma.monthlyPeriod.upsert({
    where: {
      messId_year_month: { messId: mess.id, year: 2026, month: 11 },
    },
    create: {
      messId: mess.id,
      year: 2026,
      month: 11,
      startDate: new Date('2026-11-01T00:00:00Z'),
      endDate: new Date('2026-11-30T23:59:59Z'),
      isClosed: false,
    },
    update: {
      isClosed: false,
      closedAt: null,
      closedById: null,
      reopenedAt: new Date(),
      reopenReason: 'Complete Fresh Start reset to clean state',
    },
  });
  console.log(`   ✓ Active accounting period set to 11/2026 (Open, 0 records).`);

  // 4. PRESERVE ALL 14 MEMBERS & RESET OPENING BALANCES TO 0
  console.log('\n👥 Step 4: Resetting balances for all 14 members to zero...');
  await prisma.messMember.updateMany({
    where: { messId: mess.id },
    data: {
      initialOpeningBalance: 0,
      isActive: true,
      isArchived: false,
      archivedAt: null,
    },
  });

  // Ensure Primary Admin Mohammad Tarek Hossen
  const tarek = await prisma.messMember.findFirst({
    where: { messId: mess.id, fullName: 'Mohammad Tarek Hossen' },
  });
  if (tarek) {
    await prisma.messMember.update({
      where: { id: tarek.id },
      data: { isPrimaryAdmin: true, isAdmin: true, isManager: false },
    });
  }

  // Ensure Manager Tanvir
  const tanvir = await prisma.messMember.findFirst({
    where: { messId: mess.id, fullName: { contains: 'Tanvir' } },
  });
  if (tanvir) {
    await prisma.messMember.update({
      where: { id: tanvir.id },
      data: { isManager: true, isPrimaryAdmin: false },
    });
  }

  // 5. INITIALIZE DEFAULT MEMBER PASSWORDS
  console.log('\n🔑 Step 5: Assigning initial Admin-controlled passwords for members...');
  const defaultPasswordHash = await bcrypt.hash('mess1234', 10);

  const allMembers = await prisma.messMember.findMany({
    where: { messId: mess.id },
    include: { user: true },
  });

  for (const m of allMembers) {
    await prisma.user.update({
      where: { id: m.userId },
      data: {
        passwordHash: defaultPasswordHash,
        isActive: true,
      },
    });
  }
  console.log(`   ✓ Assigned default password ("mess1234") to all ${allMembers.length} member accounts.`);
  console.log(`   ✓ Admin can change or reset any member's password from the Admin Panel.`);

  // 6. RECORD AUDIT LOG FOR FRESH START
  console.log('\n📝 Step 6: Logging Fresh Start audit trail...');
  await prisma.auditLog.create({
    data: {
      messId: mess.id,
      userId: tarek?.userId || allMembers[0].userId,
      action: 'SYSTEM_FRESH_START_RESET',
      entity: 'SYSTEM',
      details: JSON.stringify({
        performedBy: 'Mohammad Tarek Hossen (Primary Admin)',
        reason: 'Complete application fresh start - all financial and activity records reset to zero',
        preservedMembers: allMembers.length,
        defaultMemberPassword: 'mess1234',
        period: '2026-11',
      }),
    },
  });
  console.log('   ✓ Audit log entry created.');

  console.log('\n================================================================');
  console.log(' ✅ COMPLETE FRESH START COMPLETED SUCCESSFULLY! ');
  console.log('================================================================\n');
}

performFreshStartReset()
  .catch((e) => {
    console.error('Reset error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
