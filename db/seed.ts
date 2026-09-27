/**
 * Finlight V1: Canonical Local Database Seed Script
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md Section 3 & 4
 *
 * Seeds the canonical "Karmakar Family" household fixture:
 * - Family: Karmakar Family (INR)
 * - User: Abhijit Karmakar (CFO)
 * - Financial Profile: ₹1.1L essential, ₹40k discretionary, 6m reserve, 60/30/10 target
 * - Family Members: Self, Spouse, Father, Mother
 * - Cash Accounts: HDFC (₹4.5L), ICICI (₹2.2L), SBI (₹1.8L) -> Total ₹8.5L
 * - Liabilities: Home Loan (₹32L @ 8.5%), Personal Loan (₹2.5L @ 13.5%) -> Total ₹34.5L
 * - Fixed Deposits: HDFC FD (₹5L @ 7.1%), SBI FD (₹3L @ 7.0%) -> Total ₹8L
 * - Holdings & Lots:
 *   - Parag Parikh Flexi Cap Fund (Equity MF, 10,000 units, Lot 1 LTCG, Lot 2 STCG)
 *   - Mirae Asset Large Cap Fund (Equity MF, 8,000 units, LTCG)
 *   - HDFC Short Term Debt Fund (Debt MF, 12,000 units, Sec 50AA slab)
 *   - Nippon India Gold ETF (Gold, 5,000 units, LTCG)
 * - Goals:
 *   - Child Education (P1, ₹35L, 2032)
 *   - Retirement (P1, ₹2.5Cr, 2045)
 *   - Family Vacation (P3, ₹4L, 2027)
 * - Price Cache: AMFI NAV entries for mutual funds and ETF
 */

import { eq } from 'drizzle-orm';
import { db } from './index';
import {
  families,
  users,
  financialProfiles,
  familyMembers,
  cashAccounts,
  liabilities,
  holdings,
  taxLots,
  goals,
  priceCache,
} from './schema';
import { CANONICAL_FAMILY_ID } from '../lib/data/household-loader';

async function seed() {
  console.log('🌱 Starting Finlight V1 canonical household seeding...');

  try {
    // 1. Clean existing seed data idempotently
    console.log('Cleaning existing canonical family record if present...');
    await db.delete(families).where(eq(families.id, CANONICAL_FAMILY_ID));

    // 2. Insert Family
    console.log('Inserting family: Karmakar Family...');
    await db.insert(families).values({
      id: CANONICAL_FAMILY_ID,
      name: 'Karmakar Family',
      currency: 'INR',
    });

    // 3. Insert User (Family CFO)
    console.log('Inserting user: Abhijit Karmakar (CFO)...');
    await db.insert(users).values({
      id: '22222222-2222-2222-2222-222222222222',
      familyId: CANONICAL_FAMILY_ID,
      email: 'abhijit@finlight.local',
      passwordHash: '$2b$10$e8V/ySgY2B6oM0RKnP81ceG8G1vU14oKk14fB1f2a3c4d5e6f7g8h', // mock hash
      name: 'Abhijit Karmakar',
      role: 'CFO',
    });

    // 4. Insert Financial Profile
    console.log('Inserting financial profile...');
    await db.insert(financialProfiles).values({
      id: '33333333-3333-3333-3333-333333333333',
      familyId: CANONICAL_FAMILY_ID,
      monthlyEssentialExpenses: '110000.00',
      monthlyDiscretionaryExpenses: '40000.00',
      baseEmergencyMonths: '6.00',
      targetEquityPct: '60.00',
      targetDebtPct: '30.00',
      targetGoldPct: '10.00',
      targetCashPct: '0.00',
    });

    // 5. Insert Family Members
    console.log('Inserting 4 family members...');
    const memberSelfId = '44444444-4444-4444-4444-444444444441';
    const memberSpouseId = '44444444-4444-4444-4444-444444444442';
    const memberFatherId = '44444444-4444-4444-4444-444444444443';
    const memberMotherId = '44444444-4444-4444-4444-444444444444';

    await db.insert(familyMembers).values([
      {
        id: memberSelfId,
        familyId: CANONICAL_FAMILY_ID,
        name: 'Abhijit Karmakar',
        relation: 'Self',
        age: 34,
        employmentStatus: 'employed',
        monthlyIncome: '150000.00',
        incomeType: 'stable',
        riskTolerance: 'Moderate',
        investmentExperience: 'Intermediate',
      },
      {
        id: memberSpouseId,
        familyId: CANONICAL_FAMILY_ID,
        name: 'Priyanka Karmakar',
        relation: 'Spouse',
        age: 32,
        employmentStatus: 'employed',
        monthlyIncome: '80000.00',
        incomeType: 'stable',
        riskTolerance: 'Moderate',
        investmentExperience: 'Intermediate',
      },
      {
        id: memberFatherId,
        familyId: CANONICAL_FAMILY_ID,
        name: 'Prabir Karmakar',
        relation: 'Father',
        age: 64,
        employmentStatus: 'retired',
        monthlyIncome: '40000.00',
        incomeType: 'stable',
        riskTolerance: 'Conservative',
        investmentExperience: 'Beginner',
      },
      {
        id: memberMotherId,
        familyId: CANONICAL_FAMILY_ID,
        name: 'Maya Karmakar',
        relation: 'Mother',
        age: 60,
        employmentStatus: 'homemaker',
        monthlyIncome: '0.00',
        incomeType: 'stable',
        riskTolerance: 'Conservative',
        investmentExperience: 'Beginner',
      },
    ]);

    // 6. Insert Cash Accounts
    console.log('Inserting 3 cash accounts...');
    await db.insert(cashAccounts).values([
      {
        id: '55555555-5555-5555-5555-555555555551',
        ownerMemberId: memberSelfId,
        institution: 'HDFC Bank',
        accountName: 'HDFC Salary Account',
        accountType: 'savings',
        currentBalance: '450000.00',
      },
      {
        id: '55555555-5555-5555-5555-555555555552',
        ownerMemberId: memberSpouseId,
        institution: 'ICICI Bank',
        accountName: 'ICICI Savings Account',
        accountType: 'savings',
        currentBalance: '220000.00',
      },
      {
        id: '55555555-5555-5555-5555-555555555553',
        ownerMemberId: memberFatherId,
        institution: 'State Bank of India',
        accountName: 'SBI Pension Account',
        accountType: 'savings',
        currentBalance: '180000.00',
      },
    ]);

    // 7. Insert Liabilities
    console.log('Inserting 2 liabilities...');
    await db.insert(liabilities).values([
      {
        id: '66666666-6666-6666-6666-666666666661',
        ownerMemberId: memberSelfId,
        name: 'Home Loan',
        type: 'home',
        outstandingBalance: '3200000.00',
        interestRatePct: '8.50',
        monthlyEmi: '31000.00',
      },
      {
        id: '66666666-6666-6666-6666-666666666662',
        ownerMemberId: memberSelfId,
        name: 'Personal Loan',
        type: 'personal',
        outstandingBalance: '250000.00',
        interestRatePct: '13.50',
        monthlyEmi: '8500.00',
      },
    ]);

    // 8. Insert Holdings
    console.log('Inserting 6 holdings (FDs, MFs, Gold)...');
    const holdingFdHdfcId = '77777777-7777-7777-7777-777777777771';
    const holdingFdSbiId = '77777777-7777-7777-7777-777777777772';
    const holdingMfPpfcId = '77777777-7777-7777-7777-777777777773';
    const holdingMfMalcId = '77777777-7777-7777-7777-777777777774';
    const holdingMfDebtId = '77777777-7777-7777-7777-777777777775';
    const holdingGoldId = '77777777-7777-7777-7777-777777777776';

    await db.insert(holdings).values([
      {
        id: holdingFdHdfcId,
        ownerMemberId: memberSelfId,
        assetType: 'FD',
        name: 'HDFC Fixed Deposit',
        identifier: 'HDFC-FD-710',
        totalUnits: '1.0000',
        currentPrice: '500000.0000',
        currentValue: '500000.00',
        category: 'debt',
        capType: 'None',
        interestRatePct: '7.10',
        exitLoadPct: '1.00',
      },
      {
        id: holdingFdSbiId,
        ownerMemberId: memberFatherId,
        assetType: 'FD',
        name: 'SBI Fixed Deposit',
        identifier: 'SBI-FD-700',
        totalUnits: '1.0000',
        currentPrice: '300000.0000',
        currentValue: '300000.00',
        category: 'debt',
        capType: 'None',
        interestRatePct: '7.00',
        exitLoadPct: '1.00',
      },
      {
        id: holdingMfPpfcId,
        ownerMemberId: memberSelfId,
        assetType: 'MF',
        name: 'Parag Parikh Flexi Cap Fund',
        identifier: 'INF879O01018',
        totalUnits: '10000.0000',
        currentPrice: '120.0000',
        currentValue: '1200000.00',
        category: 'equity',
        capType: 'Multi',
        exitLoadWindowDays: 365,
        exitLoadPct: '1.00',
      },
      {
        id: holdingMfMalcId,
        ownerMemberId: memberSelfId,
        assetType: 'MF',
        name: 'Mirae Asset Large Cap Fund',
        identifier: 'INF769K01010',
        totalUnits: '8000.0000',
        currentPrice: '100.0000',
        currentValue: '800000.00',
        category: 'equity',
        capType: 'Large',
        exitLoadWindowDays: 365,
        exitLoadPct: '1.00',
      },
      {
        id: holdingMfDebtId,
        ownerMemberId: memberSpouseId,
        assetType: 'MF',
        name: 'HDFC Short Term Debt Fund',
        identifier: 'INF179K01999',
        totalUnits: '12000.0000',
        currentPrice: '50.0000',
        currentValue: '600000.00',
        category: 'debt',
        capType: 'None',
        exitLoadWindowDays: 30,
        exitLoadPct: '0.25',
      },
      {
        id: holdingGoldId,
        ownerMemberId: memberSelfId,
        assetType: 'Gold',
        name: 'Nippon India Gold ETF',
        identifier: 'INF204KB14I2',
        totalUnits: '5000.0000',
        currentPrice: '80.0000',
        currentValue: '400000.00',
        category: 'gold',
        capType: 'None',
      },
    ]);

    // 9. Insert Tax Lots
    console.log('Inserting 7 tax lots for FIFO capital gains tracking...');
    await db.insert(taxLots).values([
      {
        id: '88888888-8888-8888-8888-888888888881',
        holdingId: holdingMfPpfcId,
        purchaseDate: new Date('2025-03-15'),
        units: '7000.0000',
        buyPrice: '85.0000',
        remainingUnits: '7000.0000',
      },
      {
        id: '88888888-8888-8888-8888-888888888882',
        holdingId: holdingMfPpfcId,
        purchaseDate: new Date('2026-05-15'),
        units: '3000.0000',
        buyPrice: '105.0000',
        remainingUnits: '3000.0000',
      },
      {
        id: '88888888-8888-8888-8888-888888888883',
        holdingId: holdingMfMalcId,
        purchaseDate: new Date('2024-06-01'),
        units: '8000.0000',
        buyPrice: '75.0000',
        remainingUnits: '8000.0000',
      },
      {
        id: '88888888-8888-8888-8888-888888888884',
        holdingId: holdingMfDebtId,
        purchaseDate: new Date('2025-01-01'),
        units: '12000.0000',
        buyPrice: '45.0000',
        remainingUnits: '12000.0000',
      },
      {
        id: '88888888-8888-8888-8888-888888888885',
        holdingId: holdingGoldId,
        purchaseDate: new Date('2024-01-01'),
        units: '5000.0000',
        buyPrice: '60.0000',
        remainingUnits: '5000.0000',
      },
      {
        id: '88888888-8888-8888-8888-888888888886',
        holdingId: holdingFdHdfcId,
        purchaseDate: new Date('2025-09-01'),
        units: '1.0000',
        buyPrice: '465000.0000',
        remainingUnits: '1.0000',
      },
      {
        id: '88888888-8888-8888-8888-888888888887',
        holdingId: holdingFdSbiId,
        purchaseDate: new Date('2025-09-01'),
        units: '1.0000',
        buyPrice: '280000.0000',
        remainingUnits: '1.0000',
      },
    ]);

    // 10. Insert Goals
    console.log('Inserting 3 life goals...');
    await db.insert(goals).values([
      {
        id: '99999999-9999-9999-9999-999999999991',
        familyId: CANONICAL_FAMILY_ID,
        name: 'Child Education',
        priority: 'P1',
        targetAmount: '3500000.00',
        targetYear: 2032,
        linkedHoldingIds: [holdingMfPpfcId],
      },
      {
        id: '99999999-9999-9999-9999-999999999992',
        familyId: CANONICAL_FAMILY_ID,
        name: 'Retirement',
        priority: 'P1',
        targetAmount: '25000000.00',
        targetYear: 2045,
        linkedHoldingIds: [holdingMfMalcId],
      },
      {
        id: '99999999-9999-9999-9999-999999999993',
        familyId: CANONICAL_FAMILY_ID,
        name: 'Family Vacation',
        priority: 'P3',
        targetAmount: '400000.00',
        targetYear: 2027,
        linkedHoldingIds: [],
      },
    ]);

    // 11. Insert Price Cache
    console.log('Inserting NAV price cache...');
    await db
      .insert(priceCache)
      .values([
        {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          identifier: 'INF879O01018',
          nav: '120.0000',
          source: 'AMFI',
        },
        {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          identifier: 'INF769K01010',
          nav: '100.0000',
          source: 'AMFI',
        },
        {
          id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          identifier: 'INF179K01999',
          nav: '50.0000',
          source: 'AMFI',
        },
        {
          id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          identifier: 'INF204KB14I2',
          nav: '80.0000',
          source: 'AMFI',
        },
      ])
      .onConflictDoNothing();

    console.log('✅ Canonical "Karmakar Family" seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
