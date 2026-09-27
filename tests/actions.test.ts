// @ts-ignore
import { describe, it, expect } from 'bun:test';
import { getHouseholdStateAction } from '@/lib/actions/household-actions';
import {
  simulateWithdrawalAction,
  simulateInvestmentAction,
} from '@/lib/actions/decision-actions';

describe('Finlight V1 Server Actions', () => {
  it('getHouseholdStateAction loads canonical state and rawData', async () => {
    const result = await getHouseholdStateAction();
    expect(result).toBeDefined();
    expect(result.state).toBeDefined();
    expect(result.rawData).toBeDefined();
    expect(result.state.grossWealth).toBeGreaterThan(0);
    expect(result.state.members.length).toBeGreaterThan(0);
  });

  it('simulateWithdrawalAction returns 4 neutral withdrawal scenarios', async () => {
    const result = await simulateWithdrawalAction({
      amountNeeded: 500000,
      urgency: 'short_term',
    });
    expect(result).toBeDefined();
    expect(result.scenarios.length).toBe(4);
    expect(result.snapshot).toBeDefined();
    expect(result.scenarios[0].tier1Friction.grossProceeds).toBeGreaterThanOrEqual(500000);
  });

  it('simulateInvestmentAction returns lump sum investment scenarios', async () => {
    const result = await simulateInvestmentAction({
      mode: 'lump_sum',
      lumpSumAmount: 500000,
      intendedHorizon: '3-7_years',
    });
    expect(result).toBeDefined();
    expect(result.scenarios.length).toBeGreaterThanOrEqual(1);
    expect(result.snapshot).toBeDefined();
  });

  it('simulateInvestmentAction returns recurring SIP scenarios', async () => {
    const result = await simulateInvestmentAction({
      mode: 'recurring_sip',
      monthlyCommitment: 25000,
      optionalStepUpPct: 10,
    });
    expect(result).toBeDefined();
    expect(result.scenarios.length).toBeGreaterThanOrEqual(1);
  });
});
