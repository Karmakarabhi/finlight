/**
 * Finlight V1: Canonical Domain Model & Type Definitions
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md
 *
 * NOTE: Pure TypeScript definitions. No DB imports, no React imports, no external API calls.
 */

export type FamilyRelation = 'Self' | 'Spouse' | 'Father' | 'Mother' | 'Child' | 'Other' | string;

export type EmploymentStatus =
  | 'employed'
  | 'self_employed'
  | 'retired'
  | 'student'
  | 'homemaker'
  | 'unemployed'
  | string;

export type IncomeType = 'stable' | 'variable';

export type RiskToleranceLevel = 'Conservative' | 'Moderate' | 'Aggressive';

export type InvestmentExperience = 'beginner' | 'intermediate' | 'expert' | string;

/**
 * 1. FamilyMember
 * Represents an individual member of the household whose finances are managed by the Family CFO.
 */
export interface FamilyMember {
  id: string;
  familyId: string;
  name: string;
  relation: FamilyRelation;
  age: number;
  employmentStatus: EmploymentStatus;
  monthlyIncome: number;
  incomeType: IncomeType;
  riskTolerance: RiskToleranceLevel;
  investmentExperience: InvestmentExperience;
}

export type CashAccountType = 'savings' | 'auto_sweep' | 'liquid_fund';

/**
 * 2. CashAccount
 * Represents first-class liquid cash instruments (T+0 / T+1 settlement, 0% exit friction).
 */
export interface CashAccount {
  id: string;
  ownerMemberId: string;
  institution: string;
  accountName: string;
  accountType: CashAccountType;
  currentBalance: number;
  lastUpdatedAt?: Date | string;
}

export type LiabilityType = 'home' | 'auto' | 'personal' | 'credit';

/**
 * 3. Liability
 * Represents household debts and loans requiring recurring servicing (EMIs).
 */
export interface Liability {
  id: string;
  ownerMemberId: string;
  name: string;
  type: LiabilityType;
  outstandingBalance: number;
  interestRatePct: number;
  monthlyEmi: number;
}

export type AssetType = 'MF' | 'Stock' | 'ETF' | 'FD' | 'Gold';

export type AssetCategory = 'equity' | 'debt' | 'gold' | 'cash' | 'hybrid';

/**
 * 4. Holding / FinancialAsset
 * Represents market-linked investments and contractual fixed deposits.
 */
export interface Holding {
  id: string;
  ownerMemberId: string;
  assetType: AssetType;
  name: string;
  identifier: string; // AMFI code, NSE/BSE symbol, or account number
  totalUnits: number;
  currentPrice: number;
  currentValue: number;
  maturityDate?: Date | string | null;
  interestRatePct?: number | null;
  exitLoadWindowDays?: number | null;
  exitLoadPct?: number | null;
  category: AssetCategory;
  capType?: string | null;
}

export type FinancialAsset = Holding;

/**
 * 5. TaxLot
 * Represents individual purchase tranches for FIFO redemption and tax matching.
 */
export interface TaxLot {
  id: string;
  holdingId: string;
  purchaseDate: Date | string;
  units: number;
  buyPrice: number;
  remainingUnits: number;
}

export type GoalPriority = 'P1' | 'P2' | 'P3';

/**
 * 6. LifeGoal
 * Specific milestones the family is saving/investing toward.
 */
export interface LifeGoal {
  id: string;
  familyId: string;
  name: string;
  priority: GoalPriority;
  targetAmount: number;
  targetYear: number;
  linkedHoldingIds: string[];
}

/**
 * Emergency Adjustment Factors for household reserve targets.
 */
export interface EmergencyAdjustmentFactors {
  variableIncomeMonths?: number;
  dependentsMonths?: number;
  singleIncomeMonths?: number;
  customMonths?: number;
  multiplier?: number;
  [key: string]: number | undefined;
}

/**
 * Target Asset Allocation Percentages.
 */
export interface TargetAllocation {
  equityPct: number;
  debtPct: number;
  goldPct: number;
  cashPct: number;
  [key: string]: number | undefined;
}

/**
 * 7. HouseholdFinancialProfile
 * Household-level operational configuration and expense thresholds.
 */
export interface HouseholdFinancialProfile {
  familyId: string;
  monthlyEssentialExpenses: number;
  monthlyDiscretionaryExpenses: number;
  baseEmergencyMonths: number;
  emergencyAdjustmentFactors?: EmergencyAdjustmentFactors;
  targetAllocation: TargetAllocation;
}

export type RiskCapacityLevel = 'Low' | 'Moderate' | 'High';

/**
 * 8. TripartiteRiskProfile
 * Separates risk into three non-collapsible dimensions: Capacity, Tolerance, Requirement.
 */
export interface TripartiteRiskProfile {
  riskCapacity: {
    level: RiskCapacityLevel;
    rationale: string[];
  };
  riskTolerance: {
    level: RiskToleranceLevel;
  };
  riskRequirement: {
    requiredReturnPct: number;
    rationale: string;
  };
}

/**
 * Allocation Drift Item for an individual asset category.
 */
export interface AllocationDriftItem {
  targetPct: number;
  actualPct: number;
  driftPct: number;
  deficitRupees: number;
}

/**
 * 9. HouseholdFinancialState
 * The single canonical compiled in-memory snapshot of the household's entire financial state.
 */
export interface HouseholdFinancialState {
  members: FamilyMember[];
  cashAccounts: CashAccount[];
  liabilities: Liability[];
  holdings: Holding[];
  taxLots: TaxLot[];
  goals: LifeGoal[];
  monthlyInflow: number;
  monthlyEssentialExpenses: number;
  monthlyDebtServicing: number;
  monthlyDiscretionaryExpenses: number;
  monthlySurplus: number;
  grossWealth: number;
  investedWealth: number;
  liquidWealth: number;
  fixedWealth: number;
  totalLiabilities: number;
  netWorth: number;
  emergencyReserveTarget: number;
  emergencyReserveGap: number;
  emergencyRunwayMonths: number;
  decisionAvailableCash: number;
  allocationDrift: Record<string, AllocationDriftItem>;
  risk: TripartiteRiskProfile;
}

/**
 * 10. ImmutableScenarioSnapshot
 * Preserves the exact state, params, engine version, and results for audited decision simulations.
 */
export interface ImmutableScenarioSnapshot {
  id?: string;
  householdState: HouseholdFinancialState;
  requestParams: Record<string, unknown>;
  engineVersion: string;
  taxRuleVersion: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  createdAt?: Date | string;
}

/**
 * Raw input payload consumed by the State Compiler.
 */
export interface RawHouseholdData {
  profile: HouseholdFinancialProfile;
  members: FamilyMember[];
  cashAccounts: CashAccount[];
  liabilities: Liability[];
  holdings: Holding[];
  taxLots?: TaxLot[];
  goals?: LifeGoal[];
  nearTermObligations?: number;
  protectedEmergencyReserve?: number;
}
