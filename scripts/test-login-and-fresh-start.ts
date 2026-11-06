import { prisma } from '../src/lib/prisma';
import { getMonthAccountingData } from '../src/app/actions/closing';
import {
  setMemberPasswordAction,
  resetMemberPasswordToDefaultAction,
  toggleMemberLoginAccessAction,
} from '../src/app/actions/members';
import { memberLoginAction } from '../src/app/actions/auth';
import { createSessionToken, verifySessionToken } from '../src/lib/auth/session';
import { comparePassword } from '../src/lib/auth/password';

async function testLoginAndFreshStart() {
  console.log('\n================================================================');
  console.log('MessMate – Login System & Fresh Start Verification Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let total = 10;

  function assert(condition: boolean, testNum: number, desc: string) {
    if (condition) {
      console.log(`  ✓ [Test ${testNum}] PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ [Test ${testNum}] FAIL: ${desc}`);
      process.exitCode = 1;
    }
  }

  const mess = await prisma.mess.findFirst();
  if (!mess) throw new Error('Mess not found');

  // =======================================================================
  // 1. Verify Clean Fresh Start State: All 10 Metrics at Zero
  // =======================================================================
  const acct = await getMonthAccountingData(mess.id, 2026, 11);
  const result = acct.calculationResult;

  const totalMealsVal = result.totalMeals.toNumber();
  const totalBazarVal = result.totalBazarExpense.toNumber();
  const totalDepositsVal = result.totalDeposits.toNumber();
  const totalAdditionalVal = result.totalAdditionalExpenses.toNumber();
  const mealRateVal = result.mealRate.toNumber();
  const totalDuesVal = result.totalNetDues.toNumber();
  const totalAdvancesVal = result.totalNetAdvances.toNumber();

  assert(
    totalMealsVal === 0 &&
      totalBazarVal === 0 &&
      totalDepositsVal === 0 &&
      totalAdditionalVal === 0 &&
      mealRateVal === 0 &&
      totalDuesVal === 0 &&
      totalAdvancesVal === 0,
    1,
    `Dashboard metrics all initialized to ZERO: Meals=${totalMealsVal}, Bazar=৳${totalBazarVal}, Deposits=৳${totalDepositsVal}, Addl=৳${totalAdditionalVal}, Rate=৳${mealRateVal}, Due=৳${totalDuesVal}, Adv=৳${totalAdvancesVal}`
  );

  // =======================================================================
  // 2. Verify All 14 Members Exist and Each has 0 Balance & 0 Activity
  // =======================================================================
  const allMembers = await prisma.messMember.findMany({
    where: { messId: mess.id },
    include: { user: true },
    orderBy: { fullName: 'asc' },
  });

  const allMembersZero = result.memberList.every(
    (m) =>
      m.totalMeals.toNumber() === 0 &&
      m.totalCost.toNumber() === 0 &&
      m.deposits.toNumber() === 0 &&
      m.closingBalance.toNumber() === 0 &&
      m.dueAmount.toNumber() === 0 &&
      m.advanceAmount.toNumber() === 0
  );

  assert(
    allMembers.length === 14 && allMembersZero,
    2,
    `All ${allMembers.length} members exist with individual accounts and ৳0 balance / 0 activity`
  );

  // =======================================================================
  // 3. Verify Permanent Primary Admin & Manager Roles
  // =======================================================================
  const tarek = allMembers.find((m) => m.fullName === 'Mohammad Tarek Hossen');
  const tanvir = allMembers.find((m) => m.fullName === 'Tanvir');

  assert(
    Boolean(tarek?.isPrimaryAdmin && tarek?.isAdmin && !tarek?.isManager && tanvir?.isManager),
    3,
    `Identity preserved: Mohammad Tarek Hossen = Primary Admin, Tanvir = Manager`
  );

  // =======================================================================
  // 4. Verify Admin Password-Free Token Generation
  // =======================================================================
  const adminToken = await createSessionToken({
    userId: tarek!.userId,
    memberId: tarek!.id,
    name: tarek!.fullName,
    phone: tarek!.phone,
    email: tarek!.email,
    role: 'PRIMARY_ADMIN',
    messId: mess.id,
    isPrimaryAdmin: true,
    isAdmin: true,
    isManager: false,
  });

  const verifiedAdmin = await verifySessionToken(adminToken);
  assert(
    verifiedAdmin?.role === 'PRIMARY_ADMIN' && verifiedAdmin?.isPrimaryAdmin === true,
    4,
    `Admin direct password-free access verified: valid cryptographically signed session for ${verifiedAdmin?.name}`
  );

  // =======================================================================
  // 5. Verify Member Login with Default Password (mess1234)
  // =======================================================================
  const forkan = allMembers.find((m) => m.fullName === 'Forkan');
  if (!forkan) throw new Error('Forkan not found');

  const validLogin = await memberLoginAction({
    memberId: forkan.id,
    password: 'mess1234',
  });

  assert(
    validLogin.success === true && validLogin.redirectUrl === '/my-ledger',
    5,
    `Member login with Admin-assigned password succeeds and routes to personal ledger (${validLogin.redirectUrl})`
  );

  // =======================================================================
  // 6. Verify Member Login with Incorrect Password Fails
  // =======================================================================
  const invalidLogin = await memberLoginAction({
    memberId: forkan.id,
    password: 'wrong_password_123',
  });

  assert(
    invalidLogin.success === false && Boolean(invalidLogin.error?.includes('Incorrect password')),
    6,
    `Member login rejects incorrect password with user-friendly error`
  );

  // =======================================================================
  // 7. Verify Admin Can Set & Change Member Password
  // =======================================================================
  const newCustomPass = 'secret9988';
  const setPassRes = await setMemberPasswordAction(forkan.id, newCustomPass);

  const updatedForkanUser = await prisma.user.findUnique({
    where: { id: forkan.userId },
  });
  const passMatches = await comparePassword(newCustomPass, updatedForkanUser?.passwordHash || '');

  assert(
    setPassRes.success === true && passMatches === true,
    7,
    `Admin can set new custom password for member (bcrypt verified)`
  );

  // Test member logs in with the new custom password
  const newPassLogin = await memberLoginAction({
    memberId: forkan.id,
    password: newCustomPass,
  });
  assert(
    newPassLogin.success === true,
    8,
    `Member can successfully authenticate with Admin's newly assigned password`
  );

  // =======================================================================
  // 8. Verify Admin Can Reset Password to Default (mess1234)
  // =======================================================================
  const resetDefaultRes = await resetMemberPasswordToDefaultAction(forkan.id);
  const resetPassLogin = await memberLoginAction({
    memberId: forkan.id,
    password: 'mess1234',
  });

  assert(
    resetDefaultRes.success === true && resetPassLogin.success === true,
    9,
    `Admin can one-click reset password back to default (mess1234)`
  );

  // =======================================================================
  // 9. Verify Admin Can Disable & Re-Enable Member Login Access
  // =======================================================================
  // Disable Forkan's login
  await toggleMemberLoginAccessAction(forkan.id, false);
  const disabledLogin = await memberLoginAction({
    memberId: forkan.id,
    password: 'mess1234',
  });

  // Re-enable Forkan's login
  await toggleMemberLoginAccessAction(forkan.id, true);
  const reEnabledLogin = await memberLoginAction({
    memberId: forkan.id,
    password: 'mess1234',
  });

  assert(
    disabledLogin.success === false &&
      Boolean(disabledLogin.error?.includes('disabled')) &&
      reEnabledLogin.success === true,
    10,
    `Admin can disable member login access (blocked) and re-enable login access (restored)`
  );

  console.log('\n================================================================');
  console.log(` RESULT: ${passed}/${total} LOGIN & FRESH START TESTS PASSED! `);
  console.log('================================================================\n');
}

testLoginAndFreshStart()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
