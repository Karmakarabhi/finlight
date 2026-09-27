/**
 * Finlight V1: Indian Tax Engine - Canonical Type Definitions
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md and Finance Act 2024.
 *
 * NOTE: Pure TypeScript definitions. No DB imports, no React imports, no external API calls.
 */

import { AssetType, AssetCategory, TaxLot } from '../types';

export type LotMatchingStrategy = 'FIFO' | 'LIFO' | 'SPECIFIC_LOT' | 'TAX_MINIMIZED';

/**
 * Result of matching a tax lot tranche during redemption simulation.
 */
export interface MatchedLotResult {
  lotId: string;
  purchaseDate: Date;
  unitsRedeemed: number;
  buyPrice: number;
  currentNav: number;
  holdingPeriodDays: number;
  isLongTerm: boolean;
  capitalGain: number;
}

/**
 * Optional parameters for matching lots (e.g., NAV, valuation date, specific lot sequence).
 */
export interface LotMatchingOptions {
  currentNav?: number;
  asOfDate?: Date | string;
  specificLotIds?: string[];
  longTermThresholdDays?: number;
}

/**
 * Pluggable lot matcher interface for redemption simulation.
 */
export interface ILotMatcher {
  matchLots(
    lots: TaxLot[],
    unitsNeeded: number,
    strategy?: LotMatchingStrategy,
    options?: LotMatchingOptions | number
  ): MatchedLotResult[];
}

/**
 * Optional evaluation options for tax calculation (exit loads, penalties, fund classification).
 */
export interface TaxEvaluationOptions {
  category?: AssetCategory;
  isDebtFund?: boolean;
  exitLoadWindowDays?: number;
  exitLoadPct?: number; // e.g., 1 for 1%
  preClosurePenaltyPct?: number; // e.g., 1 for 1%
  isPrematureWithdrawal?: boolean;
  holdingMaturityDate?: Date | string;
  asOfDate?: Date | string;
}

/**
 * Result of capital gains and direct friction tax evaluation.
 * Aligns with two-tier consequence modeling in Finlight V1.
 */
export interface TaxEvaluationResult {
  grossProceeds: number;
  totalCapitalGain: number;
  stcgGain: number;
  stcgTax: number;
  ltcgGain: number;
  ltcgTaxable: number;
  ltcgTax: number;
  slabTax: number;
  cessAndSurcharge: number; // 4% health & education cess applied to tax
  estimatedTaxImpact: number; // Always labeled Estimated Tax Impact
  exitLoads: number; // Applicable exit loads if holding period < exitLoadWindowDays
  preClosurePenalties: number; // Premature withdrawal penalty for FDs
  totalDirectFriction: number; // estimatedTaxImpact + exitLoads + preClosurePenalties
  netCashRealized: number; // grossProceeds - totalDirectFriction
  appliedRules: string[]; // Audit trail of rules triggered
}

/**
 * Versioned tax rule set interface for pluggable tax regimes.
 */
export interface TaxRuleSet {
  version: string;
  financialYear: string;
  evaluateGains(
    matches: MatchedLotResult[],
    assetType: AssetType,
    ownerTaxSlabPct: number,
    remainingAnnualExemption: number,
    options?: TaxEvaluationOptions
  ): TaxEvaluationResult;
}
