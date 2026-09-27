/**
 * Finlight V1: Tax Lot Matcher Engine
 * Implements ILotMatcher for simulation of lot redemptions with FIFO, LIFO, SPECIFIC_LOT, and TAX_MINIMIZED strategies.
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md.
 *
 * NOTE: Pure TypeScript. No DB imports, no React imports, no external API calls.
 */

import { TaxLot } from '../types';
import {
  ILotMatcher,
  LotMatchingStrategy,
  MatchedLotResult,
  LotMatchingOptions,
} from './types';

/**
 * Pure lot matching engine implementing ILotMatcher.
 */
export class LotMatcher implements ILotMatcher {
  /**
   * Matches tax lots against units needed based on the selected matching strategy.
   *
   * @param lots Available tax lots for the holding
   * @param unitsNeeded Number of units to redeem
   * @param strategy Lot matching strategy (defaults to 'FIFO')
   * @param options Additional options or numeric currentNav
   * @returns Array of matched lot results
   * @throws Error if requested units exceed total available units across lots
   */
  matchLots(
    lots: TaxLot[],
    unitsNeeded: number,
    strategy: LotMatchingStrategy = 'FIFO',
    options?: LotMatchingOptions | number
  ): MatchedLotResult[] {
    if (unitsNeeded < 0) {
      throw new Error('unitsNeeded must be greater than or equal to 0');
    }

    if (unitsNeeded === 0) {
      return [];
    }

    // Resolve options
    let currentNav: number | undefined;
    let asOfDate = new Date();
    let specificLotIds: string[] | undefined;
    let longTermThresholdDays = 365;

    if (typeof options === 'number') {
      currentNav = options;
    } else if (options && typeof options === 'object') {
      currentNav = options.currentNav;
      if (options.asOfDate) {
        asOfDate = options.asOfDate instanceof Date ? options.asOfDate : new Date(options.asOfDate);
      }
      specificLotIds = options.specificLotIds;
      if (options.longTermThresholdDays !== undefined) {
        longTermThresholdDays = options.longTermThresholdDays;
      }
    }

    // Validate available units
    const totalAvailable = lots.reduce((sum, lot) => {
      const avail = lot.remainingUnits !== undefined ? lot.remainingUnits : lot.units;
      return sum + Math.max(0, avail);
    }, 0);

    if (unitsNeeded > totalAvailable + 1e-7) {
      throw new Error(
        `Insufficient units available for redemption: requested ${unitsNeeded}, but only ${totalAvailable} units available across ${lots.length} lot(s).`
      );
    }

    // Clone lots to avoid mutating input array
    const sortedLots = [...lots].filter((lot) => {
      const avail = lot.remainingUnits !== undefined ? lot.remainingUnits : lot.units;
      return avail > 1e-9;
    });

    // Sort according to strategy
    switch (strategy) {
      case 'LIFO':
        sortedLots.sort((a, b) => {
          const timeA = new Date(a.purchaseDate).getTime();
          const timeB = new Date(b.purchaseDate).getTime();
          if (timeB !== timeA) return timeB - timeA;
          return a.id.localeCompare(b.id);
        });
        break;

      case 'SPECIFIC_LOT':
        if (specificLotIds && specificLotIds.length > 0) {
          const idMap = new Map<string, number>();
          specificLotIds.forEach((id, idx) => idMap.set(id, idx));
          sortedLots.sort((a, b) => {
            const idxA = idMap.has(a.id) ? idMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
            const idxB = idMap.has(b.id) ? idMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
            if (idxA !== idxB) return idxA - idxB;
            return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
          });
        }
        // If no specificLotIds passed, preserve the existing order of lots
        break;

      case 'TAX_MINIMIZED':
        // Redeem lots with highest buy price first to minimize capital gains
        sortedLots.sort((a, b) => {
          if (b.buyPrice !== a.buyPrice) return b.buyPrice - a.buyPrice;
          return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        });
        break;

      case 'FIFO':
      default:
        // Default FIFO: Oldest purchase date first
        sortedLots.sort((a, b) => {
          const timeA = new Date(a.purchaseDate).getTime();
          const timeB = new Date(b.purchaseDate).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return a.id.localeCompare(b.id);
        });
        break;
    }

    const results: MatchedLotResult[] = [];
    let remainingNeeded = unitsNeeded;

    for (const lot of sortedLots) {
      const availableInLot = Math.max(0, lot.remainingUnits !== undefined ? lot.remainingUnits : lot.units);
      if (availableInLot <= 1e-9) continue;

      const unitsToRedeem = Math.min(availableInLot, remainingNeeded);
      const purchaseDate = lot.purchaseDate instanceof Date ? lot.purchaseDate : new Date(lot.purchaseDate);
      const diffMs = asOfDate.getTime() - purchaseDate.getTime();
      const holdingPeriodDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const isLongTerm = holdingPeriodDays > longTermThresholdDays;

      const nav = currentNav !== undefined ? currentNav : lot.buyPrice;
      const capitalGain = Math.round((nav - lot.buyPrice) * unitsToRedeem * 100) / 100;

      results.push({
        lotId: lot.id,
        purchaseDate,
        unitsRedeemed: Math.round(unitsToRedeem * 1e6) / 1e6,
        buyPrice: lot.buyPrice,
        currentNav: nav,
        holdingPeriodDays,
        isLongTerm,
        capitalGain,
      });

      remainingNeeded -= unitsToRedeem;
      if (remainingNeeded <= 1e-9) {
        break;
      }
    }

    return results;
  }
}

/**
 * Default singleton instance of the LotMatcher.
 */
export const defaultLotMatcher = new LotMatcher();

/**
 * Functional convenience wrapper for matching tax lots.
 */
export function matchLots(
  lots: TaxLot[],
  unitsNeeded: number,
  strategy: LotMatchingStrategy = 'FIFO',
  options?: LotMatchingOptions | number
): MatchedLotResult[] {
  return defaultLotMatcher.matchLots(lots, unitsNeeded, strategy, options);
}
