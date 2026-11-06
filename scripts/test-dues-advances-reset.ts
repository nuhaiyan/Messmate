import { prisma } from '../src/lib/prisma';
import {
  resetOutstandingDuesAction,
  resetMemberAdvancesAction,
} from '../src/app/actions/dashboard-reset';
import { getMonthAccountingData } from '../src/app/actions/closing';

async function testDuesAndAdvancesReset() {
  console.log('\n================================================================');
  console.log('MessMate - Outstanding Dues & Member Advances Reset Verification');
  console.log('================================================================\n');

  let passed = 0;
  let total = 6;

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

  // 1. Initial State Check for month 11 / 2026
  const initialAcct = await getMonthAccountingData(mess.id, 2026, 11);
  const initialAdvances = initialAcct.calculationResult.totalNetAdvances.toNumber();
  const initialMealRate = initialAcct.calculationResult.mealRate.toNumber();

  console.log(`Initial Month 11 Data:`);
  console.log(`  - Total Advances: ৳${initialAdvances}`);
  console.log(`  - Total Dues: ৳${initialAcct.calculationResult.totalNetDues.toNumber()}`);
  console.log(`  - Meal Rate: ৳${initialMealRate}\n`);

  assert(initialAdvances > 0, 1, `Advances exist initially (৳${initialAdvances.toFixed(2)})`);

  // 2. Test Confirmation Guard on Advances Reset
  const badAdvanceRes = await resetMemberAdvancesAction({
    year: 2026,
    month: 11,
    confirmationWord: 'INVALID',
    reason: 'Should fail confirmation guard',
  });
  assert(
    badAdvanceRes.success === false && Boolean(badAdvanceRes.error?.includes('type RESET')),
    2,
    'Advance reset blocked when confirmation word is not RESET'
  );

  // 3. Execute Advances Reset with 'RESET'
  const advanceResetRes = await resetMemberAdvancesAction({
    year: 2026,
    month: 11,
    confirmationWord: 'RESET',
    reason: 'Automated test of member advances reset',
  });

  const afterAdvanceAcct = await getMonthAccountingData(mess.id, 2026, 11);
  const afterAdvances = afterAdvanceAcct.calculationResult.totalNetAdvances.toNumber();
  const afterMealRate = afterAdvanceAcct.calculationResult.mealRate.toNumber();

  assert(
    advanceResetRes.success === true &&
      afterAdvances === 0 &&
      afterMealRate === initialMealRate,
    3,
    `Member advances successfully reset to ৳0.00 (${advanceResetRes.count} members settled, meal rate preserved at ৳${afterMealRate})`
  );

  // 4. Create an artificial outstanding due for testing dues reset
  // By assigning an individual charge to a member who now has 0 balance
  const firstMember = await prisma.messMember.findFirst({
    where: { messId: mess.id, isActive: true },
  });
  if (!firstMember) throw new Error('No active member found');

  const testDueAmount = 1250.0;
  const testCharge = await prisma.expense.create({
    data: {
      messId: mess.id,
      periodId: initialAcct.period.id,
      date: new Date(),
      title: 'Individual Charge for Due Reset Test',
      amount: testDueAmount,
      expenseType: 'INDIVIDUAL',
      category: 'Other',
      targetMemberId: firstMember.id,
      paymentSource: 'MESS_FUND',
      isApproved: true,
    },
  });

  const acctWithDue = await getMonthAccountingData(mess.id, 2026, 11);
  const duesBeforeReset = acctWithDue.calculationResult.totalNetDues.toNumber();
  assert(duesBeforeReset >= testDueAmount, 4, `Outstanding due created for testing (৳${duesBeforeReset.toFixed(2)})`);

  // 5. Test Confirmation Guard on Dues Reset
  const badDuesRes = await resetOutstandingDuesAction({
    year: 2026,
    month: 11,
    confirmationWord: 'NOPE',
    reason: 'Should fail confirmation guard',
  });
  assert(
    badDuesRes.success === false && Boolean(badDuesRes.error?.includes('type RESET')),
    5,
    'Due reset blocked when confirmation word is not RESET'
  );

  // 6. Execute Dues Reset with 'RESET'
  const duesResetRes = await resetOutstandingDuesAction({
    year: 2026,
    month: 11,
    confirmationWord: 'RESET',
    reason: 'Automated test of outstanding dues reset',
  });

  const afterDuesAcct = await getMonthAccountingData(mess.id, 2026, 11);
  const afterDues = afterDuesAcct.calculationResult.totalNetDues.toNumber();

  assert(
    duesResetRes.success === true &&
      afterDues === 0 &&
      (duesResetRes.totalSettled ?? 0) >= testDueAmount,
    6,
    `Outstanding dues successfully settled to ৳0.00 (${duesResetRes.count} members settled, total ৳${duesResetRes.totalSettled})`
  );

  // Clean up the temporary test charge
  await prisma.expense.delete({ where: { id: testCharge.id } }).catch(() => {});

  console.log('\n================================================================');
  console.log(` RESULT: ${passed}/${total} DUES & ADVANCES RESET TESTS PASSED! `);
  console.log('================================================================\n');
}

testDuesAndAdvancesReset()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
