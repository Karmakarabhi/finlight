/**
 * Finlight V1: Canonical Household End-to-End Fixture Test ("Karmakar Family")
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md
 *
 * Fixture: Karmakar Family
 * - CFO: Self (34y, employed, ₹1,50,000/mo stable)
 * - Spouse (32y, employed, ₹80,000/mo stable)
 * - Father (64y, retired, ₹40,000/mo pension)
 * - Mother (60y, homemaker, ₹0/mo)
 * - Expenses: Essential (₹1,10,000/mo), Discretionary (₹40,000/mo)
 * - Liabilities: Home loan (₹32,00,000 @ 8.5%, EMI ₹31,000/mo), Personal loan (₹2,50,000 @ 13.5%, EMI ₹8,500/mo)
 * - Cash Accounts: HDFC (₹4,50,000), ICICI (₹2,20,000), SBI (₹1,80,000). Total: ₹8,50,000
 * - Fixed Deposits: HDFC FD (₹5,00,000 @ 7.1%), SBI FD (₹3,00,000 @ 7.0%)
 * - Holdings & Lots:
 *   - Parag Parikh Flexi Cap (Equity MF, Lot 1: 18 mo LTCG; Lot 2: 4 mo STCG)
 *   - Mirae Asset Large Cap (Equity MF, LTCG)
 *   - HDFC Short Term Debt Fund (Debt MF, Section 50AA slab taxed)
 *   - Nippon India Gold ETF (Gold)
 * - Goals:
 *   - Child Education (P1, Target: ₹35,00,000, Year: 2032)
 *   - Retirement (P1, Target: ₹2,50,00,000, Year: 2045)
 *   - Family Vacation (P3, Target: ₹4,00,000, Year: 2027)
 */

// @ts-ignore
import { describe, it, expect } from 'bun:test';
import {
  buildHouseholdState,
  RawHouseholdData,
  HouseholdFinancialState,
  evaluateWithdrawal,
  evaluateInvestment,
  WithdrawalRequest,
  InvestmentRequest,
} from '../../lib/engine';

/**
 * Builds the canonical "Karmakar Family" fixture exactly as specified.
 */
function createKarmakarFamilyFixture(): RawHouseholdData {
  return {
    profile: {
      familyId: 'fam-karmakar-canonical',
      monthlyEssentialExpenses: 110000,
      monthlyDiscretionaryExpenses: 40000,
      baseEmergencyMonths: 6,
      targetAllocation: {
        equityPct: 60,
        debtPct: 30,
        goldPct: 10,
        cashPct: 0,
      },
    },
    members: [
      {
        id: 'member-self',
        familyId: 'fam-karmakar-canonical',
        name: 'Abhijit Karmakar',
        relation: 'Self',
        age: 34,
        employmentStatus: 'employed',
        monthlyIncome: 150000,
        incomeType: 'stable',
        riskTolerance: 'Moderate',
        investmentExperience: 'intermediate',
      },
      {
        id: 'member-spouse',
        familyId: 'fam-karmakar-canonical',
        name: 'Priyanka Karmakar',
        relation: 'Spouse',
        age: 32,
        employmentStatus: 'employed',
        monthlyIncome: 80000,
        incomeType: 'stable',
        riskTolerance: 'Moderate',
        investmentExperience: 'intermediate',
      },
      {
        id: 'member-father',
        familyId: 'fam-karmakar-canonical',
        name: 'Prabir Karmakar',
        relation: 'Father',
        age: 64,
        employmentStatus: 'retired',
        monthlyIncome: 40000,
        incomeType: 'stable',
        riskTolerance: 'Conservative',
        investmentExperience: 'beginner',
      },
      {
        id: 'member-mother',
        familyId: 'fam-karmakar-canonical',
        name: 'Maya Karmakar',
        relation: 'Mother',
        age: 60,
        employmentStatus: 'homemaker',
        monthlyIncome: 0,
        incomeType: 'stable',
        riskTolerance: 'Conservative',
        investmentExperience: 'beginner',
      },
    ],
    cashAccounts: [
      {
        id: 'cash-hdfc',
        ownerMemberId: 'member-self',
        institution: 'HDFC Bank',
        accountName: 'HDFC Salary Account',
        accountType: 'savings',
        currentBalance: 450000,
      },
      {
        id: 'cash-icici',
        ownerMemberId: 'member-spouse',
        institution: 'ICICI Bank',
        accountName: 'ICICI Savings Account',
        accountType: 'savings',
        currentBalance: 220000,
      },
      {
        id: 'cash-sbi',
        ownerMemberId: 'member-father',
        institution: 'State Bank of India',
        accountName: 'SBI Pension Account',
        accountType: 'savings',
        currentBalance: 180000,
      },
    ],
    liabilities: [
      {
        id: 'loan-home',
        ownerMemberId: 'member-self',
        name: 'Home Loan',
        type: 'home',
        outstandingBalance: 3200000,
        interestRatePct: 8.5,
        monthlyEmi: 31000,
      },
      {
        id: 'loan-personal',
        ownerMemberId: 'member-self',
        name: 'Personal Loan',
        type: 'personal',
        outstandingBalance: 250000,
        interestRatePct: 13.5,
        monthlyEmi: 8500,
      },
    ],
    holdings: [
      {
        id: 'holding-fd-hdfc',
        ownerMemberId: 'member-self',
        assetType: 'FD',
        name: 'HDFC Fixed Deposit',
        identifier: 'HDFC-FD-710',
        totalUnits: 1,
        currentPrice: 500000,
        currentValue: 500000,
        interestRatePct: 7.1,
        exitLoadPct: 1.0,
        category: 'debt',
      },
      {
        id: 'holding-fd-sbi',
        ownerMemberId: 'member-father',
        assetType: 'FD',
        name: 'SBI Fixed Deposit',
        identifier: 'SBI-FD-700',
        totalUnits: 1,
        currentPrice: 300000,
        currentValue: 300000,
        interestRatePct: 7.0,
        exitLoadPct: 1.0,
        category: 'debt',
      },
      {
        id: 'holding-mf-ppfc',
        ownerMemberId: 'member-self',
        assetType: 'MF',
        name: 'Parag Parikh Flexi Cap Fund',
        identifier: 'INF879O01018',
        totalUnits: 10000,
        currentPrice: 120,
        currentValue: 1200000,
        category: 'equity',
        exitLoadPct: 1.0,
        exitLoadWindowDays: 365,
      },
      {
        id: 'holding-mf-malc',
        ownerMemberId: 'member-self',
        assetType: 'MF',
        name: 'Mirae Asset Large Cap Fund',
        identifier: 'INF769K01010',
        totalUnits: 8000,
        currentPrice: 100,
        currentValue: 800000,
        category: 'equity',
        exitLoadPct: 1.0,
        exitLoadWindowDays: 365,
      },
      {
        id: 'holding-mf-debt',
        ownerMemberId: 'member-spouse',
        assetType: 'MF',
        name: 'HDFC Short Term Debt Fund',
        identifier: 'INF179K01999',
        totalUnits: 12000,
        currentPrice: 50,
        currentValue: 600000,
        category: 'debt',
        exitLoadPct: 0.25,
        exitLoadWindowDays: 30,
      },
      {
        id: 'holding-gold',
        ownerMemberId: 'member-self',
        assetType: 'Gold',
        name: 'Nippon India Gold ETF',
        identifier: 'INF204KB14I2',
        totalUnits: 5000,
        currentPrice: 80,
        currentValue: 400000,
        category: 'gold',
      },
    ],
    taxLots: [
      // Parag Parikh Flexi Cap Lot 1: 18 months old (> 365 days / LTCG)
      {
        id: 'lot-ppfc-ltcg',
        holdingId: 'holding-mf-ppfc',
        purchaseDate: new Date('2025-03-15'),
        units: 7000,
        remainingUnits: 7000,
        buyPrice: 85,
      },
      // Parag Parikh Flexi Cap Lot 2: 4 months old (<= 365 days / STCG)
      {
        id: 'lot-ppfc-stcg',
        holdingId: 'holding-mf-ppfc',
        purchaseDate: new Date('2026-05-15'),
        units: 3000,
        remainingUnits: 3000,
        buyPrice: 105,
      },
      // Mirae Asset Large Cap: LTCG (> 365 days)
      {
        id: 'lot-malc-ltcg',
        holdingId: 'holding-mf-malc',
        purchaseDate: new Date('2024-06-01'),
        units: 8000,
        remainingUnits: 8000,
        buyPrice: 75,
      },
      // HDFC Short Term Debt: Post-April 2023 / Section 50AA slab taxed
      {
        id: 'lot-debt-50aa',
        holdingId: 'holding-mf-debt',
        purchaseDate: new Date('2025-01-01'),
        units: 12000,
        remainingUnits: 12000,
        buyPrice: 45,
      },
      // Nippon Gold ETF: LTCG
      {
        id: 'lot-gold-etf',
        holdingId: 'holding-gold',
        purchaseDate: new Date('2024-01-01'),
        units: 5000,
        remainingUnits: 5000,
        buyPrice: 60,
      },
      // HDFC FD Lot
      {
        id: 'lot-fd-hdfc',
        holdingId: 'holding-fd-hdfc',
        purchaseDate: new Date('2025-09-01'),
        units: 1,
        remainingUnits: 1,
        buyPrice: 465000,
      },
      // SBI FD Lot
      {
        id: 'lot-fd-sbi',
        holdingId: 'holding-fd-sbi',
        purchaseDate: new Date('2025-09-01'),
        units: 1,
        remainingUnits: 1,
        buyPrice: 280000,
      },
    ],
    goals: [
      {
        id: 'goal-child-edu',
        familyId: 'fam-karmakar-canonical',
        name: 'Child Education',
        priority: 'P1',
        targetAmount: 3500000,
        targetYear: 2032,
        linkedHoldingIds: ['holding-mf-ppfc'],
      },
      {
        id: 'goal-retirement',
        familyId: 'fam-karmakar-canonical',
        name: 'Retirement',
        priority: 'P1',
        targetAmount: 25000000,
        targetYear: 2045,
        linkedHoldingIds: ['holding-mf-malc'],
      },
      {
        id: 'goal-family-vacation',
        familyId: 'fam-karmakar-canonical',
        name: 'Family Vacation',
        priority: 'P3',
        targetAmount: 400000,
        targetYear: 2027,
        linkedHoldingIds: [],
      },
    ],
  };
}

describe('Finlight V1: Canonical Household End-to-End Test ("Karmakar Family")', () => {
  let state: HouseholdFinancialState;

  it('1. State builder accurately computes balance sheet, obligations, runway, available cash, and tripartite risk', () => {
    const rawData = createKarmakarFamilyFixture();
    state = buildHouseholdState(rawData);

    // 1.1 Inflow and Obligations
    // Inflow: 1.5L (Self) + 80k (Spouse) + 40k (Father pension) = 2,70,000
    expect(state.monthlyInflow).toBe(270000);
    expect(state.monthlyEssentialExpenses).toBe(110000);
    expect(state.monthlyDiscretionaryExpenses).toBe(40000);

    // Debt servicing: 31,000 (Home loan) + 8,500 (Personal loan) = 39,500
    expect(state.monthlyDebtServicing).toBe(39500);

    // Monthly Obligations = Essential (1,10,000) + Debt Servicing (39,500) = 1,49,500
    const monthlyObligations = state.monthlyEssentialExpenses + state.monthlyDebtServicing;
    expect(monthlyObligations).toBe(149500);

    // Monthly Surplus = 2,70,000 - 1,49,500 - 40,000 = 80,500
    expect(state.monthlySurplus).toBe(80500);

    // 1.2 Wealth Aggregations
    // Liquid Wealth: 4.5L (HDFC) + 2.2L (ICICI) + 1.8L (SBI) = 8,50,000
    expect(state.liquidWealth).toBe(850000);

    // Fixed Wealth: 5L (HDFC FD) + 3L (SBI FD) = 8,00,000
    expect(state.fixedWealth).toBe(800000);

    // Invested Wealth: PPFC (12L) + MALC (8L) + Debt MF (6L) + Gold ETF (4L) = 30,00,000
    expect(state.investedWealth).toBe(3000000);

    // Gross Wealth = Liquid (8.5L) + Invested (30L) + Fixed (8L) = 46,50,000
    expect(state.grossWealth).toBe(4650000);

    // Total Liabilities = 32L (Home loan) + 2.5L (Personal loan) = 34,50,000
    expect(state.totalLiabilities).toBe(3450000);

    // Net Worth = Gross Wealth (46,50,000) - Total Liabilities (34,50,000) = 12,00,000
    expect(state.netWorth).toBe(1200000);

    // 1.3 Emergency Runway & Reserve Target
    // Runway = 8,50,000 / 1,49,500 = 5.6856... ≈ 5.69 months
    expect(state.emergencyRunwayMonths).toBeCloseTo(5.69, 1);

    // Emergency Reserve Target = 1,49,500 * 6 = 8,97,000
    expect(state.emergencyReserveTarget).toBe(897000);

    // Emergency Reserve Gap = Liquid Cash (8.5L) - Target (8.97L) = -47,000
    expect(state.emergencyReserveGap).toBe(-47000);

    // Decision-Available Cash = 8,50,000 - 8,97,000 = -47,000 (shows deficit protecting 6m reserve)
    expect(state.decisionAvailableCash).toBe(-47000);

    // 1.4 Allocation Drift
    // Target: Equity 60%, Debt 30%, Gold 10%, Cash 0%
    // Total Wealth = 46.5L
    // Equity: 20L / 46.5L = 43.01% -> Underweight drift -16.99%, deficit ₹7,90,000
    expect(state.allocationDrift.equity).toBeDefined();
    expect(state.allocationDrift.equity.actualPct).toBeCloseTo(43.01, 1);
    expect(state.allocationDrift.equity.driftPct).toBeLessThan(0);
    expect(state.allocationDrift.equity.deficitRupees).toBeGreaterThan(700000);

    // Debt: (8L FDs + 6L Debt MF) = 14L / 46.5L = 30.11% -> Drift +0.11%
    expect(state.allocationDrift.debt).toBeDefined();
    expect(state.allocationDrift.debt.actualPct).toBeCloseTo(30.11, 1);

    // Gold: 4L / 46.5L = 8.60% -> Underweight drift -1.40%, deficit ₹65,000
    expect(state.allocationDrift.gold).toBeDefined();
    expect(state.allocationDrift.gold.actualPct).toBeCloseTo(8.6, 1);
    expect(state.allocationDrift.gold.deficitRupees).toBeGreaterThan(0);

    // Cash: 8.5L / 46.5L = 18.28% -> Overweight drift +18.28%
    expect(state.allocationDrift.cash).toBeDefined();
    expect(state.allocationDrift.cash.actualPct).toBeCloseTo(18.28, 1);

    // 1.5 Tripartite Risk Profile
    expect(state.risk).toBeDefined();
    // Capacity: Moderate due to 5.7m runway, healthy 30% savings rate, 15% debt servicing, 2 dependents
    expect(state.risk.riskCapacity.level).toBe('Moderate');
    expect(state.risk.riskCapacity.rationale.length).toBeGreaterThan(0);

    // Tolerance: Moderate (inherited from Self)
    expect(state.risk.riskTolerance.level).toBe('Moderate');

    // Requirement: Mathematically computed rate of return required to achieve ₹2.89 Cr across 3 goals
    expect(state.risk.riskRequirement.requiredReturnPct).toBeGreaterThan(10);
    expect(state.risk.riskRequirement.rationale).toContain('goal(s)');
  });

  describe('2. Withdrawal Decision Evaluation (₹5,00,000 Short-Term Urgency)', () => {
    it('generates 4 viable scenarios with exact Tier 1 friction and Tier 2 consequences', () => {
      if (!state) {
        state = buildHouseholdState(createKarmakarFamilyFixture());
      }

      const request: WithdrawalRequest = {
        amountNeeded: 500000,
        urgency: 'short_term',
      };

      const result = evaluateWithdrawal(state, request);

      // Verify overall result integrity
      expect(result.scenarios.length).toBe(4);
      expect(result.hasCleanScenario).toBe(true);
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.engineVersion).toBe('1.0.0');
      expect(result.snapshot.taxRuleVersion).toBe('2024-25');

      // ---------------------------------------------------------------------
      // Scenario A: Use Cash
      // ---------------------------------------------------------------------
      const scenarioA = result.scenarios.find((s) => s.id === 'scenario-a-use-cash')!;
      expect(scenarioA).toBeDefined();
      expect(scenarioA.name).toBe('Scenario A: Use Cash');
      expect(scenarioA.isViable).toBe(true);
      expect(scenarioA.constraintViolations).toHaveLength(0);

      // Tier 1 Friction: Cash has 0 tax, 0 exit loads, 0 penalties, T+0 settlement
      expect(scenarioA.tier1Friction.grossProceeds).toBe(500000);
      expect(scenarioA.tier1Friction.estimatedTaxImpact).toBe(0);
      expect(scenarioA.tier1Friction.exitLoads).toBe(0);
      expect(scenarioA.tier1Friction.preClosurePenalties).toBe(0);
      expect(scenarioA.tier1Friction.totalDirectFriction).toBe(0);
      expect(scenarioA.tier1Friction.netCashReceived).toBe(500000);
      expect(scenarioA.tier1Friction.settlementTime).toContain('T+0');

      // Tier 2 Consequences: Liquid cash drops from 8.5L to 3.5L
      // Runway drops from 5.69m to 3.5L / 1,49,500 = 2.34m (>= 2.0m floor)
      expect(scenarioA.tier2Consequences.emergencyRunwayBefore).toBeCloseTo(5.69, 1);
      expect(scenarioA.tier2Consequences.emergencyRunwayAfter).toBeCloseTo(2.34, 1);
      expect(scenarioA.tier2Consequences.runwayStatus).toBe('Critical');
      expect(scenarioA.tier2Consequences.liquidityPositionAfter).toBe(350000);
      expect(scenarioA.tier2Consequences.goalImpact.length).toBeGreaterThan(0);

      // ---------------------------------------------------------------------
      // Scenario B: Break FD
      // ---------------------------------------------------------------------
      const scenarioB = result.scenarios.find((s) => s.id === 'scenario-b-break-fd')!;
      expect(scenarioB).toBeDefined();
      expect(scenarioB.name).toBe('Scenario B: Break FD');
      expect(scenarioB.isViable).toBe(true);
      expect(scenarioB.constraintViolations).toHaveLength(0);

      // Tier 1 Friction: 1% pre-closure penalty on ₹5,00,000 = ₹5,000
      expect(scenarioB.tier1Friction.grossProceeds).toBe(500000);
      expect(scenarioB.tier1Friction.preClosurePenalties).toBe(5000);
      expect(scenarioB.tier1Friction.estimatedTaxImpact).toBeGreaterThan(0);
      expect(scenarioB.tier1Friction.totalDirectFriction).toBe(
        scenarioB.tier1Friction.estimatedTaxImpact + scenarioB.tier1Friction.preClosurePenalties
      );
      expect(scenarioB.tier1Friction.netCashReceived).toBe(
        scenarioB.tier1Friction.grossProceeds - scenarioB.tier1Friction.totalDirectFriction
      );
      expect(scenarioB.tier1Friction.settlementTime).toContain('T+0 to T+1');

      // Tier 2 Consequences: Bank savings cash runway is fully preserved at 5.69 months!
      expect(scenarioB.tier2Consequences.emergencyRunwayBefore).toBeCloseTo(5.69, 1);
      expect(scenarioB.tier2Consequences.emergencyRunwayAfter).toBeCloseTo(5.69, 1);
      expect(scenarioB.tier2Consequences.liquidityPositionAfter).toBe(850000);

      // ---------------------------------------------------------------------
      // Scenario C: Redeem Mutual Fund
      // ---------------------------------------------------------------------
      const scenarioC = result.scenarios.find((s) => s.id === 'scenario-c-redeem-mf')!;
      expect(scenarioC).toBeDefined();
      expect(scenarioC.name).toBe('Scenario C: Redeem Mutual Fund');
      expect(scenarioC.isViable).toBe(true);
      expect(scenarioC.constraintViolations).toHaveLength(0);

      // Tier 1 Friction: Allocation drift gate prioritizes the overweight Debt category (+0.11% vs Equity -16.99%)
      // Redeems ₹5,00,000 from HDFC Short Term Debt Fund (10,000 units @ NAV ₹50, cost basis ₹45)
      // Section 50AA: Capital gain = 10,000 * 5 = ₹50,000 taxed at Spouse marginal slab (10% + 4% cess = 10.4%)
      // Estimated tax = ₹5,200, Exit loads = ₹0 (held > 30 days)
      expect(scenarioC.tier1Friction.grossProceeds).toBe(500000);
      expect(scenarioC.tier1Friction.exitLoads).toBe(0);
      expect(scenarioC.tier1Friction.estimatedTaxImpact).toBe(5200);
      expect(scenarioC.tier1Friction.totalDirectFriction).toBe(5200);
      expect(scenarioC.tier1Friction.netCashReceived).toBe(494800);
      expect(scenarioC.tier1Friction.settlementTime).toContain('T+2 to T+3');

      // Tier 2 Consequences: Cash runway preserved at 5.69m
      expect(scenarioC.tier2Consequences.emergencyRunwayBefore).toBeCloseTo(5.69, 1);
      expect(scenarioC.tier2Consequences.emergencyRunwayAfter).toBeCloseTo(5.69, 1);
      // Measurable goal delay on linked Child Education goal (shortfall ₹5,00,000)
      expect(scenarioC.tier2Consequences.goalImpact).toHaveLength(1);
      expect(scenarioC.tier2Consequences.goalImpact[0].goalId).toBe('goal-child-edu');
      expect(scenarioC.tier2Consequences.goalImpact[0].fundingShortfallRupees).toBe(500000);
      expect(scenarioC.tier2Consequences.goalImpact[0].delayMonths).toBeCloseTo(10.3, 1);

      // ---------------------------------------------------------------------
      // Scenario D: Cash + MF (Hybrid)
      // ---------------------------------------------------------------------
      const scenarioD = result.scenarios.find((s) => s.id === 'scenario-d-cash-plus-mf')!;
      expect(scenarioD).toBeDefined();
      expect(scenarioD.name).toBe('Scenario D: Cash + MF');
      expect(scenarioD.isViable).toBe(true);
      expect(scenarioD.constraintViolations).toHaveLength(0);

      // Tier 1 Friction: Hybrid draws ₹2,50,000 from cash and ₹2,50,000 from MF
      // MF portion LTCG gain = 2083.3333 * 35 = 72,916.67 <= 1,25,000 annual exemption -> Tax = 0!
      expect(scenarioD.tier1Friction.grossProceeds).toBe(500000);
      expect(scenarioD.tier1Friction.estimatedTaxImpact).toBe(0);
      expect(scenarioD.tier1Friction.exitLoads).toBe(0);
      expect(scenarioD.tier1Friction.totalDirectFriction).toBe(0);
      expect(scenarioD.tier1Friction.netCashReceived).toBe(500000);

      // Tier 2 Consequences: Cash after = 8.5L - 2.5L = 6.0L
      // Runway = 6.0L / 1,49,500 = 4.01m (better cushioned than Scenario A's 2.34m)
      expect(scenarioD.tier2Consequences.emergencyRunwayAfter).toBeCloseTo(4.01, 1);
      expect(scenarioD.tier2Consequences.emergencyRunwayAfter).toBeGreaterThan(
        scenarioA.tier2Consequences.emergencyRunwayAfter
      );
      expect(scenarioD.tier2Consequences.liquidityPositionAfter).toBe(600000);
    });
  });

  describe('3. Withdrawal Decision Evaluation (Extreme Amounts & Stressed Constraints)', () => {
    it('triggers hasCleanScenario: false with neutral constraint flags for ₹20,00,000 withdrawal', () => {
      if (!state) {
        state = buildHouseholdState(createKarmakarFamilyFixture());
      }

      const request: WithdrawalRequest = {
        amountNeeded: 2000000, // ₹20 Lakhs
        urgency: 'short_term',
      };

      const result = evaluateWithdrawal(state, request);

      // Household cannot cleanly absorb ₹20 Lakhs:
      // Total cash is ₹8.5L (< 20L), Total FDs is ₹8.0L (< 20L)
      expect(result.hasCleanScenario).toBe(false);
      expect(result.constraintSummary).toBe(
        'No evaluated scenario meets the configured household constraints without a material consequence.'
      );
      expect(result.adjustableParametersGuide).toBeDefined();
      expect(result.adjustableParametersGuide!.length).toBeGreaterThanOrEqual(3);

      // Scenario A (Cash) fails due to insufficient balance and runway collapse
      const scenarioA = result.scenarios.find((s) => s.id === 'scenario-a-use-cash')!;
      expect(scenarioA.isViable).toBe(false);
      expect(
        scenarioA.constraintViolations.some((v) => v.toLowerCase().includes('insufficient cash'))
      ).toBe(true);

      // Scenario B (FD) fails due to insufficient FD balance
      const scenarioB = result.scenarios.find((s) => s.id === 'scenario-b-break-fd')!;
      expect(scenarioB.isViable).toBe(false);
      expect(
        scenarioB.constraintViolations.some((v) => v.toLowerCase().includes('insufficient fixed deposit'))
      ).toBe(true);

      // Every scenario breaches constraints or fails viability
      expect(result.scenarios.every((s) => !s.isViable)).toBe(true);
    });

    it('triggers hasCleanScenario: false when liquid cash is stressed below critical floor', () => {
      const baseFixture = createKarmakarFamilyFixture();
      // Stress cash: drain bank balances down to ₹1,00,000 total (runway = 0.67 months < 2.0m floor)
      const stressedData: RawHouseholdData = {
        ...baseFixture,
        cashAccounts: [
          {
            ...baseFixture.cashAccounts[0],
            currentBalance: 100000,
          },
          {
            ...baseFixture.cashAccounts[1],
            currentBalance: 0,
          },
          {
            ...baseFixture.cashAccounts[2],
            currentBalance: 0,
          },
        ],
      };

      const stressedState = buildHouseholdState(stressedData);
      expect(stressedState.liquidWealth).toBe(100000);
      expect(stressedState.emergencyRunwayMonths).toBeLessThan(1.0);

      const request: WithdrawalRequest = {
        amountNeeded: 500000,
        urgency: 'short_term',
      };

      const result = evaluateWithdrawal(stressedState, request);
      expect(result.hasCleanScenario).toBe(false);
      expect(result.constraintSummary).toContain('No evaluated scenario meets');
    });
  });

  describe('4. Lump Sum Investment Evaluation (₹3,00,000 Deployment)', () => {
    it('flags the 13.5% personal loan for debt prepayment arbitrage and closes underweight asset class drift', () => {
      if (!state) {
        state = buildHouseholdState(createKarmakarFamilyFixture());
      }

      const request: InvestmentRequest = {
        mode: 'lump_sum',
        lumpSumAmount: 300000,
      };

      const result = evaluateInvestment(state, request);

      expect(result.scenarios.length).toBe(3);
      expect(result.snapshot).toBeDefined();

      // ---------------------------------------------------------------------
      // Scenario A: Safety & Debt Paydown (Arbitrage Gate)
      // ---------------------------------------------------------------------
      const scenarioA = result.scenarios.find((s) => s.id === 'scenario-a-safety-debt')!;
      expect(scenarioA).toBeDefined();
      expect(scenarioA.name).toBe('Scenario A: Safety & Debt Paydown');

      // Emergency reserve gap is ₹47,000 -> Safety allocation = ₹47,000
      expect(scenarioA.tier1Deployment.safetyReserveAllocation).toBe(47000);

      // Remaining ₹2,53,000 -> Full prepayment of ₹2,50,000 personal loan @ 13.5%
      expect(scenarioA.tier1Deployment.debtPrepaymentAllocation).toBe(250000);

      // Guaranteed interest saved: 13.5% of 2,50,000 = ₹33,750 per year!
      expect(scenarioA.tier2Consequences.guaranteedInterestSaved).toBe(33750);

      // Prepaying personal loan frees up ₹8,500/month EMI, increasing monthly surplus buffer
      expect(scenarioA.tier2Consequences.monthlyCashFlowBuffer).toBe(state.monthlySurplus + 8500);

      // Emergency runway improves from 5.7 to 6.0 months (reserve fully funded)
      expect(scenarioA.tier2Consequences.emergencyRunwayAfter).toBe(6.0);

      // Execution checklist highlights the arbitrage and interest savings
      expect(
        scenarioA.executionChecklist.some((item) =>
          item.includes('Personal Loan') || item.includes('Personal loan')
        )
      ).toBe(true);
      expect(
        scenarioA.executionChecklist.some((item) => item.includes('₹33,750/year'))
      ).toBe(true);
      expect(
        scenarioA.executionChecklist.some((item) => item.includes('₹8,500/month'))
      ).toBe(true);

      // ---------------------------------------------------------------------
      // Scenario B: Allocation Realignment (Drift Gate)
      // ---------------------------------------------------------------------
      const scenarioB = result.scenarios.find((s) => s.id === 'scenario-b-allocation-realignment')!;
      expect(scenarioB).toBeDefined();
      expect(scenarioB.name).toBe('Scenario B: Allocation Realignment');

      // 100% of ₹3,00,000 is directed toward closing underweight asset class drift
      expect(scenarioB.tier1Deployment.safetyReserveAllocation).toBe(0);
      expect(scenarioB.tier1Deployment.debtPrepaymentAllocation).toBe(0);

      const deployments = scenarioB.tier1Deployment.assetDeployments;
      expect(deployments.length).toBe(2);

      // Deploys to Equity (deficit ~₹7.9L) and Gold (deficit ~₹65k)
      const equityDep = deployments.find((d) => d.category.toLowerCase() === 'equity')!;
      const goldDep = deployments.find((d) => d.category.toLowerCase() === 'gold')!;
      expect(equityDep).toBeDefined();
      expect(goldDep).toBeDefined();
      expect(equityDep.amount + goldDep.amount).toBe(300000);
      expect(equityDep.amount).toBeGreaterThan(250000); // lion's share to equity deficit

      // Verification that drift improves (driftAfter closer to 0 than driftBefore)
      const equityDrift = scenarioB.tier2Consequences.allocationDriftChange.find(
        (c) => c.category.toLowerCase() === 'equity'
      )!;
      expect(Math.abs(equityDrift.driftAfter)).toBeLessThan(Math.abs(equityDrift.driftBefore));

      // ---------------------------------------------------------------------
      // Scenario C: Goal Acceleration (Milestone Gate)
      // ---------------------------------------------------------------------
      const scenarioC = result.scenarios.find((s) => s.id === 'scenario-c-goal-acceleration')!;
      expect(scenarioC).toBeDefined();
      expect(scenarioC.name).toBe('Scenario C: Goal Acceleration');
      expect(scenarioC.tier2Consequences.goalMilestoneImpact.length).toBeGreaterThan(0);
      const eduImpact = scenarioC.tier2Consequences.goalMilestoneImpact.find(
        (g) => g.goalId === 'goal-child-edu'
      )!;
      expect(eduImpact).toBeDefined();
      expect(eduImpact.gapReducedRupees).toBe(300000);
      expect(eduImpact.monthsAccelerated).toBeGreaterThan(5);
    });
  });

  describe('5. Recurring SIP Investment Evaluation (₹40,000/Month Commitment)', () => {
    it('verifies monthly cash-flow feasibility buffer against surplus and routes to target mix', () => {
      if (!state) {
        state = buildHouseholdState(createKarmakarFamilyFixture());
      }

      const request: InvestmentRequest = {
        mode: 'recurring_sip',
        monthlyCommitment: 40000,
      };

      const result = evaluateInvestment(state, request);

      expect(result.scenarios.length).toBe(2);

      // ---------------------------------------------------------------------
      // Cash Flow Feasibility Buffer Assertion
      // Monthly Surplus = ₹80,500. Proposed SIP = ₹40,000.
      // Buffer = 80,500 - 40,000 = ₹40,500/month remaining.
      // Safety ratio = 40,000 / 80,500 = 49.7% (< 80% ceiling).
      // ---------------------------------------------------------------------
      const scenarioA = result.scenarios.find((s) => s.id === 'scenario-a-target-mix-sip')!;
      expect(scenarioA).toBeDefined();
      expect(scenarioA.name).toBe('Scenario A: Target Mix Split');
      expect(scenarioA.tier2Consequences.monthlyCashFlowBuffer).toBe(40500);

      // Checklist contains the comfortable buffer note
      expect(
        scenarioA.executionChecklist.some((c) =>
          c.includes('Comfortable cash flow buffer: ₹40,500/month')
        )
      ).toBe(true);

      // ---------------------------------------------------------------------
      // Target Mix Split (60% Equity, 30% Debt, 10% Gold)
      // ---------------------------------------------------------------------
      const monthlySplit = scenarioA.tier1Deployment.monthlyCommitmentSplit!;
      expect(monthlySplit).toBeDefined();
      expect(monthlySplit.length).toBe(3);

      const equitySplit = monthlySplit.find((s) => s.category.toLowerCase() === 'equity')!;
      const debtSplit = monthlySplit.find((s) => s.category.toLowerCase() === 'debt')!;
      const goldSplit = monthlySplit.find((s) => s.category.toLowerCase() === 'gold')!;

      // 60% of 40,000 = 24,000
      expect(equitySplit.monthlyAmount).toBe(24000);
      // 30% of 40,000 = 12,000
      expect(debtSplit.monthlyAmount).toBe(12000);
      // 10% of 40,000 = 4,000
      expect(goldSplit.monthlyAmount).toBe(4000);

      expect(
        equitySplit.monthlyAmount + debtSplit.monthlyAmount + goldSplit.monthlyAmount
      ).toBe(40000);

      // Future wealth projection after 5 and 10 years
      expect(scenarioA.tier2Consequences.projectedWealth5Yr).toBeGreaterThan(2500000);
      expect(scenarioA.tier2Consequences.projectedWealth10Yr).toBeGreaterThan(6000000);

      // ---------------------------------------------------------------------
      // Recurring Scenario B: Goal-Targeted Split
      // ---------------------------------------------------------------------
      const scenarioB = result.scenarios.find((s) => s.id === 'scenario-b-goal-targeted-sip')!;
      expect(scenarioB).toBeDefined();
      expect(scenarioB.name).toBe('Scenario B: Goal-Targeted Split');
      expect(scenarioB.tier2Consequences.monthlyCashFlowBuffer).toBe(40500);
      expect(scenarioB.tier2Consequences.goalMilestoneImpact.length).toBe(2);

      // Both P1 goals (Child Education & Retirement) receive accelerated run rates
      const eduMilestone = scenarioB.tier2Consequences.goalMilestoneImpact.find(
        (g) => g.goalId === 'goal-child-edu'
      )!;
      const retMilestone = scenarioB.tier2Consequences.goalMilestoneImpact.find(
        (g) => g.goalId === 'goal-retirement'
      )!;
      expect(eduMilestone.monthsAccelerated).toBeGreaterThan(0);
      expect(retMilestone.monthsAccelerated).toBeGreaterThan(0);
    });
  });
});
