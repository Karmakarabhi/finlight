'use server';

/**
 * Finlight V1: Household Server Actions
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md
 */

import { loadHouseholdData } from '@/lib/data/household-loader';
import { HouseholdFinancialState, RawHouseholdData } from '@/lib/engine/types';

export interface HouseholdStateActionResult {
  state: HouseholdFinancialState;
  rawData: RawHouseholdData;
}

/**
 * Fetches the canonical household state and raw data for a given familyId.
 * Falls back safely to the canonical Karmakar Family fixture if database is offline.
 */
export async function getHouseholdStateAction(
  familyId?: string
): Promise<HouseholdStateActionResult> {
  const result = await loadHouseholdData(familyId);
  return {
    state: result.state,
    rawData: result.rawData,
  };
}
