/**
 * Finlight V1: Household Repository Loader
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md Section 3 & 4
 *
 * Responsibilities:
 * 1. Fetches family, members, cash accounts, liabilities, holdings, tax lots, goals, and profile.
 * 2. Compiles raw rows into the single canonical HouseholdFinancialState snapshot via buildHouseholdState.
 * 3. Enforces zero derived metrics stored in DB; all metrics computed dynamically.
 * 4. Resilient fallback: if database is offline, empty, or inaccessible, falls back cleanly to the
 *    canonical "Karmakar Family" fixture so the app is always functional.
 */

import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db/index';
import {
  families,
  familyMembers,
  financialProfiles,
  cashAccounts,
  liabilities,
  holdings,
  taxLots,
  goals,
  CashAccountRow,
  LiabilityRow,
  HoldingRow,
  TaxLotRow,
} from '@/db/schema';
import {
  RawHouseholdData,
  HouseholdFinancialState,
  HouseholdFinancialProfile,
  FamilyMember,
  CashAccount,
  Liability,
  Holding,
  TaxLot,
  LifeGoal,
} from '@/lib/engine/types';
import { buildHouseholdState } from '@/lib/engine/state-builder';
import {
  CANONICAL_FAMILY_ID,
  createCanonicalKarmakarFixture,
} from './karmakar-fixture';

export { CANONICAL_FAMILY_ID, createCanonicalKarmakarFixture };

/**
 * Repository loader function for Finlight V1.
 * Fetches family, members, cash accounts, liabilities, holdings, tax lots, goals, and profile.
 * Feeds directly into buildHouseholdState(rawData) from lib/engine/state-builder.ts.
 * If no family exists in DB (or DB offline/fallback), falls back cleanly to the canonical household fixture.
 */
export async function loadHouseholdData(familyId?: string): Promise<{
  rawData: RawHouseholdData;
  state: HouseholdFinancialState;
}> {
  try {
    // 1. Resolve family
    const familyCondition = familyId ? eq(families.id, familyId) : undefined;
    const [family] = await db
      .select()
      .from(families)
      .where(familyCondition)
      .limit(1);

    if (!family) {
      console.info('No family found in database. Falling back to canonical Karmakar Family fixture.');
      const rawData = createCanonicalKarmakarFixture();
      return { rawData, state: buildHouseholdState(rawData) };
    }

    const resolvedFamilyId = family.id;

    // 2. Fetch all related records for the family
    const [profileRows, memberRows, goalRows] = await Promise.all([
      db
        .select()
        .from(financialProfiles)
        .where(eq(financialProfiles.familyId, resolvedFamilyId))
        .limit(1),
      db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.familyId, resolvedFamilyId)),
      db
        .select()
        .from(goals)
        .where(eq(goals.familyId, resolvedFamilyId)),
    ]);

    const memberIds = memberRows.map((m) => m.id);

    let cashAccountRows: CashAccountRow[] = [];
    let liabilityRows: LiabilityRow[] = [];
    let holdingRows: HoldingRow[] = [];
    let taxLotRows: TaxLotRow[] = [];

    if (memberIds.length > 0) {
      const [cashRes, liabRes, holdRes] = await Promise.all([
        db.select().from(cashAccounts).where(inArray(cashAccounts.ownerMemberId, memberIds)),
        db.select().from(liabilities).where(inArray(liabilities.ownerMemberId, memberIds)),
        db.select().from(holdings).where(inArray(holdings.ownerMemberId, memberIds)),
      ]);
      cashAccountRows = cashRes;
      liabilityRows = liabRes;
      holdingRows = holdRes;

      const holdingIds = holdingRows.map((h) => h.id);
      if (holdingIds.length > 0) {
        taxLotRows = await db
          .select()
          .from(taxLots)
          .where(inArray(taxLots.holdingId, holdingIds));
      }
    }

    // 3. Map DB rows to Domain Types with explicit numeric conversion
    const profileRow = profileRows[0];
    const profile: HouseholdFinancialProfile = {
      familyId: resolvedFamilyId,
      monthlyEssentialExpenses: Number(profileRow?.monthlyEssentialExpenses ?? 0),
      monthlyDiscretionaryExpenses: Number(profileRow?.monthlyDiscretionaryExpenses ?? 0),
      baseEmergencyMonths: Number(profileRow?.baseEmergencyMonths ?? 6.0),
      emergencyAdjustmentFactors: (profileRow?.emergencyAdjustmentFactors as any) ?? undefined,
      targetAllocation: {
        equityPct: Number(profileRow?.targetEquityPct ?? 60),
        debtPct: Number(profileRow?.targetDebtPct ?? 30),
        goldPct: Number(profileRow?.targetGoldPct ?? 10),
        cashPct: Number(profileRow?.targetCashPct ?? 0),
      },
    };

    const members: FamilyMember[] = memberRows.map((m) => ({
      id: m.id,
      familyId: m.familyId,
      name: m.name,
      relation: m.relation as FamilyMember['relation'],
      age: m.age,
      employmentStatus: m.employmentStatus,
      monthlyIncome: Number(m.monthlyIncome),
      incomeType: m.incomeType as FamilyMember['incomeType'],
      riskTolerance: m.riskTolerance as FamilyMember['riskTolerance'],
      investmentExperience: m.investmentExperience as FamilyMember['investmentExperience'],
    }));

    const cashAccountList: CashAccount[] = cashAccountRows.map((c) => ({
      id: c.id,
      ownerMemberId: c.ownerMemberId,
      institution: c.institution,
      accountName: c.accountName,
      accountType: c.accountType as CashAccount['accountType'],
      currentBalance: Number(c.currentBalance),
      lastUpdatedAt: c.lastUpdatedAt,
    }));

    const liabilityList: Liability[] = liabilityRows.map((l) => ({
      id: l.id,
      ownerMemberId: l.ownerMemberId,
      name: l.name,
      type: l.type as Liability['type'],
      outstandingBalance: Number(l.outstandingBalance),
      interestRatePct: Number(l.interestRatePct),
      monthlyEmi: Number(l.monthlyEmi),
    }));

    const holdingList: Holding[] = holdingRows.map((h) => ({
      id: h.id,
      ownerMemberId: h.ownerMemberId,
      assetType: h.assetType as Holding['assetType'],
      name: h.name,
      identifier: h.identifier,
      totalUnits: Number(h.totalUnits),
      currentPrice: Number(h.currentPrice),
      currentValue: Number(h.currentValue),
      category: h.category as Holding['category'],
      capType: h.capType ?? 'None',
      maturityDate: h.maturityDate,
      interestRatePct: h.interestRatePct != null ? Number(h.interestRatePct) : null,
      exitLoadWindowDays: h.exitLoadWindowDays != null ? Number(h.exitLoadWindowDays) : null,
      exitLoadPct: h.exitLoadPct != null ? Number(h.exitLoadPct) : null,
    }));

    const taxLotList: TaxLot[] = taxLotRows.map((t) => ({
      id: t.id,
      holdingId: t.holdingId,
      purchaseDate: t.purchaseDate,
      units: Number(t.units),
      buyPrice: Number(t.buyPrice),
      remainingUnits: Number(t.remainingUnits),
    }));

    const goalList: LifeGoal[] = goalRows.map((g) => ({
      id: g.id,
      familyId: g.familyId,
      name: g.name,
      priority: g.priority as LifeGoal['priority'],
      targetAmount: Number(g.targetAmount),
      targetYear: g.targetYear,
      linkedHoldingIds: (g.linkedHoldingIds as string[]) || [],
    }));

    const rawData: RawHouseholdData = {
      profile,
      members,
      cashAccounts: cashAccountList,
      liabilities: liabilityList,
      holdings: holdingList,
      taxLots: taxLotList,
      goals: goalList,
    };

    // Feed directly into pure state builder
    const state = buildHouseholdState(rawData);

    return { rawData, state };
  } catch (err) {
    console.warn(
      'Database connection failed or error loading household data; cleanly falling back to canonical Karmakar Family fixture.',
      err
    );
    const rawData = createCanonicalKarmakarFixture();
    return { rawData, state: buildHouseholdState(rawData) };
  }
}
