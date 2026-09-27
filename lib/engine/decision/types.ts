/**
 * Finlight V1: Decision Engine Domain Type Definitions
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md
 *
 * NOTE: Pure TypeScript definitions. No DB imports, no React imports, no external API calls.
 */

import { ImmutableScenarioSnapshot } from '../types';

export type WithdrawalUrgency = 'immediate' | 'short_term' | 'flexible';

export interface WithdrawalRequest {
  amountNeeded: number;
  urgency: WithdrawalUrgency;
  scopedMemberIds?: string[];
  purpose?: string;
}

export type WithdrawalScenarioName =
  | 'Scenario A: Use Cash'
  | 'Scenario B: Break FD'
  | 'Scenario C: Redeem Mutual Fund'
  | 'Scenario D: Cash + MF'
  | string;

export type RunwayStatus = 'Safe' | 'Warning' | 'Critical';

export interface Tier1Friction {
  grossProceeds: number;
  estimatedTaxImpact: number;
  exitLoads: number;
  preClosurePenalties: number;
  totalDirectFriction: number;
  netCashReceived: number;
  settlementTime: string;
}

export interface AllocationDriftChangeItem {
  category: string;
  driftBefore: number;
  driftAfter: number;
}

export interface GoalImpactItem {
  goalId: string;
  goalName: string;
  priority: string;
  delayMonths: number;
  fundingShortfallRupees: number;
}

export interface Tier2Consequences {
  emergencyRunwayBefore: number;
  emergencyRunwayAfter: number;
  runwayStatus: RunwayStatus;
  allocationDriftChange: AllocationDriftChangeItem[];
  goalImpact: GoalImpactItem[];
  liquidityPositionAfter: number;
}

export interface WithdrawalScenario {
  id: string;
  name: WithdrawalScenarioName;
  sourceDescription: string;
  tier1Friction: Tier1Friction;
  tier2Consequences: Tier2Consequences;
  executionChecklist: string[];
  isViable: boolean;
  constraintViolations: string[];
}

export interface WithdrawalEngineResult {
  request: WithdrawalRequest;
  scenarios: WithdrawalScenario[];
  hasCleanScenario: boolean;
  constraintSummary?: string;
  adjustableParametersGuide?: string[];
  snapshot: ImmutableScenarioSnapshot;
}

export type InvestmentMode = 'lump_sum' | 'recurring_sip';

export type InvestmentHorizon = '<3_years' | '3-7_years' | '>7_years';

export interface InvestmentRequest {
  mode: InvestmentMode;
  lumpSumAmount?: number;
  monthlyCommitment?: number;
  optionalStepUpPct?: number;
  intendedHorizon?: InvestmentHorizon;
  source?: string;
  scopedMemberIds?: string[];
}

export interface AssetDeploymentItem {
  category: string;
  amount: number;
  suggestedInstrumentType: string;
}

export interface MonthlyCommitmentSplitItem {
  category: string;
  monthlyAmount: number;
}

export interface Tier1InvestmentDeployment {
  safetyReserveAllocation: number;
  debtPrepaymentAllocation: number;
  assetDeployments: AssetDeploymentItem[];
  monthlyCommitmentSplit?: MonthlyCommitmentSplitItem[];
}

export interface GoalMilestoneImpactItem {
  goalId: string;
  goalName: string;
  monthsAccelerated: number;
  gapReducedRupees: number;
}

export interface Tier2InvestmentConsequences {
  emergencyRunwayBefore: number;
  emergencyRunwayAfter: number;
  guaranteedInterestSaved: number;
  allocationDriftChange: AllocationDriftChangeItem[];
  monthlyCashFlowBuffer: number;
  goalMilestoneImpact: GoalMilestoneImpactItem[];
  projectedWealth5Yr: number;
  projectedWealth10Yr: number;
}

export interface InvestmentScenario {
  id: string;
  name: string;
  tier1Deployment: Tier1InvestmentDeployment;
  tier2Consequences: Tier2InvestmentConsequences;
  executionChecklist: string[];
}

export interface InvestmentEngineResult {
  request: InvestmentRequest;
  scenarios: InvestmentScenario[];
  snapshot: ImmutableScenarioSnapshot;
}
