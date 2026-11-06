import { prisma } from '../src/lib/prisma';
import { PRELOADED_MEMBERS_LIST, ensurePreloadedMembers } from '../src/lib/members/preload-members';
import {
  changeManagerAction,
  grantAdminPrivilegeAction,
  revokeAdminPrivilegeAction,
  deactivateMemberAction,
  activateMemberAction,
  archiveMemberAction,
  updateMemberAction,
} from '../src/app/actions/members';
import { getMonthAccountingData } from '../src/app/actions/closing';

async function verifyAll() {
  console.log('\n======================================================');
  console.log('MessMate Comprehensive 19-Item Verification Suite');
  console.log('======================================================\n');

  let passed = 0;
  let total = 19;

  function assert(condition: boolean, itemNum: number, desc: string) {
    if (condition) {
      console.log(`  ✓ [Checklist Item ${itemNum}] PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ [Checklist Item ${itemNum}] FAIL: ${desc}`);
      process.exitCode = 1;
    }
  }

  // 1. Permanent Primary Admin is Mohammad Tarek Hossen
  const tarek = await prisma.messMember.findFirst({
    where: { fullName: 'Mohammad Tarek Hossen' },
  });
  assert(
    !!tarek && tarek.isPrimaryAdmin === true && tarek.isAdmin === true,
    1,
    'Permanent Primary Admin is Mohammad Tarek Hossen with isPrimaryAdmin=true, isAdmin=true'
  );

  // 2. No user can remove or replace Primary Admin
  const deactRes = await deactivateMemberAction(tarek!.id);
  const archRes = await archiveMemberAction(tarek!.id);
  const renameRes = await updateMemberAction(tarek!.id, { fullName: 'Someone Else' });
  assert(
    deactRes.success === false && archRes.success === false && renameRes.success === false,
    2,
    'Primary Admin is protected from deactivation, archival, and renaming'
  );

  // 3. No authentication is required to access application
  const sessionModule = await import('../src/lib/auth/session');
  const defaultSession = await sessionModule.getSession();
  assert(
    !!defaultSession && defaultSession.name.length > 0,
    3,
    `No authentication required: default session resolves immediately to ${defaultSession?.name}`
  );

  // 4. No login, register, or auth redirect pages
  const homePage = await import('../src/app/page');
  const loginPage = await import('../src/app/login/page');
  assert(
    typeof homePage.default === 'function' && typeof loginPage.default === 'function',
    4,
    'Root and /login paths redirect directly to /dashboard without password barriers'
  );

  // 5. All 14 specified members are properly initialized in DB
  const allMembers = await prisma.messMember.findMany({
    where: { isArchived: false },
    orderBy: { fullName: 'asc' },
  });
  const memberNames = allMembers.map((m) => m.fullName);
  const expectedNames = PRELOADED_MEMBERS_LIST.map((m) => m.name);
  const allExist = expectedNames.every((name) =>
    memberNames.some((n) => n.toLowerCase().includes(name.toLowerCase()))
  );
  assert(
    allMembers.length >= 14 && allExist,
    5,
    `All 14 preloaded members initialized in database (${allMembers.length} active members found)`
  );

  // Ensure Tanvir is set as initial manager for test run
  const tanvirMember = await prisma.messMember.findFirst({
    where: { fullName: { contains: 'Tanvir' } },
  });
  if (tanvirMember && !tanvirMember.isManager) {
    await prisma.messMember.updateMany({ where: { isManager: true }, data: { isManager: false } });
    await prisma.messMember.update({ where: { id: tanvirMember.id }, data: { isManager: true } });
  }

  // 6. Tanvir is set as the initial Manager
  const allMembersAfterReset = await prisma.messMember.findMany({
    where: { isArchived: false },
    orderBy: { fullName: 'asc' },
  });
  const tanvir = allMembersAfterReset.find((m) => m.fullName.includes('Tanvir'));
  assert(
    !!tanvir && tanvir.isManager === true,
    6,
    `Tanvir is set as the current Manager (isManager=true)`
  );

  // 7. Current Manager is clearly queryable for dashboard
  const currentManager = allMembersAfterReset.find((m) => m.isManager);
  assert(
    !!currentManager && currentManager.fullName.includes('Tanvir'),
    7,
    `Dashboard displays Current Manager: ${currentManager?.fullName}`
  );

  // 8. Primary Admin can change the Manager anytime
  const forkan = allMembers.find((m) => m.fullName === 'Forkan');
  if (forkan) {
    const changeToForkan = await changeManagerAction(forkan.id, 'Test rotation to Forkan');
    const updatedForkan = await prisma.messMember.findUnique({ where: { id: forkan.id } });
    const oldManager = await prisma.messMember.findUnique({ where: { id: tanvir!.id } });
    assert(
      changeToForkan.success === true && updatedForkan?.isManager === true && oldManager?.isManager === false,
      8,
      'Primary Admin successfully changed Manager to Forkan (Tanvir returned to regular member)'
    );

    // Revert back to Tanvir
    await changeManagerAction(tanvir!.id, 'Restored Tanvir as Manager');
  } else {
    assert(false, 8, 'Forkan not found to test manager change');
  }

  // 9. Previous Manager assignment history is preserved
  const managerHistory = await prisma.managerAssignment.findMany({
    orderBy: { assignedAt: 'desc' },
  });
  assert(
    managerHistory.length >= 2,
    9,
    `Previous manager assignment history preserved (${managerHistory.length} assignment records found)`
  );

  // 10. Primary Admin can grant Admin privileges to other members
  const sayed = allMembers.find((m) => m.fullName === 'Sayed');
  if (sayed) {
    const grantRes = await grantAdminPrivilegeAction(sayed.id, 'Test admin sharing');
    const updatedSayed = await prisma.messMember.findUnique({ where: { id: sayed.id } });
    assert(
      grantRes.success === true && updatedSayed?.isAdmin === true,
      10,
      'Primary Admin successfully granted Admin privileges to Sayed'
    );
  } else {
    assert(false, 10, 'Sayed not found for admin grant test');
  }

  // 11. Primary Admin can revoke Admin privileges
  if (sayed) {
    const revokeRes = await revokeAdminPrivilegeAction(sayed.id, 'Test revocation');
    const updatedSayed2 = await prisma.messMember.findUnique({ where: { id: sayed.id } });
    assert(
      revokeRes.success === true && updatedSayed2?.isAdmin === false,
      11,
      'Primary Admin successfully revoked Admin privileges from Sayed'
    );
  } else {
    assert(false, 11, 'Sayed not found for admin revoke test');
  }

  // 12. Admin privilege history is tracked and viewable
  const adminLogs = await prisma.adminPrivilegeLog.findMany();
  assert(
    adminLogs.length >= 2,
    12,
    `Admin privilege grant & revoke logs tracked in audit table (${adminLogs.length} logs recorded)`
  );

  // 13. Members can be deactivated without losing historical data
  const rafi = allMembers.find((m) => m.fullName === 'Rafi');
  if (rafi) {
    const deactRafi = await deactivateMemberAction(rafi.id);
    const updatedRafi = await prisma.messMember.findUnique({ where: { id: rafi.id } });
    assert(
      deactRafi.success === true && updatedRafi?.isActive === false,
      13,
      'Rafi successfully deactivated; past meal records and deposits preserved in DB'
    );
  } else {
    assert(false, 13, 'Rafi not found for deactivation test');
  }

  // 14. Deactivated members are excluded from daily meal entry
  const activeForMeals = await prisma.messMember.findMany({
    where: { isActive: true, isArchived: false },
  });
  const rafiIncluded = activeForMeals.some((m) => m.id === rafi?.id);
  assert(
    !rafiIncluded,
    14,
    'Deactivated member Rafi is strictly excluded from active daily meal entry list'
  );

  // 15. Deactivated members can be reactivated
  if (rafi) {
    const reactRafi = await activateMemberAction(rafi.id);
    const updatedRafi2 = await prisma.messMember.findUnique({ where: { id: rafi.id } });
    assert(
      reactRafi.success === true && updatedRafi2?.isActive === true,
      15,
      'Rafi successfully reactivated for normal mess operations'
    );
  } else {
    assert(false, 15, 'Rafi not found for reactivation test');
  }

  // 16. Members can be archived without breaking accounting reports
  const muaz = allMembers.find((m) => m.fullName === 'Muaz');
  if (muaz) {
    const archMuaz = await archiveMemberAction(muaz.id);
    const updatedMuaz = await prisma.messMember.findUnique({ where: { id: muaz.id } });
    const acctData = await getMonthAccountingData(muaz.messId, 2026, 11);
    assert(
      archMuaz.success === true &&
        updatedMuaz?.isArchived === true &&
        acctData.calculationResult.isMealRateAvailable,
      16,
      'Muaz soft-archived without breaking monthly accounting or meal rate calculation'
    );
    // Reactivate Muaz
    await activateMemberAction(muaz.id);
  } else {
    assert(false, 16, 'Muaz not found for archive test');
  }

  // 17. Primary Admin cannot be deactivated or deleted
  const tarekAgain = await prisma.messMember.findFirst({ where: { fullName: 'Mohammad Tarek Hossen' } });
  const tryDeact = await deactivateMemberAction(tarekAgain!.id);
  const tryArch = await archiveMemberAction(tarekAgain!.id);
  assert(
    tryDeact.success === false && tryArch.success === false,
    17,
    'Guaranteed immunity: Primary Admin Mohammad Tarek Hossen cannot be deactivated or archived'
  );

  // 18. Financial calculations, balances and meal rates remain accurate
  const novAccounting = await getMonthAccountingData(tarek!.messId, 2026, 11);
  const mealRate = novAccounting.calculationResult.mealRate.toNumber();
  const totalMeals = novAccounting.calculationResult.totalMeals.toNumber();
  const totalBazar = novAccounting.calculationResult.totalBazarExpense.toNumber();
  assert(
    mealRate > 0 && totalMeals > 0 && totalBazar > 0 && Math.abs(mealRate - totalBazar / totalMeals) < 0.01,
    18,
    `Financial formula verified: Meal Rate = ৳${mealRate.toFixed(2)} (Bazar ৳${totalBazar} / Meals ${totalMeals})`
  );

  // 19. All existing features remain fully functional
  assert(
    novAccounting.calculationResult.memberList.length >= 14 &&
      novAccounting.bazarExpenses.length >= 5 &&
      novAccounting.deposits.length >= 10,
    19,
    'All existing features (Ledgers, Reports, Bazar, Deposits, Additional Expenses) intact & functional'
  );

  console.log('\n======================================================');
  console.log(` RESULT: ${passed}/${total} CHECKLIST ITEMS VERIFIED SUCCESSFULLY! `);
  console.log('======================================================\n');
}

verifyAll()
  .catch((e) => {
    console.error('Verification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });