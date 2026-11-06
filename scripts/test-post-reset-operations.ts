import { prisma } from '../src/lib/prisma';
import { getMonthAccountingData } from '../src/app/actions/closing';

async function testPostResetOperations() {
  console.log('\n================================================================');
  console.log('MessMate – Post-Reset Operational Transactions Verification');
  console.log('================================================================\n');

  let passed = 0;
  let total = 4;

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

  const period = await prisma.monthlyPeriod.findUnique({
    where: { messId_year_month: { messId: mess.id, year: 2026, month: 11 } },
  });
  if (!period) throw new Error('Period 11/2026 not found');

  const forkan = await prisma.messMember.findFirst({
    where: { messId: mess.id, fullName: 'Forkan' },
  });
  if (!forkan) throw new Error('Forkan not found');

  console.log('Testing new transaction flow on clean database...');

  // 1. Add 3 meals for Forkan
  const testMeal = await prisma.mealEntry.create({
    data: {
      messId: mess.id,
      periodId: period.id,
      memberId: forkan.id,
      date: new Date('2026-11-08T12:00:00Z'),
      breakfast: 1,
      lunch: 1,
      dinner: 1,
      totalMeals: 3,
    },
  });

  // 2. Add ৳1,500 Bazar Expense
  const testBazar = await prisma.expense.create({
    data: {
      messId: mess.id,
      periodId: period.id,
      date: new Date('2026-11-08T12:00:00Z'),
      title: 'Post-Reset Test Bazar (Fresh Chicken)',
      amount: 1500,
      expenseType: 'BAZAR',
      category: 'Chicken',
      paymentSource: 'MESS_FUND',
      isApproved: true,
    },
  });

  // 3. Add ৳3,000 Deposit for Forkan
  const testDeposit = await prisma.deposit.create({
    data: {
      messId: mess.id,
      periodId: period.id,
      memberId: forkan.id,
      depositDate: new Date('2026-11-08T12:00:00Z'),
      amount: 3000,
      paymentMethod: 'BKASH',
      notes: 'Post-reset verification deposit',
    },
  });

  // 4. Compute Month Accounting Data
  const acct = await getMonthAccountingData(mess.id, 2026, 11);
  const result = acct.calculationResult;

  assert(
    result.totalMeals.toNumber() === 3,
    1,
    `New meals calculated dynamically (Total Meals = ${result.totalMeals})`
  );

  assert(
    result.totalBazarExpense.toNumber() === 1500 && result.mealRate.toNumber() === 500,
    2,
    `New bazar expense & meal rate calculated accurately: Bazar=৳${result.totalBazarExpense}, Rate=৳${result.mealRate}`
  );

  assert(
    result.totalDeposits.toNumber() === 3000,
    3,
    `New deposit recorded dynamically (Total Deposits = ৳${result.totalDeposits})`
  );

  const forkanSummary = result.membersSummary[forkan.id];
  assert(
    forkanSummary?.closingBalance.toNumber() === 1500 &&
      forkanSummary?.advanceAmount.toNumber() === 1500 &&
      forkanSummary?.dueAmount.toNumber() === 0,
    4,
    `Forkan's ledger correctly updated: Cost=৳${forkanSummary?.totalCost}, Deposit=৳${forkanSummary?.deposits}, Advance=৳${forkanSummary?.advanceAmount}`
  );

  // Clean up temporary test entries
  await prisma.mealEntry.delete({ where: { id: testMeal.id } });
  await prisma.expense.delete({ where: { id: testBazar.id } });
  await prisma.deposit.delete({ where: { id: testDeposit.id } });

  console.log('\n================================================================');
  console.log(` RESULT: ${passed}/${total} POST-RESET TRANSACTION TESTS PASSED! `);
  console.log('================================================================\n');
}

testPostResetOperations()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
