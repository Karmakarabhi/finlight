'use server';

/**
 * Finlight V1: Decision Server Actions
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md Section 5 & 6
 */

import { loadHouseholdData } from '@/lib/data/household-loader';
import {
  WithdrawalRequest,
  WithdrawalEngineResult,
  InvestmentRequest,
  InvestmentEngineResult,
} from '@/lib/engine/decision/types';
import { evaluateWithdrawal } from '@/lib/engine/decision/withdrawal-engine';
import { evaluateInvestment } from '@/lib/engine/decision/investment-engine';

/**
 * Simulates withdrawal options against the current household state.
 * Evaluates friction, capital gains tax, exit load, runway impact, and goal delays across 4 neutral scenarios.
 */
export async function simulateWithdrawalAction(
  request: WithdrawalRequest,
  familyId?: string
): Promise<WithdrawalEngineResult> {
  const { state } = await loadHouseholdData(familyId);
  return evaluateWithdrawal(state, request);
}

/**
 * Simulates investment deployment options against the current household state.
 * Evaluates lump sum deployment and recurring SIP planning across safety, debt paydown, allocation drift, and goal milestone acceleration.
 */
export async function simulateInvestmentAction(
  request: InvestmentRequest,
  familyId?: string
): Promise<InvestmentEngineResult> {
  const { state } = await loadHouseholdData(familyId);
  return evaluateInvestment(state, request);
}
