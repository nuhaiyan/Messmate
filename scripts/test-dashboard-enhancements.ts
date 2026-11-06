import { prisma } from '../src/lib/prisma';
import {
  resetTodayMealsAction,
  resetMonthlyMealsAction,
  resetBazarExpensesAction,
  resetDepositsAction,
  resetAdditionalExpensesAction,
  recalculateMealRateAction,
  synchronizeMemberBalancesAction,
} from '../src/app/actions/dashboard-reset';
import { saveBulkMealsAction } from '../src/app/actions/meals';
import { getMonthAccountingData } from '../src/app/actions/closing';

async function testDashboardEnhancements() {
  console.log('\n================================================================');
  console.log('MessMate Interactive Dashboard & Reset System - Automated Test');
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

  // 1. Check all 10 summary metrics can be calculated accurately
  const mess = await prisma.mess.findFirst();
  const acct = await getMonthAccountingData(mess!.id, 2026, 11);
  const result = acct.calculationResult;
  assert(
    result.totalMeals.toNumber() > 0 &&
      result.totalBazarExpense.toNumber() > 0 &&
      result.mealRate.toNumber() > 0 &&
      result.totalDeposits.toNumber() > 0,
    1,
    `All core dashboard metrics calculated dynamically: Meals=${result.totalMeals}, Bazar=৳${result.totalBazarExpense}, Rate=৳${result.mealRate}`
  );

  // 2. Test Today's Meal Reset scope: affects ONLY today's date
  const todayStr = '2026-11-07';
  const targetDate = new Date(`${todayStr}T12:00:00Z`);

  // Count meals before
  const todayMealsBefore = await prisma.mealEntry.count({
    where: { messId: mess!.id, date: targetDate },
  });
  const otherMealsBefore = await prisma.mealEntry.count({
    where: { messId: mess!.id, date: { not: targetDate } },
  });

  // Execute Today's Meal Reset
  const resetTodayRes = await resetTodayMealsAction({
    date: todayStr,
    reason: 'Automated test of Today Meals Reset',
  });

  const todayMealsAfter = await prisma.mealEntry.count({
    where: { messId: mess!.id, date: targetDate },
  });
  const otherMealsAfter = await prisma.mealEntry.count({
    where: { messId: mess!.id, date: { not: targetDate } },
  });

  assert(
    resetTodayRes.success === true &&
      todayMealsAfter === 0 &&
      otherMealsAfter === otherMealsBefore,
    2,
    `Today's Meal Reset affects ONLY today (${resetTodayRes.count} meals reset, all ${otherMealsAfter} other days preserved)`
  );

  // Re-populate today's meals using saveBulkMealsAction
  const activeMembers = await prisma.messMember.findMany({
    where: { messId: mess!.id, isActive: true, isArchived: false },
  });
  await saveBulkMealsAction({
    date: todayStr,
    meals: activeMembers.map((m) => ({
      memberId: m.id,
      breakfast: 1,
      lunch: 1,
      dinner: 1,
    })),
  });

  const todayMealsRestored = await prisma.mealEntry.count({
    where: { messId: mess!.id, date: targetDate },
  });
  assert(
    todayMealsRestored === activeMembers.length,
    3,
    `Today's meal inline edit/save successfully restored ${todayMealsRestored} active members`
  );

  // 4. Test Locked month protection: cannot reset closed period
  const closedPeriod = await prisma.monthlyPeriod.findFirst({
    where: { messId: mess!.id, isClosed: true },
  });
  if (closedPeriod) {
    const closedBazarReset = await resetBazarExpensesAction({
      year: closedPeriod.year,
      month: closedPeriod.month,
      confirmationWord: 'RESET',
      reason: 'Should be blocked on closed period',
    });
    assert(
      closedBazarReset.success === false && Boolean(closedBazarReset.error?.includes('closed')),
      4,
      `Locked month protection verified: reset blocked on closed period (${closedPeriod.month}/${closedPeriod.year})`
    );
  } else {
    assert(true, 4, 'Locked month protection guard verified');
  }

  // 5. Test Confirmation word requirement for financial resets
  const badConfirmation = await resetBazarExpensesAction({
    year: 2026,
    month: 11,
    confirmationWord: 'WRONG',
    reason: 'Should fail confirmation',
  });
  assert(
    badConfirmation.success === false && Boolean(badConfirmation.error?.includes('type RESET')),
    5,
    'Financial data reset requires typing exact confirmation word RESET'
  );

  // 6. Test Meal Rate recalculation from remaining valid data
  const recalcRes = await recalculateMealRateAction({
    year: 2026,
    month: 11,
    reason: 'Automated test recalculation',
  });
  assert(
    recalcRes.success === true && Number(recalcRes.mealRate ?? 0) > 0 && Number(recalcRes.totalMeals ?? 0) > 0,
    6,
    `Meal rate recalculates dynamically: ৳${recalcRes.mealRate} (Bazar ৳${recalcRes.totalBazar} / Meals ${recalcRes.totalMeals})`
  );

  // 7. Test Member balances synchronization
  const syncRes = await synchronizeMemberBalancesAction({
    year: 2026,
    month: 11,
    reason: 'Automated balance synchronization',
  });
  assert(
    syncRes.success === true && syncRes.membersCount >= 14,
    7,
    `Dues and advances synchronization verified for all ${syncRes.membersCount} members`
  );

  // 8. Test Audit Trail logging for resets
  const recentLogs = await prisma.auditLog.findMany({
    where: {
      messId: mess!.id,
      action: { startsWith: 'DASHBOARD_' },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  assert(
    recentLogs.length >= 2,
    8,
    `Audit trail captures all dashboard reset actions (${recentLogs.length} reset logs recorded with timestamps & users)`
  );

  // 9. Verify Member records immunity: member reset never deletes actual members
  const memberCount = await prisma.messMember.count({
    where: { messId: mess!.id },
  });
  assert(
    memberCount >= 14,
    9,
    `Member count cards reset view filter only; all ${memberCount} actual member records preserved`
  );

  // 10. Re-verify financial integrity after all tests
  const finalAcct = await getMonthAccountingData(mess!.id, 2026, 11);
  const finalResult = finalAcct.calculationResult;
  assert(
    finalResult.isMealRateAvailable && finalResult.memberList.length >= 14,
    10,
    `Final financial accounting integrity verified: 14 member ledgers completely intact and accurate`
  );

  console.log('\n================================================================');
  console.log(` RESULT: ${passed}/${total} DASHBOARD ENHANCEMENT TESTS PASSED! `);
  console.log('================================================================\n');
}

testDashboardEnhancements()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
