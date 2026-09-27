/**
 * Finlight V1: Indian Tax Engine - FY 2024-25 Rules Implementation
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md and Finance Act 2024.
 *
 * NOTE: Pure TypeScript. Zero DB imports, zero React imports, zero external API calls.
 */

import { AssetType } from '../types';
import {
  TaxRuleSet,
  MatchedLotResult,
  TaxEvaluationResult,
  TaxEvaluationOptions,
} from './types';

export const FY2024_25_VERSION = '2024-25';
export const EQUITY_LTCG_EXEMPTION_FY2425 = 125000; // ₹1,25,000 Section 112A annual exemption
export const EQUITY_LTCG_RATE = 0.125; // 12.5% post-Finance Act 2024
export const EQUITY_STCG_RATE = 0.20; // 20% Section 111A post-Finance Act 2024
export const GOLD_LTCG_RATE = 0.125; // 12.5% Section 112 post-Finance Act 2024
export const HEALTH_AND_EDUCATION_CESS_RATE = 0.04; // 4% Health & Education Cess
export const EQUITY_HOLDING_DAYS_THRESHOLD = 365; // > 365 days = Long Term
export const GOLD_HOLDING_DAYS_THRESHOLD = 730; // > 730 days (24 months) = Long Term

/**
 * Tax rule set implementation for Indian Financial Year 2024-25 (Post-Finance Act 2024).
 */
export class TaxRuleSet202425 implements TaxRuleSet {
  readonly version: string = FY2024_25_VERSION;
  readonly financialYear: string = '2024-25';

  /**
   * Evaluates capital gains, slab taxes, exit loads, penalties, and net cash realized
   * across a set of matched redemption lots according to FY 2024-25 tax provisions.
   */
  evaluateGains(
    matches: MatchedLotResult[],
    assetType: AssetType,
    ownerTaxSlabPct: number,
    remainingAnnualExemption: number = EQUITY_LTCG_EXEMPTION_FY2425,
    options?: TaxEvaluationOptions
  ): TaxEvaluationResult {
    const appliedRules: string[] = [];

    if (!matches || matches.length === 0) {
      return {
        grossProceeds: 0,
        totalCapitalGain: 0,
        stcgGain: 0,
        stcgTax: 0,
        ltcgGain: 0,
        ltcgTaxable: 0,
        ltcgTax: 0,
        slabTax: 0,
        cessAndSurcharge: 0,
        estimatedTaxImpact: 0,
        exitLoads: 0,
        preClosurePenalties: 0,
        totalDirectFriction: 0,
        netCashRealized: 0,
        appliedRules: ['No lots provided for redemption evaluation.'],
      };
    }

    // Normalize owner marginal tax slab (handles 30 as 0.30 or 0.30 as 0.30)
    const slabRate = ownerTaxSlabPct > 1 ? ownerTaxSlabPct / 100 : Math.max(0, ownerTaxSlabPct);
    const slabDisplayPct = (slabRate * 100).toFixed(0);

    // 1. Calculate Gross Proceeds
    const rawGrossProceeds = matches.reduce((sum, m) => sum + m.unitsRedeemed * m.currentNav, 0);
    const grossProceeds = Math.round(rawGrossProceeds * 100) / 100;

    // 2. Calculate Exit Loads
    let exitLoads = 0;
    const exitLoadWindowDays = options?.exitLoadWindowDays ?? 0;
    const rawExitLoadPct = options?.exitLoadPct ?? 0;
    // exitLoadPct is given as percentage points (e.g. 1.0 for 1%, 0.5 for 0.5%)
    const exitLoadRate = Math.max(0, rawExitLoadPct) / 100;

    if (exitLoadWindowDays > 0 && exitLoadRate > 0) {
      let applicableExitLoad = 0;
      for (const m of matches) {
        if (m.holdingPeriodDays < exitLoadWindowDays) {
          applicableExitLoad += m.unitsRedeemed * m.currentNav * exitLoadRate;
        }
      }
      exitLoads = Math.round(applicableExitLoad * 100) / 100;
      if (exitLoads > 0) {
        appliedRules.push(
          `Exit load of ${(exitLoadRate * 100).toFixed(1)}% applied to lots held < ${exitLoadWindowDays} days: ₹${exitLoads.toFixed(2)}`
        );
      }
    }

    // 3. Pre-Closure Penalties (for FDs)
    let preClosurePenalties = 0;
    if (assetType === 'FD') {
      const isPremature = options?.isPrematureWithdrawal ?? false;
      if (isPremature) {
        // preClosurePenaltyPct is given as percentage points (e.g. 1.0 for 1%, 0.5 for 0.5%)
        const rawPenalty = options?.preClosurePenaltyPct !== undefined ? options.preClosurePenaltyPct : 1.0;
        const penaltyRate = Math.max(0, rawPenalty) / 100;
        preClosurePenalties = Math.round(grossProceeds * penaltyRate * 100) / 100;
        appliedRules.push(
          `FD Premature Withdrawal Penalty: ${(penaltyRate * 100).toFixed(1)}% applied to gross proceeds: ₹${preClosurePenalties.toFixed(2)}`
        );
      }
    }

    // 4. Asset-Specific Gains & Tax Calculation
    const isDebt =
      options?.category === 'debt' ||
      options?.isDebtFund === true ||
      (assetType as string).toUpperCase() === 'DEBT';

    const isGold = assetType === 'Gold' || options?.category === 'gold';

    let stcgGain = 0;
    let ltccgGain = 0;
    let ltcgTaxable = 0;
    let stcgTax = 0;
    let ltcgTax = 0;
    let slabTax = 0;

    const totalRawGain = matches.reduce((sum, m) => sum + m.capitalGain, 0);
    const totalCapitalGain = Math.round(totalRawGain * 100) / 100;

    if (assetType === 'FD') {
      // Fixed Deposits: Accrued interest taxed at owner's marginal slab rate
      if (totalCapitalGain > 0) {
        slabTax = Math.round(totalCapitalGain * slabRate * 100) / 100;
        appliedRules.push(
          `Fixed Deposit interest of ₹${totalCapitalGain.toFixed(2)} taxed as ordinary income at marginal slab rate (${slabDisplayPct}%): ₹${slabTax.toFixed(2)}`
        );
      }
    } else if (assetType === 'MF' && isDebt) {
      // Debt Mutual Funds: Post-April 2023 (Section 50AA) - all gains treated as short-term / ordinary slab rate
      stcgGain = Math.max(0, totalCapitalGain);
      if (stcgGain > 0) {
        slabTax = Math.round(stcgGain * slabRate * 100) / 100;
        appliedRules.push(
          `Section 50AA (Post-April 2023): Debt Mutual Fund gains of ₹${stcgGain.toFixed(2)} treated as short-term and taxed at marginal slab rate (${slabDisplayPct}%): ₹${slabTax.toFixed(2)}`
        );
      }
    } else if (isGold) {
      // Gold (Physical & Gold ETF): Holding period > 730 days (24 months) = LTCG (12.5%), <= 730 days = marginal slab rate
      let stcg = 0;
      let ltcg = 0;

      for (const m of matches) {
        if (m.holdingPeriodDays > GOLD_HOLDING_DAYS_THRESHOLD) {
          ltcg += m.capitalGain;
        } else {
          stcg += m.capitalGain;
        }
      }

      stcgGain = Math.round(stcg * 100) / 100;
      ltccgGain = Math.round(ltcg * 100) / 100;

      if (ltccgGain > 0) {
        // Gold LTCG taxed at 12.5% under Section 112 (no 1.25L 112A exemption)
        ltcgTaxable = ltccgGain;
        ltcgTax = Math.round(ltcgTaxable * GOLD_LTCG_RATE * 100) / 100;
        appliedRules.push(
          `Finance Act 2024 Section 112: Gold held > 730 days classified as LTCG (₹${ltccgGain.toFixed(2)}), taxed at 12.5%: ₹${ltcgTax.toFixed(2)}`
        );
      }

      if (stcgGain > 0) {
        // Gold STCG taxed at marginal slab rate
        slabTax = Math.round(stcgGain * slabRate * 100) / 100;
        appliedRules.push(
          `Finance Act 2024: Gold held <= 730 days classified as STCG (₹${stcgGain.toFixed(2)}), taxed at marginal slab rate (${slabDisplayPct}%): ₹${slabTax.toFixed(2)}`
        );
      }
    } else {
      // Equity MFs, Listed Stocks, & Equity ETFs
      let stcg = 0;
      let ltcg = 0;

      for (const m of matches) {
        if (m.holdingPeriodDays > EQUITY_HOLDING_DAYS_THRESHOLD) {
          ltcg += m.capitalGain;
        } else {
          stcg += m.capitalGain;
        }
      }

      stcgGain = Math.round(stcg * 100) / 100;
      ltccgGain = Math.round(ltcg * 100) / 100;

      // STCG: 20% on short-term gains (Section 111A post-FA 2024)
      if (stcgGain > 0) {
        stcgTax = Math.round(stcgGain * EQUITY_STCG_RATE * 100) / 100;
        appliedRules.push(
          `Finance Act 2024 Section 111A: Equity STCG (<= 365 days) of ₹${stcgGain.toFixed(2)} taxed at 20%: ₹${stcgTax.toFixed(2)}`
        );
      }

      // LTCG: 12.5% on gains exceeding available ₹1,25,000 exemption (Section 112A post-FA 2024)
      if (ltccgGain > 0) {
        const availableExemption = Math.max(0, remainingAnnualExemption);
        const exemptionUtilized = Math.min(ltccgGain, availableExemption);
        ltcgTaxable = Math.max(0, Math.round((ltccgGain - exemptionUtilized) * 100) / 100);
        ltcgTax = Math.round(ltcgTaxable * EQUITY_LTCG_RATE * 100) / 100;

        appliedRules.push(
          `Finance Act 2024 Section 112A: Equity LTCG (> 365 days) of ₹${ltccgGain.toFixed(2)}: ₹${exemptionUtilized.toFixed(2)} exempt under ₹1.25L annual limit, taxable ₹${ltcgTaxable.toFixed(2)} at 12.5%: ₹${ltcgTax.toFixed(2)}`
        );
      } else if (ltccgGain === 0 && stcgGain === 0) {
        appliedRules.push('No capital gains realized across equity lots.');
      }
    }

    // 5. Cess and Surcharge (4% Health & Education Cess)
    const baseTax = Math.round((stcgTax + ltcgTax + slabTax) * 100) / 100;
    const cessAndSurcharge = Math.round(baseTax * HEALTH_AND_EDUCATION_CESS_RATE * 100) / 100;

    // Estimated Tax Impact (always labeled Estimated Tax Impact)
    const estimatedTaxImpact = Math.round((baseTax + cessAndSurcharge) * 100) / 100;

    if (baseTax > 0) {
      appliedRules.push(
        `Health & Education Cess: 4% applied to base tax of ₹${baseTax.toFixed(2)}: ₹${cessAndSurcharge.toFixed(2)}`
      );
    }

    // 6. Direct Friction and Net Cash Realized
    const totalDirectFriction = Math.round((estimatedTaxImpact + exitLoads + preClosurePenalties) * 100) / 100;
    const netCashRealized = Math.round((grossProceeds - totalDirectFriction) * 100) / 100;

    return {
      grossProceeds,
      totalCapitalGain,
      stcgGain,
      stcgTax,
      ltcgGain: ltccgGain,
      ltcgTaxable,
      ltcgTax,
      slabTax,
      cessAndSurcharge,
      estimatedTaxImpact,
      exitLoads,
      preClosurePenalties,
      totalDirectFriction,
      netCashRealized,
      appliedRules,
    };
  }
}

/**
 * Default singleton instance of FY 2024-25 Indian tax rules.
 */
export const defaultTaxRuleSet202425 = new TaxRuleSet202425();
