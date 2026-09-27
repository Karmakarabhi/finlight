/**
 * Finlight V1: Decision Engine Comprehensive Unit Tests
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md
 */

// @ts-ignore
import { describe, it, expect } from 'bun:test';
import {
  buildHouseholdState,
  RawHouseholdData,
  HouseholdFinancialState,
} from '../../index';
import {
  evaluateWithdrawal,
  evaluateInvestment,
  WithdrawalRequest,
  InvestmentRequest,
} from '../index';

function createBaseState(): HouseholdFinancialState {
  const rawData: RawHouseholdData = {
    profile: {
      familyId: 'fam-karmakar-1',
      monthlyEssentialExpenses: 50000,
      monthlyDiscretionaryExpenses: 20000,
      baseEmergencyMonths: 6,
      targetAllocation: {
        equityPct: 50,
        debtPct: 40,
        goldPct: 10,
        cashPct: 0,
      },
    },
    members: [
      {
        id: 'member-1',
        familyId: 'fam-karmakar-1',
        name: 'Abhijit Karmakar',
        relation: 'Self',
        age: 36,
        employmentStatus: 'employed',
        monthlyIncome: 150000,
        incomeType: 'stable',
        riskTolerance: 'Moderate',
        investmentExperience: 'intermediate',
      },
      {
        id: 'member-2',
        familyId: 'fam-karmakar-1',
        name: 'Priyanka Karmakar',
        relation: 'Spouse',
        age: 34,
        employmentStatus: 'employed',
        monthlyIncome: 80000,
        incomeType: 'stable',
        riskTolerance: 'Conservative',
        investmentExperience: 'beginner',
      },
    ],
    cashAccounts: [
      {
        id: 'cash-1',
        ownerMemberId: 'member-1',
        institution: 'HDFC Bank',
        accountName: 'Salary Account',
        accountType: 'savings',
        currentBalance: 300000,
      },
      {
        id: 'cash-2',
        ownerMemberId: 'member-2',
        institution: 'ICICI Bank',
        accountName: 'Savings Account',
        accountType: 'auto_sweep',
        currentBalance: 200000,
      },
    ],
    liabilities: [
      {
        id: 'loan-home',
        ownerMemberId: 'member-1',
        name: 'Home Loan',
        type: 'home',
        outstandingBalance: 3500000,
        interestRatePct: 8.5,
        monthlyEmi: 40000,
      },
      {
        id: 'loan-cc',
        ownerMemberId: 'member-1',
        name: 'Credit Card Outstanding',
        type: 'credit',
        outstandingBalance: 150000,
        interestRatePct: 18.0,
        monthlyEmi: 10000,
      },
    ],
    holdings: [
      {
        id: 'holding-fd-1',
        ownerMemberId: 'member-1',
        assetType: 'FD',
        name: 'SBI Fixed Deposit',
        identifier: 'SBI-FD-8899',
        totalUnits: 1,
        currentPrice: 500000,
        currentValue: 500000,
        interestRatePct: 7.0,
        exitLoadPct: 1.0, // 1% pre-closure penalty
        category: 'debt',
      },
      {
        id: 'holding-mf-eq-1',
        ownerMemberId: 'member-1',
        assetType: 'MF',
        name: 'UTI Nifty 50 Index Fund',
        identifier: 'INF789K01123',
        totalUnits: 7000,
        currentPrice: 200,
        currentValue: 1400000,
        exitLoadPct: 1.0,
        exitLoadWindowDays: 365,
        category: 'equity',
      },
      {
        id: 'holding-mf-debt-1',
        ownerMemberId: 'member-2',
        assetType: 'MF',
        name: 'HDFC Short Term Debt Fund',
        identifier: 'INF179K01999',
        totalUnits: 3000,
        currentPrice: 100,
        currentValue: 300000,
        exitLoadPct: 0.5,
        exitLoadWindowDays: 90,
        category: 'debt',
      },
    ],
    taxLots: [
      {
        id: 'lot-eq-1',
        holdingId: 'holding-mf-eq-1',
        purchaseDate: new Date('2022-01-01'), // Long term (> 365 days)
        units: 3500,
        remainingUnits: 3500,
        buyPrice: 120, // Gain = 80/unit
      },
      {
        id: 'lot-eq-2',
        holdingId: 'holding-mf-eq-1',
        purchaseDate: new Date('2024-09-01'), // Short term (< 365 days)
        units: 3500,
        remainingUnits: 3500,
        buyPrice: 160, // Gain = 40/unit
      },
      {
        id: 'lot-debt-1',
        holdingId: 'holding-mf-debt-1',
        purchaseDate: new Date('2023-06-01'),
        units: 3000,
        remainingUnits: 3000,
        buyPrice: 95,
      },
      {
        id: 'lot-fd-1',
        holdingId: 'holding-fd-1',
        purchaseDate: new Date('2024-01-01'),
        units: 1,
        remainingUnits: 1,
        buyPrice: 460000, // 40,000 accrued interest
      },
    ],
    goals: [
      {
        id: 'goal-p1-edu',
        familyId: 'fam-karmakar-1',
        name: 'Child Higher Education',
        priority: 'P1',
        targetAmount: 2000000,
        targetYear: 2030,
        linkedHoldingIds: ['holding-mf-eq-1'],
      },
      {
        id: 'goal-p2-vacation',
        familyId: 'fam-karmakar-1',
        name: 'Europe Family Vacation',
        priority: 'P2',
        targetAmount: 400000,
        targetYear: 2027,
        linkedHoldingIds: [],
      },
    ],
  };

  return buildHouseholdState(rawData);
}

describe('Finlight V1 Decision Engines', () => {
  describe('Workflow 1: Withdrawal Engine (evaluateWithdrawal)', () => {
    it('generates all 4 neutral withdrawal scenarios with exact friction and runway calculation', () => {
      const state = createBaseState();
      // Monthly obligations = 50k (essential) + 40k (home loan) + 10k (credit card) = 1,00,000
      // Liquid cash before = 3L + 2L = 5,00,000 -> Runway before = 5.0 months
      expect(state.emergencyRunwayMonths).toBe(5.0);

      const request: WithdrawalRequest = {
        amountNeeded: 200000,
        urgency: 'immediate',
      };

      const result = evaluateWithdrawal(state, request);

      expect(result.scenarios.length).toBe(4);
      expect(result.hasCleanScenario).toBe(true);
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.engineVersion).toBe('1.0.0');
      expect(result.snapshot.taxRuleVersion).toBe('2024-25');

      // 1. Scenario A: Use Cash
      const scenarioA = result.scenarios.find((s) => s.id === 'scenario-a-use-cash')!;
      expect(scenarioA).toBeDefined();
      expect(scenarioA.name).toBe('Scenario A: Use Cash');
      expect(scenarioA.tier1Friction.grossProceeds).toBe(200000);
      expect(scenarioA.tier1Friction.estimatedTaxImpact).toBe(0);
      expect(scenarioA.tier1Friction.exitLoads).toBe(0);
      expect(scenarioA.tier1Friction.preClosurePenalties).toBe(0);
      expect(scenarioA.tier1Friction.totalDirectFriction).toBe(0);
      expect(scenarioA.tier1Friction.netCashReceived).toBe(200000);
      expect(scenarioA.tier1Friction.settlementTime).toBe('T+0 (Immediate)');
      // Liquid cash after = 5L - 2L = 3L -> Runway = 3L / 1L = 3.0 months
      expect(scenarioA.tier2Consequences.emergencyRunwayBefore).toBe(5.0);
      expect(scenarioA.tier2Consequences.emergencyRunwayAfter).toBe(3.0);
      expect(scenarioA.tier2Consequences.runwayStatus).toBe('Warning');
      expect(scenarioA.tier2Consequences.liquidityPositionAfter).toBe(300000);
      expect(scenarioA.isViable).toBe(true);

      // 2. Scenario B: Break FD
      const scenarioB = result.scenarios.find((s) => s.id === 'scenario-b-break-fd')!;
      expect(scenarioB).toBeDefined();
      expect(scenarioB.name).toBe('Scenario B: Break FD');
      expect(scenarioB.tier1Friction.grossProceeds).toBe(200000);
      // Pre-closure penalty: 1% of 2,00,000 = 2,000
      expect(scenarioB.tier1Friction.preClosurePenalties).toBe(2000);
      expect(scenarioB.tier1Friction.estimatedTaxImpact).toBeGreaterThan(0);
      expect(scenarioB.tier1Friction.totalDirectFriction).toBe(
        scenarioB.tier1Friction.estimatedTaxImpact + scenarioB.tier1Friction.preClosurePenalties
      );
      expect(scenarioB.tier1Friction.netCashReceived).toBe(
        scenarioB.tier1Friction.grossProceeds - scenarioB.tier1Friction.totalDirectFriction
      );
      // FD preserves bank savings runway!
      expect(scenarioB.tier2Consequences.emergencyRunwayBefore).toBe(5.0);
      expect(scenarioB.tier2Consequences.emergencyRunwayAfter).toBe(5.0);
      expect(scenarioB.tier2Consequences.runwayStatus).toBe('Warning');
      expect(scenarioB.isViable).toBe(true);

      // 3. Scenario C: Redeem Mutual Fund
      const scenarioC = result.scenarios.find((s) => s.id === 'scenario-c-redeem-mf')!;
      expect(scenarioC).toBeDefined();
      expect(scenarioC.name).toBe('Scenario C: Redeem Mutual Fund');
      expect(scenarioC.tier1Friction.grossProceeds).toBe(200000);
      // Redeems 1000 units from lot-eq-1 (LTCG). Capital gain = 1000 * 80 = 80,000.
      // 80,000 is within 1,25,000 annual exemption -> tax = 0!
      // Holding period > 365 days -> exit load = 0!
      expect(scenarioC.tier1Friction.estimatedTaxImpact).toBe(0);
      expect(scenarioC.tier1Friction.exitLoads).toBe(0);
      expect(scenarioC.tier1Friction.totalDirectFriction).toBe(0);
      expect(scenarioC.tier1Friction.netCashReceived).toBe(200000);
      expect(scenarioC.tier1Friction.settlementTime).toContain('T+2');
      // Runway is preserved!
      expect(scenarioC.tier2Consequences.emergencyRunwayBefore).toBe(5.0);
      expect(scenarioC.tier2Consequences.emergencyRunwayAfter).toBe(5.0);
      expect(scenarioC.isViable).toBe(true);

      // Goal impact is computed for linked goal (holding-mf-eq-1 linked to goal-p1-edu)
      expect(scenarioC.tier2Consequences.goalImpact.length).toBeGreaterThan(0);
      const goalImpact = scenarioC.tier2Consequences.goalImpact[0];
      expect(goalImpact.goalId).toBe('goal-p1-edu');
      expect(goalImpact.fundingShortfallRupees).toBe(200000);
      expect(goalImpact.delayMonths).toBeGreaterThan(0);

      // 4. Scenario D: Cash + MF
      const scenarioD = result.scenarios.find((s) => s.id === 'scenario-d-cash-plus-mf')!;
      expect(scenarioD).toBeDefined();
      expect(scenarioD.name).toBe('Scenario D: Cash + MF');
      expect(scenarioD.tier1Friction.grossProceeds).toBe(200000);
      expect(scenarioD.tier1Friction.netCashReceived).toBeGreaterThan(0);
      // Runway drops less than Scenario A because only partial cash is drawn
      expect(scenarioD.tier2Consequences.emergencyRunwayAfter).toBeGreaterThan(
        scenarioA.tier2Consequences.emergencyRunwayAfter
      );
      expect(scenarioD.tier2Consequences.emergencyRunwayAfter).toBeLessThan(5.0);
      expect(scenarioD.isViable).toBe(true);
    });

    it('triggers no-clean-scenario state when household liquidity is severely stressed', () => {
      // Create a stressed household state: runway is low, cash is scarce, goals are sensitive
      const rawData: RawHouseholdData = {
        profile: {
          familyId: 'fam-stressed',
          monthlyEssentialExpenses: 60000,
          monthlyDiscretionaryExpenses: 10000,
          baseEmergencyMonths: 6,
          targetAllocation: { equityPct: 100, debtPct: 0, goldPct: 0, cashPct: 0 },
        },
        members: [
          {
            id: 'm-1',
            familyId: 'fam-stressed',
            name: 'Stress Test User',
            relation: 'Self',
            age: 40,
            employmentStatus: 'employed',
            monthlyIncome: 80000,
            incomeType: 'stable',
            riskTolerance: 'Conservative',
            investmentExperience: 'beginner',
          },
        ],
        cashAccounts: [
          {
            id: 'c-1',
            ownerMemberId: 'm-1',
            institution: 'Bank',
            accountName: 'Checking',
            accountType: 'savings',
            currentBalance: 80000, // Runway = 80k / 60k = 1.33 months (already < 2.0)
          },
        ],
        liabilities: [],
        holdings: [], // Zero FDs, zero MFs
        goals: [
          {
            id: 'g-critical',
            familyId: 'fam-stressed',
            name: 'Imminent Surgery',
            priority: 'P1',
            targetAmount: 500000,
            targetYear: 2026,
            linkedHoldingIds: [],
          },
        ],
      };

      const state = buildHouseholdState(rawData);

      // Request ₹2,00,000 withdrawal (exceeds all cash, no FDs, no MFs)
      const request: WithdrawalRequest = {
        amountNeeded: 200000,
        urgency: 'immediate',
      };

      const result = evaluateWithdrawal(state, request);

      // Verify no-clean-scenario state trigger
      expect(result.hasCleanScenario).toBe(false);
      expect(result.constraintSummary).toBe(
        'No evaluated scenario meets the configured household constraints without a material consequence.'
      );
      expect(result.adjustableParametersGuide).toBeDefined();
      expect(result.adjustableParametersGuide!.length).toBeGreaterThanOrEqual(3);
      expect(
        result.adjustableParametersGuide!.some((g) => g.includes('2.0 months'))
      ).toBe(true);

      // All scenarios are non-viable or contain violations
      for (const scenario of result.scenarios) {
        expect(scenario.isViable).toBe(false);
        expect(scenario.constraintViolations.length).toBeGreaterThan(0);
      }
    });

    it('respects scopedMemberIds when evaluating withdrawals', () => {
      const state = createBaseState();
      // Only spouse's accounts (member-2 owns cash-2 with balance 2,00,000, and holding-mf-debt-1)
      const request: WithdrawalRequest = {
        amountNeeded: 150000,
        urgency: 'immediate',
        scopedMemberIds: ['member-2'],
      };

      const result = evaluateWithdrawal(state, request);
      const scenarioA = result.scenarios.find((s) => s.id === 'scenario-a-use-cash')!;

      expect(scenarioA.isViable).toBe(true);
      expect(scenarioA.sourceDescription).toContain('Savings Account');
      expect(scenarioA.sourceDescription).not.toContain('Salary Account');

      // Scenario B has no FDs for member-2
      const scenarioB = result.scenarios.find((s) => s.id === 'scenario-b-break-fd')!;
      expect(scenarioB.isViable).toBe(false);
    });
  });

  describe('Workflow 2: Investment Engine (evaluateInvestment)', () => {
    it('evaluates lump sum investment with debt prepayment and emergency fund top-up', () => {
      const state = createBaseState();
      // State has:
      // Emergency reserve target = 6 months * 1,00,000 = 6,00,000.
      // Liquid cash = 5,00,000.
      // Emergency reserve gap = 5,00,000 - 6,00,000 = -1,00,000 (deficit of 1,00,000).
      // Credit card liability = 1,50,000 @ 18% (>10%).
      expect(state.emergencyReserveGap).toBe(-100000);
      expect(state.liabilities.some((l) => l.interestRatePct > 10)).toBe(true);

      const request: InvestmentRequest = {
        mode: 'lump_sum',
        lumpSumAmount: 500000,
      };

      const result = evaluateInvestment(state, request);

      expect(result.scenarios.length).toBe(3);
      expect(result.snapshot).toBeDefined();

      // 1. Scenario A: Safety & Debt Paydown
      const scenarioA = result.scenarios.find((s) => s.id === 'scenario-a-safety-debt')!;
      expect(scenarioA).toBeDefined();
      expect(scenarioA.name).toBe('Scenario A: Safety & Debt Paydown');
      // Emergency reserve gap is 1,00,000 -> Safety allocation = 1,00,000
      expect(scenarioA.tier1Deployment.safetyReserveAllocation).toBe(100000);
      // High interest debt is 1,50,000 -> Debt prepayment allocation = 1,50,000
      expect(scenarioA.tier1Deployment.debtPrepaymentAllocation).toBe(150000);
      // Remaining 2,50,000 deployed to target mix
      const totalDeployedAssets = scenarioA.tier1Deployment.assetDeployments.reduce(
        (sum, d) => sum + d.amount,
        0
      );
      expect(totalDeployedAssets).toBe(250000);

      // Guaranteed interest saved: 18% of 1,50,000 = 27,000/year
      expect(scenarioA.tier2Consequences.guaranteedInterestSaved).toBe(27000);
      // Runway increases from 5.0 to 6.0 months (5L + 1L = 6L)
      expect(scenarioA.tier2Consequences.emergencyRunwayBefore).toBe(5.0);
      expect(scenarioA.tier2Consequences.emergencyRunwayAfter).toBe(6.0);
      // Monthly cash flow buffer increases due to EMI reduction
      expect(scenarioA.tier2Consequences.monthlyCashFlowBuffer).toBeGreaterThan(
        state.monthlySurplus
      );

      // 2. Scenario B: Allocation Realignment
      const scenarioB = result.scenarios.find(
        (s) => s.id === 'scenario-b-allocation-realignment'
      )!;
      expect(scenarioB).toBeDefined();
      expect(scenarioB.tier1Deployment.safetyReserveAllocation).toBe(0);
      expect(scenarioB.tier1Deployment.debtPrepaymentAllocation).toBe(0);
      expect(scenarioB.tier2Consequences.guaranteedInterestSaved).toBe(0);
      expect(scenarioB.tier2Consequences.emergencyRunwayAfter).toBe(5.0);
      expect(scenarioB.tier2Consequences.allocationDriftChange.length).toBeGreaterThan(0);

      // 3. Scenario C: Goal Acceleration
      const scenarioC = result.scenarios.find((s) => s.id === 'scenario-c-goal-acceleration')!;
      expect(scenarioC).toBeDefined();
      expect(scenarioC.tier2Consequences.goalMilestoneImpact.length).toBeGreaterThan(0);
      const acceleratedGoal = scenarioC.tier2Consequences.goalMilestoneImpact.find(
        (g) => g.goalId === 'goal-p1-edu'
      )!;
      expect(acceleratedGoal).toBeDefined();
      expect(acceleratedGoal.monthsAccelerated).toBeGreaterThan(0);
      expect(acceleratedGoal.gapReducedRupees).toBeGreaterThan(0);
    });

    it('evaluates recurring SIP planning with cash-flow buffer checks and target mix', () => {
      const state = createBaseState();
      // Monthly surplus = 230k income - 50k essential - 50k debt - 20k discretionary = 1,10,000
      expect(state.monthlySurplus).toBe(110000);

      // Request SIP of ₹40,000 (well within safe 80% ceiling of 1,10,000)
      const request: InvestmentRequest = {
        mode: 'recurring_sip',
        monthlyCommitment: 40000,
        optionalStepUpPct: 10,
      };

      const result = evaluateInvestment(state, request);

      expect(result.scenarios.length).toBe(2);

      // Scenario A: Target Mix Split
      const scenarioA = result.scenarios.find((s) => s.id === 'scenario-a-target-mix-sip')!;
      expect(scenarioA).toBeDefined();
      expect(scenarioA.tier1Deployment.monthlyCommitmentSplit).toBeDefined();
      // Uses household's configured target allocation (50% equity, 40% debt, 10% gold)
      // Excludes cash, normalized: equity 50/100 = 50%, debt 40%, gold 10%
      const equitySplit = scenarioA.tier1Deployment.monthlyCommitmentSplit!.find(
        (s) => s.category === 'equity'
      )!;
      const debtSplit = scenarioA.tier1Deployment.monthlyCommitmentSplit!.find(
        (s) => s.category === 'debt'
      )!;
      const goldSplit = scenarioA.tier1Deployment.monthlyCommitmentSplit!.find(
        (s) => s.category === 'gold'
      )!;

      expect(equitySplit.monthlyAmount).toBe(20000); // 50% of 40,000
      expect(debtSplit.monthlyAmount).toBe(16000); // 40% of 40,000
      expect(goldSplit.monthlyAmount).toBe(4000); // 10% of 40,000

      // Cash flow buffer = 1,10,000 - 40,000 = 70,000
      expect(scenarioA.tier2Consequences.monthlyCashFlowBuffer).toBe(70000);
      expect(scenarioA.tier2Consequences.projectedWealth5Yr).toBeGreaterThan(40000 * 60);
      expect(scenarioA.tier2Consequences.projectedWealth10Yr).toBeGreaterThan(
        scenarioA.tier2Consequences.projectedWealth5Yr
      );

      // Scenario B: Goal-Targeted Split
      const scenarioB = result.scenarios.find((s) => s.id === 'scenario-b-goal-targeted-sip')!;
      expect(scenarioB).toBeDefined();
      expect(scenarioB.tier2Consequences.goalMilestoneImpact.length).toBeGreaterThan(0);
      expect(scenarioB.tier2Consequences.monthlyCashFlowBuffer).toBe(70000);
    });

    it('warns when recurring SIP commitment consumes > 80% of free cash flow', () => {
      const state = createBaseState();
      // Surplus is 1,10,000. Commitment of 1,00,000 is ~91% of surplus (>80%)
      const request: InvestmentRequest = {
        mode: 'recurring_sip',
        monthlyCommitment: 100000,
      };

      const result = evaluateInvestment(state, request);
      const scenarioA = result.scenarios[0];

      expect(scenarioA.tier2Consequences.monthlyCashFlowBuffer).toBe(10000);
      expect(
        scenarioA.executionChecklist.some((note) => note.includes('80% safety ceiling'))
      ).toBe(true);
    });
  });

  describe('Snapshot Immutability and Audit Integrity', () => {
    it('generates immutable scenario snapshots with accurate engine versioning', () => {
      const state = createBaseState();
      const request: WithdrawalRequest = {
        amountNeeded: 100000,
        urgency: 'immediate',
      };

      const result = evaluateWithdrawal(state, request);
      const snapshot = result.snapshot;

      expect(snapshot).toBeDefined();
      expect(snapshot.engineVersion).toBe('1.0.0');
      expect(snapshot.taxRuleVersion).toBe('2024-25');
      expect(snapshot.createdAt).toBeDefined();
      expect(snapshot.requestParams).toBeDefined();
      expect(snapshot.householdState.netWorth).toBe(state.netWorth);

      // Verify that modifying the returned request object does not mutate snapshot
      request.amountNeeded = 999999;
      expect((snapshot.inputs.request as WithdrawalRequest).amountNeeded).toBe(100000);
    });
  });
});
