import Decimal from 'decimal.js';

// Configure Decimal precision and rounding
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface MemberMealData {
  memberId: string;
  fullName: string;
  breakfast: number | string | Decimal;
  lunch: number | string | Decimal;
  dinner: number | string | Decimal;
  totalMeals: number | string | Decimal;
  joiningDate?: Date;
  leavingDate?: Date | null;
  isActive: boolean;
  openingBalance: number | string | Decimal;
}

export interface BazarExpenseData {
  id: string;
  amount: number | string | Decimal;
  category: string;
  paymentSource: 'PERSONAL' | 'MESS_FUND' | string;
  payerMemberId?: string | null;
  date?: Date;
}

export interface AdditionalExpenseData {
  id: string;
  title: string;
  amount: number | string | Decimal;
  category: string;
  expenseType: 'SHARED' | 'INDIVIDUAL' | string;
  allocationMethod?: 'EQUAL' | 'CUSTOM' | 'PROPORTIONAL' | string | null;
  targetMemberId?: string | null; // For INDIVIDUAL
  paymentSource?: 'PERSONAL' | 'MESS_FUND' | string;
  payerMemberId?: string | null;
  sharedAllocations?: Array<{
    memberId: string;
    amount: number | string | Decimal;
  }>;
}

export interface DepositData {
  id: string;
  memberId: string;
  amount: number | string | Decimal;
  depositDate?: Date;
}

export interface MemberAccountingSummary {
  memberId: string;
  fullName: string;
  openingBalance: Decimal;
  totalMeals: Decimal;
  mealCost: Decimal;
  sharedExpenseCost: Decimal;
  individualExpenseCost: Decimal;
  totalCost: Decimal;
  deposits: Decimal;
  personalPayments: Decimal;
  closingBalance: Decimal;
  isAdvance: boolean;
  isDue: boolean;
  advanceAmount: Decimal;
  dueAmount: Decimal;
}

export interface MonthlyAccountingResult {
  totalMeals: Decimal;
  totalBazarExpense: Decimal;
  mealRate: Decimal;
  isMealRateAvailable: boolean;
  totalDeposits: Decimal;
  totalOpeningBalance: Decimal;
  totalOpeningAdvances: Decimal;
  totalOpeningDues: Decimal;
  totalMemberDeposits: Decimal;
  totalSharedExpenses: Decimal;
  totalIndividualExpenses: Decimal;
  totalAdditionalExpenses: Decimal;
  totalExpenses: Decimal;
  totalPersonalPayments: Decimal;
  totalMessFundPayments: Decimal;
  availableMessFund: Decimal;
  totalNetAdvances: Decimal;
  totalNetDues: Decimal;
  membersSummary: Record<string, MemberAccountingSummary>;
  memberList: MemberAccountingSummary[];
}

export class MessAccountingEngine {
  /**
   * Safe decimal conversion helper
   */
  public static toDecimal(val: number | string | Decimal | undefined | null): Decimal {
    if (val === undefined || val === null || val === '') {
      return new Decimal(0);
    }
    if (val instanceof Decimal) return val;
    try {
      return new Decimal(val);
    } catch {
      return new Decimal(0);
    }
  }

  /**
   * Round to 2 decimal places (currency)
   */
  public static roundCurrency(val: Decimal): Decimal {
    return val.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Round meal rate to 4 decimal places
   */
  public static roundRate(val: Decimal): Decimal {
    return val.toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  }

  /**
   * Core Accounting Engine Calculation
   * Pure, deterministic, decimal-safe
   */
  public static calculateMonthlyAccounts(params: {
    members: MemberMealData[];
    bazarExpenses: BazarExpenseData[];
    additionalExpenses: AdditionalExpenseData[];
    deposits: DepositData[];
    daysInMonth?: number;
  }): MonthlyAccountingResult {
    const { members, bazarExpenses, additionalExpenses, deposits, daysInMonth = 30 } = params;

    // 1. Calculate Total Meals
    let totalMeals = new Decimal(0);
    const memberMealsMap: Record<string, Decimal> = {};

    for (const m of members) {
      const b = this.toDecimal(m.breakfast);
      const l = this.toDecimal(m.lunch);
      const d = this.toDecimal(m.dinner);
      const memberTotal = b.plus(l).plus(d);
      memberMealsMap[m.memberId] = memberTotal;
      totalMeals = totalMeals.plus(memberTotal);
    }

    // 2. Calculate Total Bazar Expense & Personal Payments
    let totalBazarExpense = new Decimal(0);
    let totalPersonalPayments = new Decimal(0);
    let totalMessFundPayments = new Decimal(0);
    const memberPersonalPaymentsMap: Record<string, Decimal> = {};

    for (const exp of bazarExpenses) {
      const amt = this.toDecimal(exp.amount);
      totalBazarExpense = totalBazarExpense.plus(amt);

      if (exp.paymentSource === 'PERSONAL' && exp.payerMemberId) {
        totalPersonalPayments = totalPersonalPayments.plus(amt);
        const curr = memberPersonalPaymentsMap[exp.payerMemberId] || new Decimal(0);
        memberPersonalPaymentsMap[exp.payerMemberId] = curr.plus(amt);
      } else {
        totalMessFundPayments = totalMessFundPayments.plus(amt);
      }
    }

    // 3. Traditional Meal Rate: Total Bazar Expense / Total Meals
    let mealRate = new Decimal(0);
    let isMealRateAvailable = false;

    if (totalMeals.greaterThan(0)) {
      mealRate = this.roundRate(totalBazarExpense.dividedBy(totalMeals));
      isMealRateAvailable = true;
    }

    // 4. Calculate Deposits per Member
    let totalDeposits = new Decimal(0);
    const memberDepositsMap: Record<string, Decimal> = {};

    for (const dep of deposits) {
      const amt = this.toDecimal(dep.amount);
      totalDeposits = totalDeposits.plus(amt);
      const curr = memberDepositsMap[dep.memberId] || new Decimal(0);
      memberDepositsMap[dep.memberId] = curr.plus(amt);
    }

    // 5. Calculate Additional Expenses (Shared vs Individual)
    let totalSharedExpenses = new Decimal(0);
    let totalIndividualExpenses = new Decimal(0);
    const memberSharedCostMap: Record<string, Decimal> = {};
    const memberIndividualCostMap: Record<string, Decimal> = {};

    // Initialize maps
    for (const m of members) {
      memberSharedCostMap[m.memberId] = new Decimal(0);
      memberIndividualCostMap[m.memberId] = new Decimal(0);
    }

    for (const exp of additionalExpenses) {
      const amt = this.toDecimal(exp.amount);

      // Track payment source for Mess Fund balance
      if (exp.paymentSource === 'PERSONAL' && exp.payerMemberId) {
        totalPersonalPayments = totalPersonalPayments.plus(amt);
        const curr = memberPersonalPaymentsMap[exp.payerMemberId] || new Decimal(0);
        memberPersonalPaymentsMap[exp.payerMemberId] = curr.plus(amt);
      } else {
        totalMessFundPayments = totalMessFundPayments.plus(amt);
      }

      if (exp.expenseType === 'INDIVIDUAL') {
        totalIndividualExpenses = totalIndividualExpenses.plus(amt);
        if (exp.targetMemberId && memberIndividualCostMap[exp.targetMemberId]) {
          memberIndividualCostMap[exp.targetMemberId] =
            memberIndividualCostMap[exp.targetMemberId].plus(amt);
        }
      } else {
        // SHARED Expense
        totalSharedExpenses = totalSharedExpenses.plus(amt);

        if (exp.sharedAllocations && exp.sharedAllocations.length > 0) {
          // Custom allocations defined
          for (const alloc of exp.sharedAllocations) {
            const allocAmt = this.toDecimal(alloc.amount);
            if (memberSharedCostMap[alloc.memberId]) {
              memberSharedCostMap[alloc.memberId] =
                memberSharedCostMap[alloc.memberId].plus(allocAmt);
            }
          }
        } else if (exp.allocationMethod === 'PROPORTIONAL') {
          // Proportional based on active days in the month (e.g. for mid-month joiners/leavers)
          let totalActiveDays = 0;
          const memberDays: Record<string, number> = {};

          for (const m of members) {
            let days = daysInMonth;
            if (m.joiningDate) {
              const startDay = new Date(m.joiningDate).getDate();
              // If joined this month after 1st
              days = Math.max(1, daysInMonth - startDay + 1);
            }
            if (m.leavingDate) {
              const leaveDay = new Date(m.leavingDate).getDate();
              days = Math.min(days, leaveDay);
            }
            memberDays[m.memberId] = days;
            totalActiveDays += days;
          }

          if (totalActiveDays > 0) {
            for (const m of members) {
              const days = memberDays[m.memberId] || daysInMonth;
              const ratio = new Decimal(days).dividedBy(new Decimal(totalActiveDays));
              const share = this.roundCurrency(amt.times(ratio));
              memberSharedCostMap[m.memberId] = memberSharedCostMap[m.memberId].plus(share);
            }
          } else {
            // Equal fallback
            const count = members.length;
            if (count > 0) {
              const perHead = this.roundCurrency(amt.dividedBy(count));
              for (const m of members) {
                memberSharedCostMap[m.memberId] = memberSharedCostMap[m.memberId].plus(perHead);
              }
            }
          }
        } else {
          // Default: EQUAL distribution among all active members
          const activeMembers = members.filter((m) => m.isActive);
          const eligibleMembers = activeMembers.length > 0 ? activeMembers : members;
          const count = eligibleMembers.length;
          if (count > 0) {
            const totalCents = amt.times(100).round();
            const baseCents = totalCents.dividedToIntegerBy(count);
            let remainderCents = totalCents.minus(baseCents.times(count)).toNumber();

            for (const m of eligibleMembers) {
              let memberCents = baseCents;
              if (remainderCents > 0) {
                memberCents = memberCents.plus(1);
                remainderCents--;
              }
              const memberShare = memberCents.dividedBy(100);
              memberSharedCostMap[m.memberId] = memberSharedCostMap[m.memberId].plus(memberShare);
            }
          }
        }
      }
    }

    // 6. Build Individual Member Summaries
    const membersSummary: Record<string, MemberAccountingSummary> = {};
    const memberList: MemberAccountingSummary[] = [];

    let totalNetAdvances = new Decimal(0);
    let totalNetDues = new Decimal(0);
    let totalOpeningBalance = new Decimal(0);
    let totalOpeningAdvances = new Decimal(0);
    let totalOpeningDues = new Decimal(0);

    for (const m of members) {
      const openingBal = this.toDecimal(m.openingBalance);
      totalOpeningBalance = totalOpeningBalance.plus(openingBal);
      if (openingBal.greaterThan(0)) {
        totalOpeningAdvances = totalOpeningAdvances.plus(openingBal);
      } else if (openingBal.isNegative()) {
        totalOpeningDues = totalOpeningDues.plus(openingBal.abs());
      }

      const mMeals = memberMealsMap[m.memberId] || new Decimal(0);
      const mMealCost = this.roundCurrency(mMeals.times(mealRate));
      const mSharedCost = this.roundCurrency(memberSharedCostMap[m.memberId] || new Decimal(0));
      const mIndivCost = this.roundCurrency(memberIndividualCostMap[m.memberId] || new Decimal(0));
      const mTotalCost = mMealCost.plus(mSharedCost).plus(mIndivCost);

      const mDeposits = this.toDecimal(memberDepositsMap[m.memberId]);
      const mPersonalPayments = this.toDecimal(memberPersonalPaymentsMap[m.memberId]);

      // Final Balance Formula:
      // Final Balance = Opening Balance + Deposits + Personal Payments - Individual Final Cost
      const closingBalance = this.roundCurrency(
        openingBal.plus(mDeposits).plus(mPersonalPayments).minus(mTotalCost)
      );

      const isAdvance = closingBalance.greaterThanOrEqualTo(0);
      const isDue = closingBalance.isNegative();
      const advanceAmount = isAdvance ? closingBalance : new Decimal(0);
      const dueAmount = isDue ? closingBalance.abs() : new Decimal(0);

      if (isAdvance) {
        totalNetAdvances = totalNetAdvances.plus(advanceAmount);
      } else {
        totalNetDues = totalNetDues.plus(dueAmount);
      }

      const summary: MemberAccountingSummary = {
        memberId: m.memberId,
        fullName: m.fullName,
        openingBalance: openingBal,
        totalMeals: mMeals,
        mealCost: mMealCost,
        sharedExpenseCost: mSharedCost,
        individualExpenseCost: mIndivCost,
        totalCost: mTotalCost,
        deposits: mDeposits,
        personalPayments: mPersonalPayments,
        closingBalance,
        isAdvance,
        isDue,
        advanceAmount,
        dueAmount,
      };

      membersSummary[m.memberId] = summary;
      memberList.push(summary);
    }

    const totalAdditionalExpenses = totalSharedExpenses.plus(totalIndividualExpenses);
    const totalMemberDeposits = this.roundCurrency(totalDeposits.plus(totalOpeningAdvances));
    const totalExpenses = this.roundCurrency(totalBazarExpense.plus(totalAdditionalExpenses).plus(totalOpeningDues));

    // Available Mess Fund = Total Opening Balances + Total Deposits - Total Mess Fund Expenditures
    const availableMessFund = this.roundCurrency(
      totalOpeningBalance.plus(totalDeposits).minus(totalMessFundPayments)
    );

    return {
      totalMeals,
      totalBazarExpense: this.roundCurrency(totalBazarExpense),
      mealRate,
      isMealRateAvailable,
      totalDeposits: this.roundCurrency(totalDeposits),
      totalOpeningBalance: this.roundCurrency(totalOpeningBalance),
      totalOpeningAdvances: this.roundCurrency(totalOpeningAdvances),
      totalOpeningDues: this.roundCurrency(totalOpeningDues),
      totalMemberDeposits,
      totalSharedExpenses: this.roundCurrency(totalSharedExpenses),
      totalIndividualExpenses: this.roundCurrency(totalIndividualExpenses),
      totalAdditionalExpenses: this.roundCurrency(totalAdditionalExpenses),
      totalExpenses,
      totalPersonalPayments: this.roundCurrency(totalPersonalPayments),
      totalMessFundPayments: this.roundCurrency(totalMessFundPayments),
      availableMessFund,
      totalNetAdvances: this.roundCurrency(totalNetAdvances),
      totalNetDues: this.roundCurrency(totalNetDues),
      membersSummary,
      memberList,
    };
  }

  /**
   * Helper to build chronological member ledger items
   */
  public static generateLedgerEntries(params: {
    openingBalance: Decimal;
    deposits: Array<{ id: string; date: Date; amount: Decimal; notes?: string; method: string }>;
    personalBazar: Array<{ id: string; date: Date; amount: Decimal; title: string }>;
    mealCosts: { date: Date; totalMeals: Decimal; mealRate: Decimal; cost: Decimal };
    sharedExpenses: Array<{ id: string; date: Date; amount: Decimal; title: string }>;
    individualExpenses: Array<{ id: string; date: Date; amount: Decimal; title: string }>;
  }) {
    type LedgerRow = {
      date: Date;
      type: string;
      description: string;
      debit: Decimal;
      credit: Decimal;
      balance: Decimal;
    };

    const rows: LedgerRow[] = [];
    let runningBalance = params.openingBalance;

    // 1. Opening Balance
    rows.push({
      date: new Date(0), // earliest
      type: 'OPENING_BALANCE',
      description: 'Opening Balance from previous month',
      debit: runningBalance.isNegative() ? runningBalance.abs() : new Decimal(0),
      credit: runningBalance.greaterThanOrEqualTo(0) ? runningBalance : new Decimal(0),
      balance: runningBalance,
    });

    // 2. Deposits (Credit +)
    for (const dep of params.deposits) {
      runningBalance = runningBalance.plus(dep.amount);
      rows.push({
        date: dep.date,
        type: 'DEPOSIT',
        description: `Deposit via ${dep.method}${dep.notes ? ` (${dep.notes})` : ''}`,
        debit: new Decimal(0),
        credit: dep.amount,
        balance: runningBalance,
      });
    }

    // 3. Personal Payments for Mess (Credit +)
    for (const baz of params.personalBazar) {
      runningBalance = runningBalance.plus(baz.amount);
      rows.push({
        date: baz.date,
        type: 'BAZAR_PAYMENT',
        description: `Bazar payment for mess: ${baz.title}`,
        debit: new Decimal(0),
        credit: baz.amount,
        balance: runningBalance,
      });
    }

    // 4. Meal Cost (Debit -)
    if (params.mealCosts.totalMeals.greaterThan(0)) {
      runningBalance = runningBalance.minus(params.mealCosts.cost);
      rows.push({
        date: params.mealCosts.date,
        type: 'MEAL_COST',
        description: `Monthly Meal Cost (${params.mealCosts.totalMeals.toString()} meals @ ${params.mealCosts.mealRate.toString()} ৳)`,
        debit: params.mealCosts.cost,
        credit: new Decimal(0),
        balance: runningBalance,
      });
    }

    // 5. Shared Expenses (Debit -)
    for (const sh of params.sharedExpenses) {
      runningBalance = runningBalance.minus(sh.amount);
      rows.push({
        date: sh.date,
        type: 'SHARED_EXPENSE',
        description: `Shared mess expense: ${sh.title}`,
        debit: sh.amount,
        credit: new Decimal(0),
        balance: runningBalance,
      });
    }

    // 6. Individual Expenses (Debit -)
    for (const ind of params.individualExpenses) {
      runningBalance = runningBalance.minus(ind.amount);
      rows.push({
        date: ind.date,
        type: 'INDIVIDUAL_EXPENSE',
        description: `Individual expense: ${ind.title}`,
        debit: ind.amount,
        credit: new Decimal(0),
        balance: runningBalance,
      });
    }

    return rows;
  }
}
