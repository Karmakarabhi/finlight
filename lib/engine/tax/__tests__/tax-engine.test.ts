// @ts-ignore
import { describe, expect, it } from 'bun:test';
import { TaxLot } from '../../types';
import {
  LotMatcher,
  defaultLotMatcher,
  matchLots,
} from '../lot-matcher';
import {
  TaxRuleSet202425,
  defaultTaxRuleSet202425,
  EQUITY_LTCG_EXEMPTION_FY2425,
} from '../rules-2024-25';
import { MatchedLotResult } from '../types';

describe('Finlight V1 Tax Engine: LotMatcher', () => {
  const asOf = new Date('2025-03-01T00:00:00.000Z');

  const sampleLots: TaxLot[] = [
    {
      id: 'lot-1',
      holdingId: 'h-1',
      purchaseDate: new Date('2023-01-15T00:00:00.000Z'), // ~776 days ago
      units: 100,
      buyPrice: 100,
      remainingUnits: 100,
    },
    {
      id: 'lot-2',
      holdingId: 'h-1',
      purchaseDate: new Date('2024-01-15T00:00:00.000Z'), // ~411 days ago
      units: 100,
      buyPrice: 120,
      remainingUnits: 100,
    },
    {
      id: 'lot-3',
      holdingId: 'h-1',
      purchaseDate: new Date('2024-11-01T00:00:00.000Z'), // ~120 days ago
      units: 100,
      buyPrice: 150,
      remainingUnits: 100,
    },
  ];

  describe('FIFO Lot Matching', () => {
    it('matches oldest lots first when using default FIFO strategy', () => {
      const matches = matchLots(sampleLots, 50, 'FIFO', {
        currentNav: 200,
        asOfDate: asOf,
      });

      expect(matches.length).toBe(1);
      expect(matches[0].lotId).toBe('lot-1');
      expect(matches[0].unitsRedeemed).toBe(50);
      expect(matches[0].buyPrice).toBe(100);
      expect(matches[0].currentNav).toBe(200);
      expect(matches[0].isLongTerm).toBe(true);
      expect(matches[0].capitalGain).toBe(5000); // (200 - 100) * 50
    });

    it('spans multiple lots in chronological order for larger redemption', () => {
      const matches = matchLots(sampleLots, 150, 'FIFO', {
        currentNav: 200,
        asOfDate: asOf,
      });

      expect(matches.length).toBe(2);
      // Depleted lot-1 (100 units)
      expect(matches[0].lotId).toBe('lot-1');
      expect(matches[0].unitsRedeemed).toBe(100);
      expect(matches[0].capitalGain).toBe(10000);

      // Remaining 50 units taken from lot-2
      expect(matches[1].lotId).toBe('lot-2');
      expect(matches[1].unitsRedeemed).toBe(50);
      expect(matches[1].buyPrice).toBe(120);
      expect(matches[1].capitalGain).toBe(4000); // (200 - 120) * 50
    });

    it('handles ISO date strings and respects remainingUnits over units', () => {
      const lotsWithStrings: TaxLot[] = [
        {
          id: 'lot-a',
          holdingId: 'h-1',
          purchaseDate: '2023-01-01T00:00:00.000Z',
          units: 100,
          remainingUnits: 20, // Only 20 units remaining
          buyPrice: 100,
        },
        {
          id: 'lot-b',
          holdingId: 'h-1',
          purchaseDate: '2023-06-01T00:00:00.000Z',
          units: 100,
          remainingUnits: 100,
          buyPrice: 110,
        },
      ];

      const matches = matchLots(lotsWithStrings, 50, 'FIFO', {
        currentNav: 150,
        asOfDate: asOf,
      });

      expect(matches.length).toBe(2);
      expect(matches[0].lotId).toBe('lot-a');
      expect(matches[0].unitsRedeemed).toBe(20);
      expect(matches[1].lotId).toBe('lot-b');
      expect(matches[1].unitsRedeemed).toBe(30);
    });

    it('throws clear descriptive error when requested units exceed available units', () => {
      expect(() => {
        matchLots(sampleLots, 350, 'FIFO');
      }).toThrow(/Insufficient units available for redemption: requested 350, but only 300 units available/);
    });

    it('returns empty array when unitsNeeded is 0', () => {
      const matches = matchLots(sampleLots, 0, 'FIFO');
      expect(matches).toEqual([]);
    });

    it('throws error when unitsNeeded is negative', () => {
      expect(() => {
        matchLots(sampleLots, -10, 'FIFO');
      }).toThrow(/unitsNeeded must be greater than or equal to 0/);
    });
  });

  describe('Alternative Strategies: LIFO, SPECIFIC_LOT, TAX_MINIMIZED', () => {
    it('LIFO matches newest lots first', () => {
      const matches = matchLots(sampleLots, 120, 'LIFO', {
        currentNav: 200,
        asOfDate: asOf,
      });

      expect(matches.length).toBe(2);
      // Newest lot is lot-3 (Nov 2024)
      expect(matches[0].lotId).toBe('lot-3');
      expect(matches[0].unitsRedeemed).toBe(100);
      // Next newest is lot-2 (Jan 2024)
      expect(matches[1].lotId).toBe('lot-2');
      expect(matches[1].unitsRedeemed).toBe(20);
    });

    it('SPECIFIC_LOT prioritizes specified lot IDs in exact sequence', () => {
      const matches = matchLots(sampleLots, 120, 'SPECIFIC_LOT', {
        currentNav: 200,
        asOfDate: asOf,
        specificLotIds: ['lot-2', 'lot-1'],
      });

      expect(matches.length).toBe(2);
      expect(matches[0].lotId).toBe('lot-2');
      expect(matches[0].unitsRedeemed).toBe(100);
      expect(matches[1].lotId).toBe('lot-1');
      expect(matches[1].unitsRedeemed).toBe(20);
    });

    it('TAX_MINIMIZED matches highest buy-price lots first to reduce taxable gain', () => {
      const matches = matchLots(sampleLots, 150, 'TAX_MINIMIZED', {
        currentNav: 200,
        asOfDate: asOf,
      });

      expect(matches.length).toBe(2);
      // lot-3 has buyPrice 150 (gain = 50/unit)
      expect(matches[0].lotId).toBe('lot-3');
      expect(matches[0].unitsRedeemed).toBe(100);
      // lot-2 has buyPrice 120 (gain = 80/unit)
      expect(matches[1].lotId).toBe('lot-2');
      expect(matches[1].unitsRedeemed).toBe(50);
    });
  });
});

describe('Finlight V1 Tax Engine: Indian FY 2024-25 Rules (Post-Finance Act 2024)', () => {
  const rules = defaultTaxRuleSet202425;

  describe('Equity Mutual Funds & Listed Equities/ETFs', () => {
    it('applies ₹1,25,000 exemption to LTCG (> 365 days) and taxes excess at 12.5% + 4% cess', () => {
      // 100 units bought at ₹1,000, now ₹3,250 -> gain ₹2,25,000 (Holding period 500 days > 365)
      const matches: MatchedLotResult[] = [
        {
          lotId: 'eq-1',
          purchaseDate: new Date('2023-01-01'),
          unitsRedeemed: 100,
          buyPrice: 1000,
          currentNav: 3250,
          holdingPeriodDays: 500,
          isLongTerm: true,
          capitalGain: 225000,
        },
      ];

      const result = rules.evaluateGains(matches, 'MF', 30, EQUITY_LTCG_EXEMPTION_FY2425);

      expect(result.grossProceeds).toBe(325000);
      expect(result.totalCapitalGain).toBe(225000);
      expect(result.ltcgGain).toBe(225000);
      expect(result.stcgGain).toBe(0);

      // ₹2,25,000 gain - ₹1,25,000 exemption = ₹1,00,000 taxable LTCG
      expect(result.ltcgTaxable).toBe(100000);
      // 12.5% of ₹1,00,000 = ₹12,500
      expect(result.ltcgTax).toBe(12500);
      expect(result.stcgTax).toBe(0);
      expect(result.slabTax).toBe(0);

      // 4% cess on ₹12,500 = ₹500
      expect(result.cessAndSurcharge).toBe(500);
      // Estimated Tax Impact = ₹12,500 + ₹500 = ₹13,000
      expect(result.estimatedTaxImpact).toBe(13000);
      expect(result.totalDirectFriction).toBe(13000);
      expect(result.netCashRealized).toBe(312000); // 325000 - 13000

      // Audit trail checks
      expect(result.appliedRules.some((r) => r.includes('Section 112A'))).toBe(true);
      expect(result.appliedRules.some((r) => r.includes('Health & Education Cess: 4%'))).toBe(true);
    });

    it('results in zero tax when LTCG is within ₹1,25,000 annual exemption', () => {
      const matches: MatchedLotResult[] = [
        {
          lotId: 'eq-lt-small',
          purchaseDate: new Date('2023-01-01'),
          unitsRedeemed: 100,
          buyPrice: 100,
          currentNav: 200,
          holdingPeriodDays: 400,
          isLongTerm: true,
          capitalGain: 10000, // ₹10,000 gain
        },
      ];

      const result = rules.evaluateGains(matches, 'Stock', 30, EQUITY_LTCG_EXEMPTION_FY2425);

      expect(result.ltcgGain).toBe(10000);
      expect(result.ltcgTaxable).toBe(0);
      expect(result.ltcgTax).toBe(0);
      expect(result.cessAndSurcharge).toBe(0);
      expect(result.estimatedTaxImpact).toBe(0);
      expect(result.netCashRealized).toBe(20000);
    });

    it('respects partially exhausted remaining annual exemption', () => {
      const matches: MatchedLotResult[] = [
        {
          lotId: 'eq-partial',
          purchaseDate: new Date('2023-01-01'),
          unitsRedeemed: 100,
          buyPrice: 1000,
          currentNav: 2000,
          holdingPeriodDays: 450,
          isLongTerm: true,
          capitalGain: 100000, // ₹1,00,000 gain
        },
      ];

      // Only ₹25,000 exemption remaining for this financial year
      const result = rules.evaluateGains(matches, 'ETF', 30, 25000);

      // Taxable = 1,00,000 - 25,000 = 75,000
      expect(result.ltcgTaxable).toBe(75000);
      // 12.5% of 75,000 = 9,375
      expect(result.ltcgTax).toBe(9375);
      // 4% cess on 9,375 = 375
      expect(result.cessAndSurcharge).toBe(375);
      expect(result.estimatedTaxImpact).toBe(9750);
    });

    it('taxes STCG (<= 365 days) at 20% + 4% cess (Section 111A)', () => {
      const matches: MatchedLotResult[] = [
        {
          lotId: 'eq-st-1',
          purchaseDate: new Date('2024-10-01'),
          unitsRedeemed: 100,
          buyPrice: 500,
          currentNav: 1000,
          holdingPeriodDays: 120, // Short term
          isLongTerm: false,
          capitalGain: 50000,
        },
      ];

      const result = rules.evaluateGains(matches, 'MF', 30, EQUITY_LTCG_EXEMPTION_FY2425);

      expect(result.grossProceeds).toBe(100000);
      expect(result.stcgGain).toBe(50000);
      expect(result.ltcgGain).toBe(0);

      // 20% of 50,000 = 10,000
      expect(result.stcgTax).toBe(10000);
      expect(result.ltcgTax).toBe(0);
      expect(result.slabTax).toBe(0);

      // 4% cess on 10,000 = 400
      expect(result.cessAndSurcharge).toBe(400);
      // Total tax = 10,400 (20.8% effective)
      expect(result.estimatedTaxImpact).toBe(10400);
      expect(result.netCashRealized).toBe(89600);
      expect(result.appliedRules.some((r) => r.includes('Section 111A'))).toBe(true);
    });

    it('handles mixed redemptions with both STCG and LTCG lots accurately', () => {
      const matches: MatchedLotResult[] = [
        {
          lotId: 'mixed-lt',
          purchaseDate: new Date('2023-01-01'),
          unitsRedeemed: 100,
          buyPrice: 1000,
          currentNav: 3000,
          holdingPeriodDays: 500,
          isLongTerm: true,
          capitalGain: 200000,
        },
        {
          lotId: 'mixed-st',
          purchaseDate: new Date('2024-10-01'),
          unitsRedeemed: 100,
          buyPrice: 2000,
          currentNav: 3000,
          holdingPeriodDays: 100,
          isLongTerm: false,
          capitalGain: 100000,
        },
      ];

      const result = rules.evaluateGains(matches, 'MF', 30, EQUITY_LTCG_EXEMPTION_FY2425);

      expect(result.grossProceeds).toBe(600000);
      expect(result.totalCapitalGain).toBe(300000);
      expect(result.ltcgGain).toBe(200000);
      expect(result.stcgGain).toBe(100000);

      // LTCG: 200,000 - 125,000 = 75,000 taxable @ 12.5% = 9,375
      expect(result.ltcgTaxable).toBe(75000);
      expect(result.ltcgTax).toBe(9375);

      // STCG: 100,000 @ 20% = 20,000
      expect(result.stcgTax).toBe(20000);

      // Base tax = 29,375
      // Cess = 29,375 * 0.04 = 1,175
      expect(result.cessAndSurcharge).toBe(1175);
      expect(result.estimatedTaxImpact).toBe(30550);
      expect(result.netCashRealized).toBe(569450);
    });
  });

  describe('Debt Mutual Funds (Post-April 2023 / Section 50AA)', () => {
    it('taxes all debt mutual fund gains at owner marginal slab rate regardless of holding period', () => {
      const matches: MatchedLotResult[] = [
        {
          lotId: 'debt-1',
          purchaseDate: new Date('2021-01-01'), // Held for 4 years (> 1400 days)
          unitsRedeemed: 1000,
          buyPrice: 100,
          currentNav: 150,
          holdingPeriodDays: 1460,
          isLongTerm: true,
          capitalGain: 50000,
        },
      ];

      // Owner in 30% slab
      const result30 = rules.evaluateGains(matches, 'MF', 30, EQUITY_LTCG_EXEMPTION_FY2425, {
        category: 'debt',
      });

      expect(result30.grossProceeds).toBe(150000);
      expect(result30.totalCapitalGain).toBe(50000);
      expect(result30.stcgGain).toBe(50000);
      expect(result30.ltcgGain).toBe(0);
      expect(result30.ltcgTax).toBe(0);
      expect(result30.stcgTax).toBe(0);

      // 30% slab rate on ₹50,000 = ₹15,000
      expect(result30.slabTax).toBe(15000);
      // 4% cess on ₹15,000 = ₹600
      expect(result30.cessAndSurcharge).toBe(600);
      // Total tax = ₹15,600 (31.2% effective)
      expect(result30.estimatedTaxImpact).toBe(15600);
      expect(result30.netCashRealized).toBe(134400);
      expect(result30.appliedRules.some((r) => r.includes('Section 50AA'))).toBe(true);

      // Owner in 20% slab
      const result20 = rules.evaluateGains(matches, 'MF', 20, EQUITY_LTCG_EXEMPTION_FY2425, {
        isDebtFund: true,
      });
      // 20% slab rate on ₹50,000 = ₹10,000, cess = 400
      expect(result20.slabTax).toBe(10000);
      expect(result20.cessAndSurcharge).toBe(400);
      expect(result20.estimatedTaxImpact).toBe(10400);
    });
  });

  describe('Fixed Deposits (FDs)', () => {
    it('taxes accrued interest at owner slab rate with 0 penalty when held to maturity', () => {
      const matches: MatchedLotResult[] = [
        {
          lotId: 'fd-normal',
          purchaseDate: new Date('2023-01-01'),
          unitsRedeemed: 1,
          buyPrice: 500000, // Principal
          currentNav: 560000, // Principal + Interest
          holdingPeriodDays: 365,
          isLongTerm: false,
          capitalGain: 60000, // Accrued interest
        },
      ];

      const result = rules.evaluateGains(matches, 'FD', 30, 0, {
        isPrematureWithdrawal: false,
      });

      expect(result.grossProceeds).toBe(560000);
      expect(result.totalCapitalGain).toBe(60000);
      expect(result.preClosurePenalties).toBe(0);

      // Slab tax @ 30% on ₹60,000 = ₹18,000
      expect(result.slabTax).toBe(18000);
      // Cess @ 4% = ₹720
      expect(result.cessAndSurcharge).toBe(720);
      expect(result.estimatedTaxImpact).toBe(18720);
      expect(result.totalDirectFriction).toBe(18720);
      expect(result.netCashRealized).toBe(541280);
    });

    it('applies premature withdrawal penalty for premature FD closure', () => {
      const matches: MatchedLotResult[] = [
        {
          lotId: 'fd-premature',
          purchaseDate: new Date('2024-01-01'),
          unitsRedeemed: 1,
          buyPrice: 500000,
          currentNav: 530000, // Principal + partial interest
          holdingPeriodDays: 180,
          isLongTerm: false,
          capitalGain: 30000,
        },
      ];

      // Premature withdrawal with default 1% penalty on proceeds
      const result = rules.evaluateGains(matches, 'FD', 30, 0, {
        isPrematureWithdrawal: true,
        preClosurePenaltyPct: 1.0,
      });

      expect(result.grossProceeds).toBe(530000);
      // 1% penalty on ₹5,30,000 = ₹5,300
      expect(result.preClosurePenalties).toBe(5300);

      // Slab tax @ 30% on ₹30,000 = ₹9,000; cess = ₹360
      expect(result.slabTax).toBe(9000);
      expect(result.cessAndSurcharge).toBe(360);
      expect(result.estimatedTaxImpact).toBe(9360);

      // Total friction = tax (9360) + penalty (5300) = 14660
      expect(result.totalDirectFriction).toBe(14660);
      expect(result.netCashRealized).toBe(515340);
      expect(result.appliedRules.some((r) => r.includes('FD Premature Withdrawal Penalty'))).toBe(true);
    });
  });

  describe('Gold (Physical & Gold ETF)', () => {
    it('taxes gold held > 730 days at 12.5% LTCG under Section 112', () => {
      const matches: MatchedLotResult[] = [
        {
          lotId: 'gold-lt',
          purchaseDate: new Date('2022-01-01'),
          unitsRedeemed: 10,
          buyPrice: 50000,
          currentNav: 75000,
          holdingPeriodDays: 800, // > 730 days
          isLongTerm: true,
          capitalGain: 250000,
        },
      ];

      const result = rules.evaluateGains(matches, 'Gold', 30, EQUITY_LTCG_EXEMPTION_FY2425);

      expect(result.ltcgGain).toBe(250000);
      expect(result.stcgGain).toBe(0);
      // Gold LTCG has no ₹1.25L exemption (Section 112)
      expect(result.ltcgTaxable).toBe(250000);
      // 12.5% of 250,000 = 31,250
      expect(result.ltcgTax).toBe(31250);
      // 4% cess on 31,250 = 1,250
      expect(result.cessAndSurcharge).toBe(1250);
      expect(result.estimatedTaxImpact).toBe(32500);
    });

    it('taxes gold held <= 730 days at marginal slab rate', () => {
      const matches: MatchedLotResult[] = [
        {
          lotId: 'gold-st',
          purchaseDate: new Date('2024-01-01'),
          unitsRedeemed: 10,
          buyPrice: 60000,
          currentNav: 70000,
          holdingPeriodDays: 300, // <= 730 days
          isLongTerm: false,
          capitalGain: 100000,
        },
      ];

      const result = rules.evaluateGains(matches, 'Gold', 30, EQUITY_LTCG_EXEMPTION_FY2425);

      expect(result.stcgGain).toBe(100000);
      expect(result.ltcgGain).toBe(0);
      // 30% slab rate on 100,000 = 30,000
      expect(result.slabTax).toBe(30000);
      expect(result.cessAndSurcharge).toBe(1200);
      expect(result.estimatedTaxImpact).toBe(31200);
    });
  });

  describe('Exit Loads and Friction Accounting', () => {
    it('applies exit loads when holding period is less than exitLoadWindowDays', () => {
      const matches: MatchedLotResult[] = [
        {
          lotId: 'mf-exit-load',
          purchaseDate: new Date('2024-06-01'),
          unitsRedeemed: 1000,
          buyPrice: 100,
          currentNav: 120,
          holdingPeriodDays: 200, // < 365 days
          isLongTerm: false,
          capitalGain: 20000,
        },
      ];

      // 1% exit load if redeemed within 365 days
      const result = rules.evaluateGains(matches, 'MF', 30, EQUITY_LTCG_EXEMPTION_FY2425, {
        exitLoadWindowDays: 365,
        exitLoadPct: 1.0,
      });

      expect(result.grossProceeds).toBe(120000);
      // 1% of ₹1,20,000 = ₹1,200
      expect(result.exitLoads).toBe(1200);

      // STCG: 20,000 @ 20% = 4,000; cess = 160; tax = 4,160
      expect(result.estimatedTaxImpact).toBe(4160);

      // Total friction = 4160 + 1200 = 5360
      expect(result.totalDirectFriction).toBe(5360);
      expect(result.netCashRealized).toBe(114640); // 120,000 - 5360
      expect(result.appliedRules.some((r) => r.includes('Exit load of 1.0%'))).toBe(true);
    });

    it('waives exit loads when holding period exceeds exitLoadWindowDays', () => {
      const matches: MatchedLotResult[] = [
        {
          lotId: 'mf-no-exit-load',
          purchaseDate: new Date('2023-01-01'),
          unitsRedeemed: 1000,
          buyPrice: 100,
          currentNav: 150,
          holdingPeriodDays: 450, // >= 365 days
          isLongTerm: true,
          capitalGain: 50000,
        },
      ];

      const result = rules.evaluateGains(matches, 'MF', 30, EQUITY_LTCG_EXEMPTION_FY2425, {
        exitLoadWindowDays: 365,
        exitLoadPct: 1.0,
      });

      expect(result.exitLoads).toBe(0);
    });

    it('maintains the canonical mathematical identities strictly', () => {
      const matches: MatchedLotResult[] = [
        {
          lotId: 'lot-identity',
          purchaseDate: new Date('2024-08-01'),
          unitsRedeemed: 500,
          buyPrice: 200,
          currentNav: 250,
          holdingPeriodDays: 100,
          isLongTerm: false,
          capitalGain: 25000,
        },
      ];

      const result = rules.evaluateGains(matches, 'MF', 30, EQUITY_LTCG_EXEMPTION_FY2425, {
        exitLoadWindowDays: 365,
        exitLoadPct: 1.0,
      });

      // Identity 1: Total Direct Friction = Estimated Tax Impact + Exit Loads + Pre-closure Penalties
      expect(result.totalDirectFriction).toBe(
        result.estimatedTaxImpact + result.exitLoads + result.preClosurePenalties
      );

      // Identity 2: Net Cash Realized = Gross Proceeds - Total Direct Friction
      expect(result.netCashRealized).toBe(result.grossProceeds - result.totalDirectFriction);
    });
  });
});
