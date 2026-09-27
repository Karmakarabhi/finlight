// @ts-ignore
import { describe, expect, it } from 'bun:test';
import {
  calculateGrossWealth,
  calculateNetWorth,
  calculateEmergencyRunway,
  calculateEmergencyReserveTarget,
  calculateDecisionAvailableCash,
  calculateMonthlyObligations,
  calculateMonthlySurplus,
  calculateAllocationDrift,
  evaluateTripartiteRisk,
} from '../metrics';
import {
  buildHouseholdState,
  createScenarioSnapshot,
  ENGINE_VERSION,
  TAX_RULE_VERSION,
} from '../state-builder';
import {
  RawHouseholdData,
  FamilyMember,
  CashAccount,
  Liability,
  Holding,
  LifeGoal,
  TaxLot,
} from '../types';

describe('Finlight V1 Domain Engine: Metrics', () => {
  describe('calculateGrossWealth', () => {
    it('sums liquid, invested, and fixed wealth correctly', () => {
      const gross = calculateGrossWealth(500000, 2000000, 1000000);
      expect(gross).toBe(3500000);
    });

    it('handles zero and missing inputs gracefully', () => {
      expect(calculateGrossWealth(0, 0, 0)).toBe(0);
      expect(calculateGrossWealth(100, NaN as unknown as number, undefined as unknown as number)).toBe(100);
    });
  });

  describe('calculateNetWorth', () => {
    it('calculates net worth as gross wealth minus total liabilities', () => {
      expect(calculateNetWorth(3500000, 1500000)).toBe(2000000);
    });

    it('supports negative net worth if liabilities exceed wealth', () => {
      expect(calculateNetWorth(500000, 1200000)).toBe(-700000);
    });
  });

  describe('calculateEmergencyRunway', () => {
    it('computes runway in months correctly', () => {
      expect(calculateEmergencyRunway(600000, 100000)).toBe(6);
      expect(calculateEmergencyRunway(250000, 100000)).toBe(2.5);
    });

    it('returns Infinity when obligations are 0 and liquid cash is positive', () => {
      expect(calculateEmergencyRunway(500000, 0)).toBe(Number.POSITIVE_INFINITY);
    });

    it('returns 0 when liquid cash is 0', () => {
      expect(calculateEmergencyRunway(0, 50000)).toBe(0);
      expect(calculateEmergencyRunway(-100, 50000)).toBe(0);
    });
  });

  describe('calculateEmergencyReserveTarget', () => {
    it('calculates default target as obligations * base months', () => {
      expect(calculateEmergencyReserveTarget(100000, 6)).toBe(600000);
    });

    it('applies numeric additive adjustment factors', () => {
      expect(calculateEmergencyReserveTarget(100000, 6, 2)).toBe(800000);
    });

    it('applies structured adjustment factors and multiplier', () => {
      const target = calculateEmergencyReserveTarget(100000, 6, {
        variableIncomeMonths: 2,
        dependentsMonths: 1,
        multiplier: 1.1,
      });
      // (6 + 2 + 1) * 1.1 = 9.9 months -> 100,000 * 9.9 = 990,000
      expect(target).toBe(990000);
    });
  });

  describe('calculateDecisionAvailableCash', () => {
    it('calculates available cash after protecting reserve and near-term obligations', () => {
      expect(calculateDecisionAvailableCash(1000000, 600000, 100000)).toBe(300000);
    });

    it('reflects deficit when liquid cash is lower than protected reserve', () => {
      expect(calculateDecisionAvailableCash(400000, 600000, 50000)).toBe(-250000);
    });
  });

  describe('calculateMonthlyObligations & calculateMonthlySurplus', () => {
    it('calculates monthly obligations and surplus accurately', () => {
      const obligations = calculateMonthlyObligations(60000, 40000);
      expect(obligations).toBe(100000);

      const surplus = calculateMonthlySurplus(200000, 60000, 40000, 30000);
      expect(surplus).toBe(70000);
    });
  });

  describe('calculateAllocationDrift', () => {
    it('correctly calculates actual percentage, drift, and deficit across categories', () => {
      const holdings: Holding[] = [
        {
          id: 'h1',
          ownerMemberId: 'm1',
          assetType: 'MF',
          name: 'Nifty 50 Index',
          identifier: '120503',
          totalUnits: 1000,
          currentPrice: 500,
          currentValue: 500000,
          category: 'equity',
        },
        {
          id: 'h2',
          ownerMemberId: 'm1',
          assetType: 'FD',
          name: 'HDFC Bank FD',
          identifier: 'FD123',
          totalUnits: 1,
          currentPrice: 300000,
          currentValue: 300000,
          category: 'debt',
        },
        {
          id: 'h3',
          ownerMemberId: 'm1',
          assetType: 'ETF',
          name: 'Nippon Gold ETF',
          identifier: 'GOLDBEES',
          totalUnits: 1000,
          currentPrice: 100,
          currentValue: 100000,
          category: 'gold',
        },
      ];

      const cashAccounts: CashAccount[] = [
        {
          id: 'c1',
          ownerMemberId: 'm1',
          institution: 'HDFC Bank',
          accountName: 'Savings Account',
          accountType: 'savings',
          currentBalance: 100000,
        },
      ];

      // Total portfolio wealth: 5L + 3L + 1L + 1L = 10L
      // Target: 60% equity, 20% debt, 10% gold, 10% cash
      const drift = calculateAllocationDrift(holdings, cashAccounts, {
        equityPct: 60,
        debtPct: 20,
        goldPct: 10,
        cashPct: 10,
      });

      expect(drift.equity.actualPct).toBe(50);
      expect(drift.equity.targetPct).toBe(60);
      expect(drift.equity.driftPct).toBe(-10);
      expect(drift.equity.deficitRupees).toBe(100000); // Needs 1L to reach target

      expect(drift.debt.actualPct).toBe(30);
      expect(drift.debt.targetPct).toBe(20);
      expect(drift.debt.driftPct).toBe(10);
      expect(drift.debt.deficitRupees).toBe(-100000); // 1L overweight

      expect(drift.gold.actualPct).toBe(10);
      expect(drift.gold.targetPct).toBe(10);
      expect(drift.gold.driftPct).toBe(0);
      expect(drift.gold.deficitRupees).toBe(0);

      expect(drift.cash.actualPct).toBe(10);
      expect(drift.cash.targetPct).toBe(10);
      expect(drift.cash.driftPct).toBe(0);
    });

    it('splits hybrid funds 65% equity and 35% debt when no hybrid target exists', () => {
      const holdings: Holding[] = [
        {
          id: 'h_hybrid',
          ownerMemberId: 'm1',
          assetType: 'MF',
          name: 'HDFC Balanced Advantage',
          identifier: '118989',
          totalUnits: 1000,
          currentPrice: 100,
          currentValue: 100000,
          category: 'hybrid',
        },
      ];

      const drift = calculateAllocationDrift(holdings, [], {
        equityPct: 65,
        debtPct: 35,
        goldPct: 0,
        cashPct: 0,
      });

      expect(drift.equity.actualPct).toBe(65);
      expect(drift.debt.actualPct).toBe(35);
    });
  });

  describe('evaluateTripartiteRisk', () => {
    it('computes High risk capacity for high runway, strong surplus, low debt, few dependents', () => {
      const profile = evaluateTripartiteRisk(
        200000, // inflow
        80000, // surplus (40% savings rate)
        12.0, // runway (12 months)
        [], // zero debt
        0, // 0 dependents
        [],
        'Aggressive'
      );

      expect(profile.riskCapacity.level).toBe('High');
      expect(profile.riskTolerance.level).toBe('Aggressive');
      expect(profile.riskCapacity.rationale.length).toBeGreaterThanOrEqual(4);
    });

    it('computes Low risk capacity when runway is critical and cash flow is negative', () => {
      const profile = evaluateTripartiteRisk(
        100000,
        -10000, // deficit
        1.5, // 1.5 months runway
        500000, // high debt
        3, // 3 dependents
        [],
        'Conservative'
      );

      expect(profile.riskCapacity.level).toBe('Low');
      expect(profile.riskTolerance.level).toBe('Conservative');
    });

    it('calculates required rate of return for life goals based on current corpus', () => {
      const currentYear = new Date().getFullYear();
      const goals: LifeGoal[] = [
        {
          id: 'g1',
          familyId: 'fam1',
          name: "Child's Higher Education",
          priority: 'P1',
          targetAmount: 2000000, // 20L
          targetYear: currentYear + 5, // 5 years
          linkedHoldingIds: ['h1'],
        },
      ];

      // If current invested corpus is 10L and target is 20L over 5 years
      // (20/10)^(1/5) - 1 = 14.87%
      const profile = evaluateTripartiteRisk(
        200000,
        50000,
        6.0,
        [],
        1,
        goals,
        'Moderate',
        1000000
      );

      expect(profile.riskRequirement.requiredReturnPct).toBeCloseTo(14.9, 0);
      expect(profile.riskRequirement.rationale).toContain('20.0L');
    });

    it('defaults required return to 6.0% when no active goals exist', () => {
      const profile = evaluateTripartiteRisk(100000, 20000, 6.0, [], 0, [], 'Moderate');
      expect(profile.riskRequirement.requiredReturnPct).toBe(6.0);
    });
  });
});

describe('Finlight V1 Domain Engine: State Builder', () => {
  it('builds canonical HouseholdFinancialState snapshot with all derived fields', () => {
    const currentYear = new Date().getFullYear();

    const members: FamilyMember[] = [
      {
        id: 'm1',
        familyId: 'karmakar-fam',
        name: 'Abhijit Karmakar',
        relation: 'Self',
        age: 34,
        employmentStatus: 'employed',
        monthlyIncome: 250000,
        incomeType: 'stable',
        riskTolerance: 'Moderate',
        investmentExperience: 'intermediate',
      },
      {
        id: 'm2',
        familyId: 'karmakar-fam',
        name: 'Spouse Karmakar',
        relation: 'Spouse',
        age: 32,
        employmentStatus: 'employed',
        monthlyIncome: 150000,
        incomeType: 'stable',
        riskTolerance: 'Conservative',
        investmentExperience: 'beginner',
      },
    ];

    const cashAccounts: CashAccount[] = [
      {
        id: 'c1',
        ownerMemberId: 'm1',
        institution: 'HDFC Bank',
        accountName: 'Salary Savings',
        accountType: 'savings',
        currentBalance: 300000,
      },
      {
        id: 'c2',
        ownerMemberId: 'm2',
        institution: 'ICICI Bank',
        accountName: 'Auto Sweep Deposit',
        accountType: 'auto_sweep',
        currentBalance: 500000,
      },
    ];

    const liabilities: Liability[] = [
      {
        id: 'l1',
        ownerMemberId: 'm1',
        name: 'Home Loan',
        type: 'home',
        outstandingBalance: 4000000,
        interestRatePct: 8.5,
        monthlyEmi: 45000,
      },
    ];

    const holdings: Holding[] = [
      {
        id: 'h1',
        ownerMemberId: 'm1',
        assetType: 'MF',
        name: 'Parag Parikh Flexi Cap Fund',
        identifier: '122639',
        totalUnits: 15000,
        currentPrice: 80,
        currentValue: 1200000,
        category: 'equity',
      },
      {
        id: 'h2',
        ownerMemberId: 'm1',
        assetType: 'Stock',
        name: 'Tata Consultancy Services Ltd',
        identifier: 'TCS',
        totalUnits: 100,
        currentPrice: 4000,
        currentValue: 400000,
        category: 'equity',
      },
      {
        id: 'h3',
        ownerMemberId: 'm1',
        assetType: 'FD',
        name: 'SBI 3-Year Fixed Deposit',
        identifier: 'FD-SBI-01',
        totalUnits: 1,
        currentPrice: 600000,
        currentValue: 600000,
        interestRatePct: 7.1,
        category: 'debt',
      },
      {
        id: 'h4',
        ownerMemberId: 'm2',
        assetType: 'ETF',
        name: 'Sovereign Gold Bond / Gold ETF',
        identifier: 'GOLDBEES',
        totalUnits: 400,
        currentPrice: 750,
        currentValue: 300000,
        category: 'gold',
      },
      {
        id: 'h5',
        ownerMemberId: 'm1',
        assetType: 'MF',
        name: 'Aditya Birla Sun Life Liquid Fund',
        identifier: '100033',
        totalUnits: 1000,
        currentPrice: 400,
        currentValue: 400000,
        category: 'cash', // liquid fund holding counts as liquid wealth
      },
    ];

    const taxLots: TaxLot[] = [
      {
        id: 'tl1',
        holdingId: 'h1',
        purchaseDate: '2023-01-15',
        units: 10000,
        buyPrice: 50,
        remainingUnits: 10000,
      },
      {
        id: 'tl2',
        holdingId: 'h1',
        purchaseDate: '2024-03-20',
        units: 5000,
        buyPrice: 65,
        remainingUnits: 5000,
      },
    ];

    const goals: LifeGoal[] = [
      {
        id: 'g1',
        familyId: 'karmakar-fam',
        name: 'Retirement Corpus Milestone',
        priority: 'P1',
        targetAmount: 10000000,
        targetYear: currentYear + 15,
        linkedHoldingIds: ['h1', 'h2'],
      },
    ];

    const rawData: RawHouseholdData = {
      profile: {
        familyId: 'karmakar-fam',
        monthlyEssentialExpenses: 80000,
        monthlyDiscretionaryExpenses: 40000,
        baseEmergencyMonths: 6,
        targetAllocation: {
          equityPct: 60,
          debtPct: 20,
          goldPct: 10,
          cashPct: 10,
        },
      },
      members,
      cashAccounts,
      liabilities,
      holdings,
      taxLots,
      goals,
    };

    const state = buildHouseholdState(rawData);

    // 1. Inflow & Cash Flow
    // Inflow = 250,000 + 150,000 = 400,000
    expect(state.monthlyInflow).toBe(400000);
    expect(state.monthlyEssentialExpenses).toBe(80000);
    // Debt servicing = 45,000 EMI
    expect(state.monthlyDebtServicing).toBe(45000);
    expect(state.monthlyDiscretionaryExpenses).toBe(40000);
    // Surplus = 400,000 - 80,000 - 45,000 - 40,000 = 235,000
    expect(state.monthlySurplus).toBe(235000);

    // 2. Wealth
    // Liquid Wealth = cashAccounts (3L + 5L) + cash holding h5 (4L) = 12,00,000
    expect(state.liquidWealth).toBe(1200000);
    // Fixed Wealth = FD h3 = 6,00,000
    expect(state.fixedWealth).toBe(600000);
    // Invested Wealth = h1 (12L) + h2 (4L) + h4 (3L) = 19,00,000
    expect(state.investedWealth).toBe(1900000);
    // Gross Wealth = 12L + 19L + 6L = 37,00,000
    expect(state.grossWealth).toBe(3700000);
    // Total Liabilities = 40,00,000
    expect(state.totalLiabilities).toBe(4000000);
    // Net Worth = 37,00,000 - 40,00,000 = -3,00,000
    expect(state.netWorth).toBe(-300000);

    // 3. Emergency & Runway
    // Monthly obligations = 80,000 + 45,000 = 1,25,000
    // Target = 1,25,000 * 6 = 7,50,000
    expect(state.emergencyReserveTarget).toBe(750000);
    // Runway = 12,00,000 / 1,25,000 = 9.6 months
    expect(state.emergencyRunwayMonths).toBe(9.6);
    // Gap = 12,00,000 - 7,50,000 = +4,50,000
    expect(state.emergencyReserveGap).toBe(450000);
    // Decision-Available Cash = 12,00,000 - 7,50,000 = 4,50,000
    expect(state.decisionAvailableCash).toBe(450000);

    // 4. Allocation Drift
    expect(state.allocationDrift).toBeDefined();
    expect(state.allocationDrift.equity).toBeDefined();
    expect(state.allocationDrift.debt).toBeDefined();
    expect(state.allocationDrift.gold).toBeDefined();
    expect(state.allocationDrift.cash).toBeDefined();

    // 5. Risk
    expect(state.risk.riskCapacity.level).toBeDefined();
    expect(state.risk.riskTolerance.level).toBe('Moderate'); // Primary member
    expect(state.risk.riskRequirement.requiredReturnPct).toBeGreaterThan(0);
  });

  it('createScenarioSnapshot generates immutable snapshot with correct engine versions', () => {
    const rawData: RawHouseholdData = {
      profile: {
        familyId: 'f1',
        monthlyEssentialExpenses: 50000,
        monthlyDiscretionaryExpenses: 20000,
        baseEmergencyMonths: 6,
        targetAllocation: { equityPct: 70, debtPct: 20, goldPct: 10, cashPct: 0 },
      },
      members: [],
      cashAccounts: [],
      liabilities: [],
      holdings: [],
    };

    const state = buildHouseholdState(rawData);
    const snapshot = createScenarioSnapshot(
      state,
      { amount: 500000, horizonDays: 30 },
      { requestedAmount: 500000 },
      { scenariosGenerated: 4 }
    );

    expect(snapshot.engineVersion).toBe(ENGINE_VERSION);
    expect(snapshot.taxRuleVersion).toBe(TAX_RULE_VERSION);
    expect(snapshot.householdState).toBe(state);
    expect(snapshot.requestParams.amount).toBe(500000);
    expect(snapshot.createdAt).toBeDefined();
  });
});
