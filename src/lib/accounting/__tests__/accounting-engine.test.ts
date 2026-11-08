import Decimal from 'decimal.js';
import {
  MessAccountingEngine,
  MemberMealData,
  BazarExpenseData,
  AdditionalExpenseData,
  DepositData,
} from '../accounting-engine';

/**
 * MessMate Automated Accounting Engine Test Suite
 * Covers all 15 scenarios required by Specification Section 18
 */

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
  } catch (error) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(error);
    throw error;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

console.log('\n======================================================');
console.log('MessMate Accounting Engine - Automated Verification');
console.log('======================================================\n');

// 1. Multiple members with different meal counts
runTest('Scenario 1: Multiple members with different meal counts', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'Shakil', breakfast: 10, lunch: 20, dinner: 20, totalMeals: 50, isActive: true, openingBalance: 0 },
    { memberId: 'm2', fullName: 'Tanvir', breakfast: 15, lunch: 25, dinner: 25, totalMeals: 65, isActive: true, openingBalance: 0 },
    { memberId: 'm3', fullName: 'Rafiq', breakfast: 5, lunch: 15, dinner: 15, totalMeals: 35, isActive: true, openingBalance: 0 },
  ];
  const bazar: BazarExpenseData[] = [
    { id: 'b1', amount: 9000, category: 'Grocery', paymentSource: 'MESS_FUND' },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazar,
    additionalExpenses: [],
    deposits: [],
  });

  // Total meals = 50 + 65 + 35 = 150
  assert(res.totalMeals.equals(150), `Total meals should be 150, got ${res.totalMeals}`);
  // Meal rate = 9000 / 150 = 60
  assert(res.mealRate.equals(60), `Meal rate should be 60, got ${res.mealRate}`);
  // Member 1 cost = 50 * 60 = 3000
  assert(res.membersSummary['m1'].mealCost.equals(3000), 'm1 meal cost should be 3000');
  // Member 2 cost = 65 * 60 = 3900
  assert(res.membersSummary['m2'].mealCost.equals(3900), 'm2 meal cost should be 3900');
  // Member 3 cost = 35 * 60 = 2100
  assert(res.membersSummary['m3'].mealCost.equals(2100), 'm3 meal cost should be 2100');
});

// 2. Zero meal entries
runTest('Scenario 2: Zero meal entries guard against division by zero', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'Absent Member', breakfast: 0, lunch: 0, dinner: 0, totalMeals: 0, isActive: true, openingBalance: 0 },
  ];
  const bazar: BazarExpenseData[] = [
    { id: 'b1', amount: 2000, category: 'Rice', paymentSource: 'MESS_FUND' },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazar,
    additionalExpenses: [],
    deposits: [],
  });

  assert(res.totalMeals.equals(0), 'Total meals should be 0');
  assert(!res.isMealRateAvailable, 'Meal rate should be unavailable');
  assert(res.mealRate.equals(0), 'Meal rate should safely be 0 without error');
  assert(res.membersSummary['m1'].mealCost.equals(0), 'Meal cost should be 0');
});

// 3. Different bazar expenses categories
runTest('Scenario 3: Aggregate different bazar categories properly', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'A', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 0 },
  ];
  const bazar: BazarExpenseData[] = [
    { id: 'b1', amount: 1200, category: 'Meat', paymentSource: 'MESS_FUND' },
    { id: 'b2', amount: 450, category: 'Fish', paymentSource: 'MESS_FUND' },
    { id: 'b3', amount: 350, category: 'Vegetables', paymentSource: 'MESS_FUND' },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazar,
    additionalExpenses: [],
    deposits: [],
  });
  // Total bazar = 1200 + 450 + 350 = 2000
  assert(res.totalBazarExpense.equals(2000), `Total bazar should be 2000, got ${res.totalBazarExpense}`);
  // Meal rate = 2000 / 30 = 66.6667
  assert(res.mealRate.equals(66.6667), `Meal rate should be 66.6667, got ${res.mealRate}`);
});

// 4. Member deposits (Contributions, NOT expenses, NOT in meal rate)
runTest('Scenario 4: Member deposits are contributions, not in meal rate', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'A', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 0 },
  ];
  const bazar: BazarExpenseData[] = [
    { id: 'b1', amount: 1500, category: 'Grocery', paymentSource: 'MESS_FUND' },
  ];
  const deposits: DepositData[] = [
    { id: 'd1', memberId: 'm1', amount: 5000 },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazar,
    additionalExpenses: [],
    deposits,
  });

  // Total bazar is 1500 (deposits must NOT alter meal rate)
  assert(res.mealRate.equals(50), `Meal rate should be 1500 / 30 = 50, got ${res.mealRate}`);
  // Closing balance = 0 + 5000 (deposit) - 1500 (meal cost) = 3500 Advance
  assert(res.membersSummary['m1'].closingBalance.equals(3500), `Balance should be 3500, got ${res.membersSummary['m1'].closingBalance}`);
  assert(res.membersSummary['m1'].isAdvance, 'Should be in Advance');
});

// 5. Personal bazar payments (Credits member, prevents double counting)
runTest('Scenario 5: Personal bazar payment credits the member', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'Shohel (Purchaser)', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 0 },
    { memberId: 'm2', fullName: 'Hasan', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 0 },
  ];
  // Shohel bought 3000 BDT worth of meat from his pocket
  const bazar: BazarExpenseData[] = [
    { id: 'b1', amount: 3000, category: 'Meat', paymentSource: 'PERSONAL', payerMemberId: 'm1' },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazar,
    additionalExpenses: [],
    deposits: [],
  });

  // Meal rate = 3000 / 60 = 50
  assert(res.mealRate.equals(50), 'Meal rate should be 50');
  // Shohel: Cost = 30 * 50 = 1500. Personal payment = 3000. Balance = 3000 - 1500 = +1500 (Advance)
  assert(res.membersSummary['m1'].personalPayments.equals(3000), 'Shohel should have 3000 personal payment credited');
  assert(res.membersSummary['m1'].closingBalance.equals(1500), 'Shohel balance should be +1500');
  // Hasan: Cost = 30 * 50 = 1500. Personal payment = 0. Balance = -1500 (Due)
  assert(res.membersSummary['m2'].personalPayments.equals(0), 'Hasan personal payment is 0');
  assert(res.membersSummary['m2'].closingBalance.equals(-1500), 'Hasan balance should be -1500');
  assert(res.membersSummary['m2'].isDue, 'Hasan should be in Due');
});

// 6. Mess fund payments (Does not double-credit member)
runTest('Scenario 6: Mess fund payments do not credit any individual member', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'A', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 0 },
  ];
  const bazar: BazarExpenseData[] = [
    { id: 'b1', amount: 1500, category: 'Chicken', paymentSource: 'MESS_FUND' },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazar,
    additionalExpenses: [],
    deposits: [],
  });
  assert(res.membersSummary['m1'].personalPayments.equals(0), 'Personal payment must be 0 for mess fund payment');
  assert(res.totalMessFundPayments.equals(1500), 'Mess fund payment tracked');
});

// 7. Shared expenses (Excluded from meal rate, allocated equally)
runTest('Scenario 7: Shared expenses excluded from meal rate and distributed equally', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'A', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 0 },
    { memberId: 'm2', fullName: 'B', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 0 },
  ];
  const bazar: BazarExpenseData[] = [
    { id: 'b1', amount: 3000, category: 'Grocery', paymentSource: 'MESS_FUND' },
  ];
  const additional: AdditionalExpenseData[] = [
    { id: 'a1', title: 'Internet Bill', amount: 1000, category: 'Internet', expenseType: 'SHARED', allocationMethod: 'EQUAL' },
    { id: 'a2', title: 'Cook Salary', amount: 4000, category: 'Cook / Maid Salary', expenseType: 'SHARED', allocationMethod: 'EQUAL' },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazar,
    additionalExpenses: additional,
    deposits: [],
  });

  // Traditional meal rate MUST only be 3000 / 60 = 50 (NOT including 5000 internet+cook)
  assert(res.mealRate.equals(50), `Meal rate must be strictly 50, got ${res.mealRate}`);
  // Shared expenses per head = 5000 / 2 = 2500
  assert(res.membersSummary['m1'].sharedExpenseCost.equals(2500), 'Shared expense per head should be 2500');
  // Total cost per member = 1500 (meals) + 2500 (shared) = 4000
  assert(res.membersSummary['m1'].totalCost.equals(4000), `Total cost should be 4000, got ${res.membersSummary['m1'].totalCost}`);
});

// 8. Individual expenses assigned to a specific member
runTest('Scenario 8: Individual expense assigned only to target member', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'A', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 0 },
    { memberId: 'm2', fullName: 'B', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 0 },
  ];
  const additional: AdditionalExpenseData[] = [
    { id: 'a1', title: 'Room Key Replacement', amount: 300, category: 'Maintenance', expenseType: 'INDIVIDUAL', targetMemberId: 'm2' },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: [],
    additionalExpenses: additional,
    deposits: [],
  });

  assert(res.membersSummary['m1'].individualExpenseCost.equals(0), 'm1 should have 0 individual cost');
  assert(res.membersSummary['m2'].individualExpenseCost.equals(300), 'm2 should have 300 individual cost');
});

// 9. Previous month balances carry forward
runTest('Scenario 9: Previous month balances carry forward correctly', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'A (Had Due)', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: -1200 },
    { memberId: 'm2', fullName: 'B (Had Advance)', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 800 },
  ];
  const deposits: DepositData[] = [
    { id: 'd1', memberId: 'm1', amount: 2000 },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: [],
    additionalExpenses: [],
    deposits,
  });

  // m1: Opening -1200 + Deposit 2000 - Cost 0 = +800
  assert(res.membersSummary['m1'].closingBalance.equals(800), `m1 closing balance should be 800, got ${res.membersSummary['m1'].closingBalance}`);
  // m2: Opening 800 + 0 - 0 = +800
  assert(res.membersSummary['m2'].closingBalance.equals(800), 'm2 closing balance should be 800');
});

// 10. Mid-month member joining (Prorated shared expense)
runTest('Scenario 10: Mid-month joining prorated shared calculation', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'Full-time Member', breakfast: 30, lunch: 30, dinner: 30, totalMeals: 90, isActive: true, openingBalance: 0, joiningDate: new Date('2026-11-01') },
    { memberId: 'm2', fullName: 'Joined on 16th', breakfast: 15, lunch: 15, dinner: 15, totalMeals: 45, isActive: true, openingBalance: 0, joiningDate: new Date('2026-11-16') },
  ];
  const additional: AdditionalExpenseData[] = [
    { id: 'a1', title: 'House Rent', amount: 9000, category: 'House Rent', expenseType: 'SHARED', allocationMethod: 'PROPORTIONAL' },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: [],
    additionalExpenses: additional,
    deposits: [],
    daysInMonth: 30,
  });

  // m1 was active 30 days, m2 was active 15 days (30 - 16 + 1 = 15). Total days = 45.
  // m1 ratio = 30/45 = 2/3 of 9000 = 6000
  // m2 ratio = 15/45 = 1/3 of 9000 = 3000
  assert(res.membersSummary['m1'].sharedExpenseCost.equals(6000), `m1 share should be 6000, got ${res.membersSummary['m1'].sharedExpenseCost}`);
  assert(res.membersSummary['m2'].sharedExpenseCost.equals(3000), `m2 share should be 3000, got ${res.membersSummary['m2'].sharedExpenseCost}`);
});

// 11. Mid-month member leaving
runTest('Scenario 11: Mid-month leaving handles proper days', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'Leaving Member', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 0, joiningDate: new Date('2026-11-01'), leavingDate: new Date('2026-11-10') },
    { memberId: 'm2', fullName: 'Staying Member', breakfast: 30, lunch: 30, dinner: 30, totalMeals: 90, isActive: true, openingBalance: 0, joiningDate: new Date('2026-11-01') },
  ];
  const additional: AdditionalExpenseData[] = [
    { id: 'a1', title: 'Internet', amount: 800, category: 'Internet', expenseType: 'SHARED', allocationMethod: 'PROPORTIONAL' },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: [],
    additionalExpenses: additional,
    deposits: [],
    daysInMonth: 30,
  });

  // m1 was 10 days, m2 was 30 days. Total = 40 days.
  // m1 = 10/40 * 800 = 200. m2 = 30/40 * 800 = 600.
  assert(res.membersSummary['m1'].sharedExpenseCost.equals(200), `m1 share should be 200, got ${res.membersSummary['m1'].sharedExpenseCost}`);
  assert(res.membersSummary['m2'].sharedExpenseCost.equals(600), `m2 share should be 600, got ${res.membersSummary['m2'].sharedExpenseCost}`);
});

// 12. Expense editing simulation
runTest('Scenario 12: Expense editing dynamically recalculates without residue', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'A', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 0 },
  ];
  const bazarOriginal: BazarExpenseData[] = [
    { id: 'b1', amount: 1500, category: 'Chicken', paymentSource: 'MESS_FUND' },
  ];
  const res1 = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazarOriginal,
    additionalExpenses: [],
    deposits: [],
  });
  assert(res1.mealRate.equals(50), 'Original rate 50');

  // Edit b1 amount to 1800
  const bazarEdited: BazarExpenseData[] = [
    { id: 'b1', amount: 1800, category: 'Chicken', paymentSource: 'MESS_FUND' },
  ];
  const res2 = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazarEdited,
    additionalExpenses: [],
    deposits: [],
  });
  assert(res2.mealRate.equals(60), 'Edited rate 60');
  assert(res2.membersSummary['m1'].mealCost.equals(1800), 'Edited meal cost 1800');
});

// 13. Monthly closing balance verification
runTest('Scenario 13: Monthly closing snapshot matches individual calculations', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'Shakil', breakfast: 20, lunch: 20, dinner: 20, totalMeals: 60, isActive: true, openingBalance: 500 },
    { memberId: 'm2', fullName: 'Tanvir', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: -300 },
  ];
  const bazar: BazarExpenseData[] = [
    { id: 'b1', amount: 4500, category: 'Meat', paymentSource: 'PERSONAL', payerMemberId: 'm1' },
  ];
  const deposits: DepositData[] = [
    { id: 'd1', memberId: 'm2', amount: 2000 },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazar,
    additionalExpenses: [],
    deposits,
  });

  // Total meals = 90. Rate = 4500 / 90 = 50.
  // m1: Opening 500 + Dep 0 + Personal 4500 - Cost (60 * 50 = 3000) = 2000 Advance.
  // m2: Opening -300 + Dep 2000 + Personal 0 - Cost (30 * 50 = 1500) = 200 Advance.
  assert(res.membersSummary['m1'].closingBalance.equals(2000), 'm1 closing balance should be 2000');
  assert(res.membersSummary['m2'].closingBalance.equals(200), 'm2 closing balance should be 200');
  assert(res.totalNetAdvances.equals(2200), 'Total advances should be 2200');
  assert(res.totalNetDues.equals(0), 'Total dues should be 0');
});

// 14. Month reopening simulation
runTest('Scenario 14: Month reopening leaves data state pristine for edits', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'Shakil', breakfast: 10, lunch: 10, dinner: 10, totalMeals: 30, isActive: true, openingBalance: 0 },
  ];
  // Calculate before reopen
  const resClosed = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: [{ id: 'b1', amount: 1500, category: 'Fish', paymentSource: 'MESS_FUND' }],
    additionalExpenses: [],
    deposits: [],
  });
  // Simulate reopen and add an omitted deposit of 500
  const resReopened = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: [{ id: 'b1', amount: 1500, category: 'Fish', paymentSource: 'MESS_FUND' }],
    additionalExpenses: [],
    deposits: [{ id: 'd_late', memberId: 'm1', amount: 500 }],
  });

  assert(resClosed.membersSummary['m1'].closingBalance.equals(-1500), 'Closed balance was -1500');
  assert(resReopened.membersSummary['m1'].closingBalance.equals(-1000), 'Reopened balance updated to -1000');
});

// 15. Decimal meal rates and rounding accuracy
runTest('Scenario 15: Decimal-safe precision without IEEE 754 floating point artifacts', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'A', breakfast: 7, lunch: 7, dinner: 7, totalMeals: 21, isActive: true, openingBalance: 0 },
    { memberId: 'm2', fullName: 'B', breakfast: 7, lunch: 7, dinner: 7, totalMeals: 21, isActive: true, openingBalance: 0 },
    { memberId: 'm3', fullName: 'C', breakfast: 7, lunch: 7, dinner: 7, totalMeals: 21, isActive: true, openingBalance: 0 },
  ];
  // Total meals = 63. Bazar expense = 4000. Rate = 4000 / 63 = 63.492063... -> rounded to 63.4921
  const bazar: BazarExpenseData[] = [
    { id: 'b1', amount: 4000, category: 'Grocery', paymentSource: 'MESS_FUND' },
  ];
  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazar,
    additionalExpenses: [],
    deposits: [],
  });

  assert(res.mealRate.equals(63.4921), `Meal rate should be 63.4921, got ${res.mealRate}`);
  // Each member cost = 21 * 63.4921 = 1333.3341 -> rounded to 1333.33
  assert(res.membersSummary['m1'].mealCost.equals(1333.33), `Member cost should be 1333.33, got ${res.membersSummary['m1'].mealCost}`);
  assert(res.membersSummary['m2'].mealCost.equals(1333.33), 'Member 2 cost should be 1333.33');
  assert(res.membersSummary['m3'].mealCost.equals(1333.33), 'Member 3 cost should be 1333.33');
});

// 16. Available mess fund balance verification from financial ledger
runTest('Scenario 16: Available mess fund calculation equals deposits minus fund expenditures', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'A', breakfast: 5, lunch: 5, dinner: 5, totalMeals: 15, isActive: true, openingBalance: 0 },
    { memberId: 'm2', fullName: 'B', breakfast: 5, lunch: 5, dinner: 5, totalMeals: 15, isActive: true, openingBalance: 0 },
  ];
  const deposits = [
    { id: 'd1', memberId: 'm1', amount: 5000 },
    { id: 'd2', memberId: 'm2', amount: 5000 },
  ]; // Total deposits = 10,000
  const bazar = [
    { id: 'b1', amount: 4000, category: 'Rice', paymentSource: 'MESS_FUND' },
    { id: 'b2', amount: 1500, category: 'Fish', paymentSource: 'PERSONAL', payerMemberId: 'm1' }, // Personal, does NOT reduce mess fund!
  ];
  const additional = [
    { id: 'a1', title: 'Wifi', amount: 1000, category: 'Internet', expenseType: 'SHARED', paymentSource: 'MESS_FUND' },
  ];

  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazar,
    additionalExpenses: additional,
    deposits,
  });

  // Total deposits = 10,000
  // Mess fund payments = 4,000 (bazar) + 1,000 (wifi) = 5,000
  // Available mess fund = 10,000 - 5,000 = 5,000
  assert(res.totalDeposits.equals(10000), 'Total deposits should be 10000');
  assert(res.totalMessFundPayments.equals(5000), `Mess fund payments should be 5000, got ${res.totalMessFundPayments}`);
  assert(res.availableMessFund.equals(5000), `Available mess fund should be 5000, got ${res.availableMessFund}`);
});

// 17. Penny-safe additional expense distribution preserves exact total without rounding loss
runTest('Scenario 17: Penny-safe equal additional expense distribution sums to exact expense total', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'A', breakfast: 1, lunch: 1, dinner: 1, totalMeals: 3, isActive: true, openingBalance: 0 },
    { memberId: 'm2', fullName: 'B', breakfast: 1, lunch: 1, dinner: 1, totalMeals: 3, isActive: true, openingBalance: 0 },
    { memberId: 'm3', fullName: 'C', breakfast: 1, lunch: 1, dinner: 1, totalMeals: 3, isActive: true, openingBalance: 0 },
  ];
  // 100 / 3 = 33.333333333333336
  const additional = [
    { id: 'a1', title: 'Maid', amount: 100, category: 'Salary', expenseType: 'SHARED' },
  ];

  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: [],
    additionalExpenses: additional,
    deposits: [],
  });

  const sumAllocated = res.membersSummary['m1'].sharedExpenseCost
    .plus(res.membersSummary['m2'].sharedExpenseCost)
    .plus(res.membersSummary['m3'].sharedExpenseCost);

  assert(sumAllocated.equals(100), `Total allocated (${sumAllocated}) must equal exactly 100`);
});

// 18. Initial opening balances properly update available mess fund and total deposits
runTest('Scenario 18: Member initial opening balances are incorporated into mess fund and total deposits', () => {
  const members: MemberMealData[] = [
    { memberId: 'm1', fullName: 'A', breakfast: 1, lunch: 1, dinner: 1, totalMeals: 3, isActive: true, openingBalance: 1500 },
    { memberId: 'm2', fullName: 'B', breakfast: 1, lunch: 1, dinner: 1, totalMeals: 3, isActive: true, openingBalance: -500 },
  ];
  const deposits = [
    { id: 'd1', memberId: 'm1', amount: 3000 },
  ];
  const bazar = [
    { id: 'b1', amount: 2000, category: 'Food', paymentSource: 'MESS_FUND' as const },
  ];

  const res = MessAccountingEngine.calculateMonthlyAccounts({
    members,
    bazarExpenses: bazar,
    additionalExpenses: [],
    deposits,
  });

  // Net Opening Balance = 1500 - 500 = 1000
  // Opening Advances = 1500, Opening Dues = 500
  // Total Member Deposits = 3000 + 1500 = 4500
  // Available Mess Fund = Opening Balance (1000) + Deposits (3000) - Spent (2000) = 2000
  assert(res.totalOpeningBalance.equals(1000), `Total opening balance should be 1000, got ${res.totalOpeningBalance}`);
  assert(res.totalOpeningAdvances.equals(1500), `Total opening advances should be 1500, got ${res.totalOpeningAdvances}`);
  assert(res.totalOpeningDues.equals(500), `Total opening dues should be 500, got ${res.totalOpeningDues}`);
  assert(res.totalMemberDeposits.equals(4500), `Total member deposits should be 4500, got ${res.totalMemberDeposits}`);
  assert(res.availableMessFund.equals(2000), `Available mess fund should be 2000, got ${res.availableMessFund}`);
});

console.log('\n======================================================');
console.log(' ALL 18 ACCOUNTING ENGINE TESTS PASSED SUCCESSFULLY! ');
console.log('======================================================\n');
