/**
 * Finlight V1: Household Loader Test Suite
 * Tests repository loading, state-builder compiler integration, and offline fallback resilience.
 */

// @ts-ignore
import { describe, it, expect } from 'bun:test';
import {
  loadHouseholdData,
  createCanonicalKarmakarFixture,
  CANONICAL_FAMILY_ID,
} from '../../lib/data/household-loader';

describe('Finlight V1: Household Repository Loader (lib/data/household-loader.ts)', () => {
  it('1. Creates canonical Karmakar fixture matching Section 3 specification', () => {
    const fixture = createCanonicalKarmakarFixture();

    expect(fixture.profile.familyId).toBe(CANONICAL_FAMILY_ID);
    expect(fixture.profile.monthlyEssentialExpenses).toBe(110000);
    expect(fixture.profile.monthlyDiscretionaryExpenses).toBe(40000);
    expect(fixture.profile.baseEmergencyMonths).toBe(6);
    expect(fixture.profile.targetAllocation.equityPct).toBe(60);
    expect(fixture.profile.targetAllocation.debtPct).toBe(30);
    expect(fixture.profile.targetAllocation.goldPct).toBe(10);
    expect(fixture.profile.targetAllocation.cashPct).toBe(0);

    // 4 family members
    expect(fixture.members.length).toBe(4);
    const self = fixture.members.find((m) => m.relation === 'Self')!;
    expect(self).toBeDefined();
    expect(self.name).toBe('Abhijit Karmakar');
    expect(self.monthlyIncome).toBe(150000);
    expect(self.riskTolerance).toBe('Moderate');

    // 3 cash accounts total ₹8,50,000
    expect(fixture.cashAccounts.length).toBe(3);
    const totalCash = fixture.cashAccounts.reduce((sum, c) => sum + c.currentBalance, 0);
    expect(totalCash).toBe(850000);

    // 2 liabilities total ₹34,50,000
    expect(fixture.liabilities.length).toBe(2);
    const totalLiab = fixture.liabilities.reduce((sum, l) => sum + l.outstandingBalance, 0);
    expect(totalLiab).toBe(3450000);

    // 6 holdings
    expect(fixture.holdings.length).toBe(6);

    // 7 tax lots
    expect(fixture.taxLots?.length).toBe(7);

    // 3 goals
    expect(fixture.goals?.length).toBe(3);
  });

  it('2. loadHouseholdData falls back cleanly to canonical Karmakar Family when DB is offline or empty', async () => {
    // When called without active DB or non-existent familyId
    const result = await loadHouseholdData('non-existent-family-uuid');

    expect(result).toBeDefined();
    expect(result.rawData).toBeDefined();
    expect(result.state).toBeDefined();

    const { state, rawData } = result;

    // Verify rawData
    expect(rawData.members.length).toBe(4);
    expect(rawData.cashAccounts.length).toBe(3);
    expect(rawData.liabilities.length).toBe(2);
    expect(rawData.holdings.length).toBe(6);

    // Verify deterministic compiled state metrics
    // Inflow: 1.5L + 80k + 40k = 2.7L
    expect(state.monthlyInflow).toBe(270000);
    expect(state.monthlyEssentialExpenses).toBe(110000);
    expect(state.monthlyDiscretionaryExpenses).toBe(40000);
    expect(state.monthlyDebtServicing).toBe(39500); // 31k + 8.5k
    expect(state.monthlySurplus).toBe(80500); // 2.7L - 1.495L - 40k

    // Wealth
    expect(state.liquidWealth).toBe(850000);
    expect(state.fixedWealth).toBe(800000);
    expect(state.investedWealth).toBe(3000000);
    expect(state.grossWealth).toBe(4650000);
    expect(state.totalLiabilities).toBe(3450000);
    expect(state.netWorth).toBe(1200000);

    // Emergency metrics
    expect(state.emergencyReserveTarget).toBe(897000);
    expect(state.emergencyReserveGap).toBe(-47000);
    expect(state.emergencyRunwayMonths).toBeCloseTo(5.69, 1);
    expect(state.decisionAvailableCash).toBe(-47000);

    // Allocation drift
    expect(state.allocationDrift.equity.actualPct).toBeCloseTo(43.01, 1);
    expect(state.allocationDrift.debt.actualPct).toBeCloseTo(30.11, 1);
    expect(state.allocationDrift.gold.actualPct).toBeCloseTo(8.60, 1);
    expect(state.allocationDrift.cash.actualPct).toBeCloseTo(18.28, 1);

    // Tripartite risk
    expect(state.risk.riskCapacity.level).toBe('Moderate');
    expect(state.risk.riskTolerance.level).toBe('Moderate');
    expect(state.risk.riskRequirement.requiredReturnPct).toBeGreaterThan(10);
  });
});
