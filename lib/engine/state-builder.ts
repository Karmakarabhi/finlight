/**
 * Finlight V1: Pure State Compiler
 * Compiles raw household records into the canonical HouseholdFinancialState snapshot.
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md
 *
 * NOTE: Pure TypeScript compiler. No DB imports, no React imports, no external API calls.
 */

import {
  RawHouseholdData,
  HouseholdFinancialState,
  ImmutableScenarioSnapshot,
  RiskToleranceLevel,
} from './types';
import {
  calculateGrossWealth,
  calculateNetWorth,
  calculateEmergencyRunway,
  calculateEmergencyReserveTarget,
  calculateDecisionAvailableCash,
  calculateAllocationDrift,
  evaluateTripartiteRisk,
  calculateMonthlyObligations,
  calculateMonthlySurplus,
} from './metrics';

export const ENGINE_VERSION = '1.0.0';
export const TAX_RULE_VERSION = '2024-25';

/**
 * Compiles raw household data into the single canonical in-memory HouseholdFinancialState snapshot.
 * All derived fields, wealth components, emergency metrics, allocation drift, and tripartite risk
 * are computed deterministically.
 */
export function buildHouseholdState(input: RawHouseholdData): HouseholdFinancialState {
  const members = input.members ? [...input.members] : [];
  const cashAccounts = input.cashAccounts ? [...input.cashAccounts] : [];
  const liabilities = input.liabilities ? [...input.liabilities] : [];
  const holdings = input.holdings ? [...input.holdings] : [];
  const taxLots = input.taxLots ? [...input.taxLots] : [];
  const goals = input.goals ? [...input.goals] : [];

  const profile = input.profile || {
    familyId: members[0]?.familyId || 'default-family',
    monthlyEssentialExpenses: 0,
    monthlyDiscretionaryExpenses: 0,
    baseEmergencyMonths: 6,
    targetAllocation: { equityPct: 60, debtPct: 30, goldPct: 10, cashPct: 0 },
  };

  // 1. Cash flow derivations
  const monthlyInflow = Number(
    members.reduce((sum, m) => sum + (Number(m.monthlyIncome) || 0), 0).toFixed(2)
  );
  const monthlyEssentialExpenses = Number(
    (Number(profile.monthlyEssentialExpenses) || 0).toFixed(2)
  );
  const monthlyDebtServicing = Number(
    liabilities.reduce((sum, l) => sum + (Number(l.monthlyEmi) || 0), 0).toFixed(2)
  );
  const monthlyDiscretionaryExpenses = Number(
    (Number(profile.monthlyDiscretionaryExpenses) || 0).toFixed(2)
  );

  const monthlySurplus = calculateMonthlySurplus(
    monthlyInflow,
    monthlyEssentialExpenses,
    monthlyDebtServicing,
    monthlyDiscretionaryExpenses
  );

  // 2. Wealth derivations
  let cashAccountsTotal = 0;
  for (const acc of cashAccounts) {
    cashAccountsTotal += Number(acc.currentBalance) || 0;
  }

  let liquidHoldingsTotal = 0;
  let fixedWealth = 0;
  let investedWealth = 0;

  for (const h of holdings) {
    const val = Number(h.currentValue) || 0;
    const cat = (h.category || '').toLowerCase();
    const assetType = h.assetType;

    if (assetType === 'FD') {
      fixedWealth += val;
    } else if (cat === 'cash') {
      liquidHoldingsTotal += val;
    } else {
      investedWealth += val;
    }
  }

  const liquidWealth = Number((cashAccountsTotal + liquidHoldingsTotal).toFixed(2));
  fixedWealth = Number(fixedWealth.toFixed(2));
  investedWealth = Number(investedWealth.toFixed(2));

  const grossWealth = calculateGrossWealth(liquidWealth, investedWealth, fixedWealth);

  const totalLiabilities = Number(
    liabilities.reduce((sum, l) => sum + (Number(l.outstandingBalance) || 0), 0).toFixed(2)
  );
  const netWorth = calculateNetWorth(grossWealth, totalLiabilities);

  // 3. Emergency & Runway derivations
  const monthlyObligations = calculateMonthlyObligations(
    monthlyEssentialExpenses,
    monthlyDebtServicing
  );
  const baseEmergencyMonths = profile.baseEmergencyMonths ?? 6;

  const emergencyReserveTarget = calculateEmergencyReserveTarget(
    monthlyObligations,
    baseEmergencyMonths,
    profile.emergencyAdjustmentFactors
  );

  // Emergency Reserve Gap = Liquid Cash - Emergency Reserve Target (Spec Section 2.2 line 38)
  const emergencyReserveGap = Number((liquidWealth - emergencyReserveTarget).toFixed(2));
  const emergencyRunwayMonths = calculateEmergencyRunway(liquidWealth, monthlyObligations);

  // Decision-Available Cash
  const protectedEmergencyReserve =
    input.protectedEmergencyReserve !== undefined
      ? input.protectedEmergencyReserve
      : emergencyReserveTarget;

  const decisionAvailableCash = calculateDecisionAvailableCash(
    liquidWealth,
    protectedEmergencyReserve,
    input.nearTermObligations ?? 0
  );

  // 4. Asset Allocation Drift
  const allocationDrift = calculateAllocationDrift(
    holdings,
    cashAccounts,
    profile.targetAllocation
  );

  // 5. Tripartite Risk Evaluation
  const selfMember = members.find((m) => m.relation === 'Self');
  const householdTolerance: RiskToleranceLevel =
    selfMember?.riskTolerance || members[0]?.riskTolerance || 'Moderate';

  const risk = evaluateTripartiteRisk(
    monthlyInflow,
    monthlySurplus,
    emergencyRunwayMonths,
    liabilities,
    members,
    goals,
    householdTolerance,
    investedWealth
  );

  return {
    members,
    cashAccounts,
    liabilities,
    holdings,
    taxLots,
    goals,
    monthlyInflow,
    monthlyEssentialExpenses,
    monthlyDebtServicing,
    monthlyDiscretionaryExpenses,
    monthlySurplus,
    grossWealth,
    investedWealth,
    liquidWealth,
    fixedWealth,
    totalLiabilities,
    netWorth,
    emergencyReserveTarget,
    emergencyReserveGap,
    emergencyRunwayMonths,
    decisionAvailableCash,
    allocationDrift,
    risk,
  };
}

/**
 * Creates an immutable snapshot capturing the exact financial state, request parameters,
 * version stamps, and simulation results for audited record-keeping.
 */
export function createScenarioSnapshot(
  householdState: HouseholdFinancialState,
  requestParams: Record<string, unknown>,
  inputs: Record<string, unknown> = {},
  outputs: Record<string, unknown> = {},
  options?: {
    id?: string;
    engineVersion?: string;
    taxRuleVersion?: string;
  }
): ImmutableScenarioSnapshot {
  return {
    id: options?.id,
    householdState,
    requestParams: typeof structuredClone === 'function' ? structuredClone(requestParams) : JSON.parse(JSON.stringify(requestParams)),
    engineVersion: options?.engineVersion || ENGINE_VERSION,
    taxRuleVersion: options?.taxRuleVersion || TAX_RULE_VERSION,
    inputs: typeof structuredClone === 'function' ? structuredClone(inputs) : JSON.parse(JSON.stringify(inputs)),
    outputs: typeof structuredClone === 'function' ? structuredClone(outputs) : JSON.parse(JSON.stringify(outputs)),
    createdAt: new Date().toISOString(),
  };
}
