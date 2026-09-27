/**
 * Finlight V1: Withdrawal Decision Engine
 * Evaluates up to 4 neutral withdrawal scenarios with exact friction, tax, runway, drift, and goal consequences.
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md
 *
 * NOTE: Pure TypeScript. No DB imports, no React imports, no external API calls.
 */

import {
  HouseholdFinancialState,
  Holding,
  CashAccount,
  LifeGoal,
  FamilyMember,
  TaxLot,
  TargetAllocation,
} from '../types';
import {
  calculateEmergencyRunway,
  calculateMonthlyObligations,
  calculateAllocationDrift,
} from '../metrics';
import { createScenarioSnapshot } from '../state-builder';
import { LotMatcher } from '../tax/lot-matcher';
import { TaxRuleSet202425, EQUITY_LTCG_EXEMPTION_FY2425 } from '../tax/rules-2024-25';
import { ILotMatcher, TaxRuleSet, MatchedLotResult } from '../tax/types';
import {
  WithdrawalRequest,
  WithdrawalScenario,
  WithdrawalEngineResult,
  RunwayStatus,
  GoalImpactItem,
  AllocationDriftChangeItem,
} from './types';

/**
 * Derives a conservative estimated tax slab for an individual family member.
 */
function getMemberTaxSlabPct(memberId: string, members: FamilyMember[]): number {
  const member = members.find((m) => m.id === memberId);
  if (!member || !member.monthlyIncome) {
    return 30; // Conservative standard slab rate in Indian wealth management
  }
  const annualIncome = member.monthlyIncome * 12;
  if (annualIncome > 1500000) return 30;
  if (annualIncome > 1200000) return 20;
  if (annualIncome > 1000000) return 15;
  if (annualIncome > 700000) return 10;
  if (annualIncome > 300000) return 5;
  return 0;
}

/**
 * Classifies emergency runway into standard safety tiers.
 */
function getRunwayStatus(runwayMonths: number): RunwayStatus {
  if (runwayMonths >= 6.0) return 'Safe';
  if (runwayMonths >= 3.0) return 'Warning';
  return 'Critical';
}

/**
 * Calculates measurable delays and shortfalls across life goals.
 * Formula: delayMonths = fundingShortfallRupees / requiredMonthlyRunRate
 */
function evaluateGoalImpact(
  goals: LifeGoal[],
  liquidatedHoldingIds: string[],
  grossLiquidated: number
): GoalImpactItem[] {
  if (!goals || goals.length === 0 || grossLiquidated <= 0) {
    return [];
  }

  const currentYear = new Date().getFullYear() || 2026;
  const impacts: GoalImpactItem[] = [];

  // Check if any goals are explicitly linked to the liquidated holdings
  const linkedGoals = goals.filter((g) =>
    g.linkedHoldingIds?.some((id) => liquidatedHoldingIds.includes(id))
  );

  if (linkedGoals.length > 0) {
    // Distribute shortfall among linked goals
    const perGoalShortfall = Math.round((grossLiquidated / linkedGoals.length) * 100) / 100;
    for (const g of linkedGoals) {
      const yearsRemaining = Math.max(0.5, g.targetYear - currentYear);
      const monthsRemaining = Math.max(6, Math.round(yearsRemaining * 12));
      const monthlyRunRate = Math.max(100, g.targetAmount / monthsRemaining);
      const delayMonths = Number((perGoalShortfall / monthlyRunRate).toFixed(1));

      impacts.push({
        goalId: g.id,
        goalName: g.name,
        priority: g.priority,
        delayMonths,
        fundingShortfallRupees: perGoalShortfall,
      });
    }
  } else {
    // If no holding is explicitly linked, attribute the capital deficit to the earliest P1 goal
    const p1Goals = [...goals]
      .filter((g) => g.priority === 'P1')
      .sort((a, b) => a.targetYear - b.targetYear);

    const primaryGoal = p1Goals[0] || goals[0];
    if (primaryGoal) {
      const shortfall = Math.min(primaryGoal.targetAmount, grossLiquidated);
      const yearsRemaining = Math.max(0.5, primaryGoal.targetYear - currentYear);
      const monthsRemaining = Math.max(6, Math.round(yearsRemaining * 12));
      const monthlyRunRate = Math.max(100, primaryGoal.targetAmount / monthsRemaining);
      const delayMonths = Number((shortfall / monthlyRunRate).toFixed(1));

      if (delayMonths > 0) {
        impacts.push({
          goalId: primaryGoal.id,
          goalName: primaryGoal.name,
          priority: primaryGoal.priority,
          delayMonths,
          fundingShortfallRupees: shortfall,
        });
      }
    }
  }

  return impacts;
}

/**
 * Calculates allocation drift change before and after a scenario's liquidation.
 */
function evaluateDriftChange(
  state: HouseholdFinancialState,
  updatedHoldings: Holding[],
  updatedCashAccounts: CashAccount[]
): AllocationDriftChangeItem[] {
  // Extract configured target allocation from state.allocationDrift
  const targetAlloc: TargetAllocation = {
    equityPct: state.allocationDrift.equity?.targetPct ?? 60,
    debtPct: state.allocationDrift.debt?.targetPct ?? 30,
    goldPct: state.allocationDrift.gold?.targetPct ?? 10,
    cashPct: state.allocationDrift.cash?.targetPct ?? 0,
  };

  const newDriftMap = calculateAllocationDrift(updatedHoldings, updatedCashAccounts, targetAlloc);
  const result: AllocationDriftChangeItem[] = [];

  const allCategories = Array.from(
    new Set([...Object.keys(state.allocationDrift), ...Object.keys(newDriftMap)])
  );

  for (const cat of allCategories) {
    const driftBefore = state.allocationDrift[cat]?.driftPct ?? 0;
    const driftAfter = newDriftMap[cat]?.driftPct ?? 0;
    result.push({
      category: cat,
      driftBefore,
      driftAfter,
    });
  }

  return result;
}

/**
 * Pure evaluation function for withdrawal decision simulations.
 * Generates up to 4 neutral, comparable liquidation scenarios.
 */
export function evaluateWithdrawal(
  state: HouseholdFinancialState,
  request: WithdrawalRequest,
  lotMatcher?: ILotMatcher,
  taxRules?: TaxRuleSet
): WithdrawalEngineResult {
  const matcher = lotMatcher ?? new LotMatcher();
  const rules = taxRules ?? new TaxRuleSet202425();
  const amountNeeded = Math.max(0, Number(request.amountNeeded) || 0);

  // Filter assets by scopedMemberIds if provided
  const scopedMembers =
    request.scopedMemberIds && request.scopedMemberIds.length > 0
      ? state.members.filter((m) => request.scopedMemberIds!.includes(m.id))
      : state.members;

  const scopedCash =
    request.scopedMemberIds && request.scopedMemberIds.length > 0
      ? state.cashAccounts.filter((c) => request.scopedMemberIds!.includes(c.ownerMemberId))
      : state.cashAccounts;

  const scopedHoldings =
    request.scopedMemberIds && request.scopedMemberIds.length > 0
      ? state.holdings.filter((h) => request.scopedMemberIds!.includes(h.ownerMemberId))
      : state.holdings;

  const monthlyObligations = calculateMonthlyObligations(
    state.monthlyEssentialExpenses,
    state.monthlyDebtServicing
  );

  const runwayBefore = state.emergencyRunwayMonths;
  const liquidCashBefore = state.liquidWealth;

  const scenarios: WithdrawalScenario[] = [];

  // =========================================================================
  // Scenario A: Use Cash
  // Draws from cash accounts (with balance above operating float where available).
  // =========================================================================
  {
    const totalCashAvailable = scopedCash.reduce((sum, c) => sum + (Number(c.currentBalance) || 0), 0);
    const grossProceeds = Math.min(amountNeeded, totalCashAvailable);
    const estimatedTaxImpact = 0;
    const exitLoads = 0;
    const preClosurePenalties = 0;
    const totalDirectFriction = 0;
    const netCashReceived = grossProceeds;

    const liquidCashAfter = Math.max(0, Number((liquidCashBefore - grossProceeds).toFixed(2)));
    const emergencyRunwayAfter = calculateEmergencyRunway(liquidCashAfter, monthlyObligations);
    const runwayStatus = getRunwayStatus(emergencyRunwayAfter);

    // Simulate updated cash accounts
    let remainingToDeduct = grossProceeds;
    const updatedCash = scopedCash.map((acc) => {
      const bal = Number(acc.currentBalance) || 0;
      const deduct = Math.min(bal, remainingToDeduct);
      remainingToDeduct -= deduct;
      return {
        ...acc,
        currentBalance: Number((bal - deduct).toFixed(2)),
      };
    });

    const driftChange = evaluateDriftChange(state, state.holdings, updatedCash);
    const goalImpact = evaluateGoalImpact(state.goals, [], grossProceeds);

    const violations: string[] = [];
    if (grossProceeds < amountNeeded) {
      violations.push(
        `Insufficient cash balance: ₹${totalCashAvailable.toLocaleString('en-IN')} available vs ₹${amountNeeded.toLocaleString('en-IN')} needed.`
      );
    }
    if (emergencyRunwayAfter < 2.0) {
      violations.push(
        `Emergency runway drops to ${emergencyRunwayAfter.toFixed(1)} months (below critical 2.0-month floor).`
      );
    }
    for (const g of goalImpact) {
      if (g.priority === 'P1' && g.delayMonths > 12) {
        violations.push(
          `High-priority goal '${g.goalName}' suffers delay of ${g.delayMonths} months (exceeds 12-month threshold).`
        );
      }
    }

    const accountsDrawn = scopedCash.filter((c) => c.currentBalance > 0).map((c) => c.accountName);

    scenarios.push({
      id: 'scenario-a-use-cash',
      name: 'Scenario A: Use Cash',
      sourceDescription:
        accountsDrawn.length > 0
          ? `Liquid bank accounts (${accountsDrawn.join(', ')})`
          : 'Liquid bank accounts',
      tier1Friction: {
        grossProceeds,
        estimatedTaxImpact,
        exitLoads,
        preClosurePenalties,
        totalDirectFriction,
        netCashReceived,
        settlementTime: 'T+0 (Immediate)',
      },
      tier2Consequences: {
        emergencyRunwayBefore: runwayBefore,
        emergencyRunwayAfter,
        runwayStatus,
        allocationDriftChange: driftChange,
        goalImpact,
        liquidityPositionAfter: liquidCashAfter,
      },
      executionChecklist: [
        `Verify minimum operating balances in source bank accounts.`,
        `Initiate bank transfer of ₹${grossProceeds.toLocaleString('en-IN')} to primary operating account.`,
        `Settlement is instant (T+0).`,
        `Plan monthly cash surplus allocation to replenish emergency runway back to 6.0 months.`,
      ],
      isViable: violations.length === 0 && grossProceeds >= amountNeeded && amountNeeded > 0,
      constraintViolations: violations,
    });
  }

  // =========================================================================
  // Scenario B: Break FD
  // Draws from fixed deposits, calculates premature withdrawal penalty and slab tax.
  // =========================================================================
  {
    const fdHoldings = scopedHoldings.filter(
      (h) => h.assetType === 'FD' && (Number(h.currentValue) || 0) > 0
    );
    const totalFdValue = fdHoldings.reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0);

    if (fdHoldings.length === 0) {
      scenarios.push({
        id: 'scenario-b-break-fd',
        name: 'Scenario B: Break FD',
        sourceDescription: 'No Fixed Deposit holdings available to break',
        tier1Friction: {
          grossProceeds: 0,
          estimatedTaxImpact: 0,
          exitLoads: 0,
          preClosurePenalties: 0,
          totalDirectFriction: 0,
          netCashReceived: 0,
          settlementTime: 'N/A',
        },
        tier2Consequences: {
          emergencyRunwayBefore: runwayBefore,
          emergencyRunwayAfter: runwayBefore,
          runwayStatus: getRunwayStatus(runwayBefore),
          allocationDriftChange: [],
          goalImpact: [],
          liquidityPositionAfter: liquidCashBefore,
        },
        executionChecklist: ['Add or link fixed deposit accounts to evaluate this scenario.'],
        isViable: false,
        constraintViolations: ['No Fixed Deposit holdings available in household portfolio.'],
      });
    } else {
      let remainingNeeded = amountNeeded;
      let totalGross = 0;
      let totalTax = 0;
      let totalPenalties = 0;
      let totalFriction = 0;
      let totalNet = 0;
      const brokenFdIds: string[] = [];
      const updatedHoldings = state.holdings.map((h) => ({ ...h }));

      for (const fd of fdHoldings) {
        if (remainingNeeded <= 0) break;

        const fdVal = Number(fd.currentValue) || 0;
        const drawAmount = Math.min(fdVal, remainingNeeded);
        remainingNeeded -= drawAmount;
        brokenFdIds.push(fd.id);

        // Update simulated holding
        const matchHolding = updatedHoldings.find((h) => h.id === fd.id);
        if (matchHolding) {
          matchHolding.currentValue = Number((matchHolding.currentValue - drawAmount).toFixed(2));
        }

        // Determine cost basis and interest gain
        const fdLots = state.taxLots.filter((l) => l.holdingId === fd.id);
        let buyPrice = fdVal * 0.9; // fallback 10% accrued interest
        if (fdLots.length > 0) {
          const totalLotCost = fdLots.reduce(
            (sum, l) => sum + l.buyPrice * (l.remainingUnits ?? l.units),
            0
          );
          buyPrice = Math.min(fdVal, totalLotCost);
        } else if (fd.interestRatePct) {
          const rate = fd.interestRatePct / 100;
          buyPrice = fdVal / (1 + rate * 0.5); // assuming ~6 months average accrued interest
        }

        const proportion = fdVal > 0 ? drawAmount / fdVal : 1;
        const grossProceeds = Number(drawAmount.toFixed(2));
        const costBasisPortion = Number((buyPrice * proportion).toFixed(2));
        const accruedInterest = Math.max(0, Number((grossProceeds - costBasisPortion).toFixed(2)));

        const matchedLot: MatchedLotResult = {
          lotId: `${fd.id}-premature`,
          purchaseDate: new Date('2024-01-01'),
          unitsRedeemed: 1,
          buyPrice: costBasisPortion,
          currentNav: grossProceeds,
          holdingPeriodDays: 180,
          isLongTerm: false,
          capitalGain: accruedInterest,
        };

        const ownerSlab = getMemberTaxSlabPct(fd.ownerMemberId, scopedMembers);
        const penaltyRate =
          fd.exitLoadPct !== null && fd.exitLoadPct !== undefined ? fd.exitLoadPct : 1.0;

        const evalResult = rules.evaluateGains([matchedLot], 'FD', ownerSlab, 0, {
          isPrematureWithdrawal: true,
          preClosurePenaltyPct: penaltyRate,
        });

        totalGross += evalResult.grossProceeds;
        totalTax += evalResult.estimatedTaxImpact;
        totalPenalties += evalResult.preClosurePenalties;
        totalFriction += evalResult.totalDirectFriction;
        totalNet += evalResult.netCashRealized;
      }

      totalGross = Number(totalGross.toFixed(2));
      totalTax = Number(totalTax.toFixed(2));
      totalPenalties = Number(totalPenalties.toFixed(2));
      totalFriction = Number(totalFriction.toFixed(2));
      totalNet = Number(totalNet.toFixed(2));

      // FD proceeds fund the withdrawal; bank liquid cash remains intact!
      const emergencyRunwayAfter = runwayBefore;
      const runwayStatus = getRunwayStatus(emergencyRunwayAfter);

      const driftChange = evaluateDriftChange(state, updatedHoldings, state.cashAccounts);
      const goalImpact = evaluateGoalImpact(state.goals, brokenFdIds, totalGross);

      const violations: string[] = [];
      if (totalGross < amountNeeded) {
        violations.push(
          `Insufficient Fixed Deposit balance: ₹${totalFdValue.toLocaleString('en-IN')} available vs ₹${amountNeeded.toLocaleString('en-IN')} needed.`
        );
      }
      if (emergencyRunwayAfter < 2.0) {
        violations.push(
          `Emergency runway is ${emergencyRunwayAfter.toFixed(1)} months (below critical 2.0-month floor).`
        );
      }
      for (const g of goalImpact) {
        if (g.priority === 'P1' && g.delayMonths > 12) {
          violations.push(
            `High-priority goal '${g.goalName}' suffers delay of ${g.delayMonths} months (exceeds 12-month threshold).`
          );
        }
      }

      const fdNames = fdHoldings.map((h) => h.name).join(', ');

      scenarios.push({
        id: 'scenario-b-break-fd',
        name: 'Scenario B: Break FD',
        sourceDescription: `Premature closure of Fixed Deposit(s): ${fdNames}`,
        tier1Friction: {
          grossProceeds: totalGross,
          estimatedTaxImpact: totalTax,
          exitLoads: 0,
          preClosurePenalties: totalPenalties,
          totalDirectFriction: totalFriction,
          netCashReceived: totalNet,
          settlementTime: 'T+0 to T+1 (Same day or next business day)',
        },
        tier2Consequences: {
          emergencyRunwayBefore: runwayBefore,
          emergencyRunwayAfter,
          runwayStatus,
          allocationDriftChange: driftChange,
          goalImpact,
          liquidityPositionAfter: liquidCashBefore,
        },
        executionChecklist: [
          `Access banking portal for ${fdNames}.`,
          `Submit premature closure request for ₹${totalGross.toLocaleString('en-IN')}.`,
          `Note pre-closure penalty of ₹${totalPenalties.toLocaleString('en-IN')} and slab TDS deduction.`,
          `Funds will credit to linked savings account in T+0 / T+1 business days.`,
          `Emergency runway is fully preserved at ${emergencyRunwayAfter.toFixed(1)} months.`,
        ],
        isViable: violations.length === 0 && totalGross >= amountNeeded && amountNeeded > 0,
        constraintViolations: violations,
      });
    }
  }

  // =========================================================================
  // Scenario C: Redeem Mutual Fund
  // Uses LotMatcher (FIFO) and rules-2024-25.ts for capital gains & exit loads.
  // =========================================================================
  {
    const mfHoldings = scopedHoldings.filter(
      (h) => h.assetType === 'MF' && (Number(h.currentValue) || 0) > 0
    );
    const totalMfValue = mfHoldings.reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0);

    if (mfHoldings.length === 0) {
      scenarios.push({
        id: 'scenario-c-redeem-mf',
        name: 'Scenario C: Redeem Mutual Fund',
        sourceDescription: 'No Mutual Fund holdings available to redeem',
        tier1Friction: {
          grossProceeds: 0,
          estimatedTaxImpact: 0,
          exitLoads: 0,
          preClosurePenalties: 0,
          totalDirectFriction: 0,
          netCashReceived: 0,
          settlementTime: 'N/A',
        },
        tier2Consequences: {
          emergencyRunwayBefore: runwayBefore,
          emergencyRunwayAfter: runwayBefore,
          runwayStatus: getRunwayStatus(runwayBefore),
          allocationDriftChange: [],
          goalImpact: [],
          liquidityPositionAfter: liquidCashBefore,
        },
        executionChecklist: ['Add or link mutual fund holdings to evaluate this scenario.'],
        isViable: false,
        constraintViolations: ['No Mutual Fund holdings available in household portfolio.'],
      });
    } else {
      // Prioritize overweight funds according to allocation drift
      const sortedMfs = [...mfHoldings].sort((a, b) => {
        const driftA = state.allocationDrift[a.category]?.driftPct ?? 0;
        const driftB = state.allocationDrift[b.category]?.driftPct ?? 0;
        if (driftB !== driftA) return driftB - driftA;
        return (Number(b.currentValue) || 0) - (Number(a.currentValue) || 0);
      });

      let remainingNeeded = amountNeeded;
      let totalGross = 0;
      let totalTax = 0;
      let totalExitLoads = 0;
      let totalFriction = 0;
      let totalNet = 0;
      const redeemedMfIds: string[] = [];
      const updatedHoldings = state.holdings.map((h) => ({ ...h }));
      let annualExemptionRemaining = EQUITY_LTCG_EXEMPTION_FY2425;

      for (const mf of sortedMfs) {
        if (remainingNeeded <= 0) break;

        const mfVal = Number(mf.currentValue) || 0;
        const drawAmount = Math.min(mfVal, remainingNeeded);
        redeemedMfIds.push(mf.id);

        const nav =
          mf.currentPrice > 0
            ? mf.currentPrice
            : mf.totalUnits > 0
              ? mfVal / mf.totalUnits
              : 100;

        const unitsNeeded = Math.min(
          mf.totalUnits || drawAmount / nav,
          Number((drawAmount / nav).toFixed(4))
        );

        // Retrieve or synthesize tax lots
        let lots = state.taxLots.filter((l) => l.holdingId === mf.id);
        if (lots.length === 0) {
          lots = [
            {
              id: `${mf.id}-synthetic-lot`,
              holdingId: mf.id,
              purchaseDate: new Date('2023-01-01'),
              units: mf.totalUnits || unitsNeeded,
              remainingUnits: mf.totalUnits || unitsNeeded,
              buyPrice: nav * 0.75, // default 25% unrealized gain
            },
          ];
        }

        const matchedLots = matcher.matchLots(lots, unitsNeeded, 'FIFO', {
          currentNav: nav,
          asOfDate: new Date(),
        });

        const ownerSlab = getMemberTaxSlabPct(mf.ownerMemberId, scopedMembers);
        const evalResult = rules.evaluateGains(
          matchedLots,
          'MF',
          ownerSlab,
          annualExemptionRemaining,
          {
            category: mf.category,
            isDebtFund: mf.category === 'debt',
            exitLoadWindowDays: mf.exitLoadWindowDays ?? 365,
            exitLoadPct: mf.exitLoadPct ?? 1.0,
          }
        );

        annualExemptionRemaining = Math.max(0, annualExemptionRemaining - evalResult.ltcgGain);

        totalGross += evalResult.grossProceeds;
        totalTax += evalResult.estimatedTaxImpact;
        totalExitLoads += evalResult.exitLoads;
        totalFriction += evalResult.totalDirectFriction;
        totalNet += evalResult.netCashRealized;

        remainingNeeded -= evalResult.grossProceeds;

        // Update simulated holding
        const matchHolding = updatedHoldings.find((h) => h.id === mf.id);
        if (matchHolding) {
          matchHolding.currentValue = Math.max(
            0,
            Number((matchHolding.currentValue - evalResult.grossProceeds).toFixed(2))
          );
          matchHolding.totalUnits = Math.max(
            0,
            Number((matchHolding.totalUnits - unitsNeeded).toFixed(4))
          );
        }
      }

      totalGross = Number(totalGross.toFixed(2));
      totalTax = Number(totalTax.toFixed(2));
      totalExitLoads = Number(totalExitLoads.toFixed(2));
      totalFriction = Number(totalFriction.toFixed(2));
      totalNet = Number(totalNet.toFixed(2));

      // Cash runway is preserved!
      const emergencyRunwayAfter = runwayBefore;
      const runwayStatus = getRunwayStatus(emergencyRunwayAfter);

      const driftChange = evaluateDriftChange(state, updatedHoldings, state.cashAccounts);
      const goalImpact = evaluateGoalImpact(state.goals, redeemedMfIds, totalGross);

      const violations: string[] = [];
      if (totalGross < amountNeeded) {
        violations.push(
          `Insufficient Mutual Fund balance: ₹${totalMfValue.toLocaleString('en-IN')} available vs ₹${amountNeeded.toLocaleString('en-IN')} needed.`
        );
      }
      if (emergencyRunwayAfter < 2.0) {
        violations.push(
          `Emergency runway is ${emergencyRunwayAfter.toFixed(1)} months (below critical 2.0-month floor).`
        );
      }
      for (const g of goalImpact) {
        if (g.priority === 'P1' && g.delayMonths > 12) {
          violations.push(
            `High-priority goal '${g.goalName}' suffers delay of ${g.delayMonths} months (exceeds 12-month threshold).`
          );
        }
      }

      const mfNames = mfHoldings.map((h) => h.name).join(', ');

      scenarios.push({
        id: 'scenario-c-redeem-mf',
        name: 'Scenario C: Redeem Mutual Fund',
        sourceDescription: `FIFO redemption of Mutual Fund(s): ${mfNames}`,
        tier1Friction: {
          grossProceeds: totalGross,
          estimatedTaxImpact: totalTax,
          exitLoads: totalExitLoads,
          preClosurePenalties: 0,
          totalDirectFriction: totalFriction,
          netCashReceived: totalNet,
          settlementTime: 'T+2 to T+3 (Standard MF redemption payout)',
        },
        tier2Consequences: {
          emergencyRunwayBefore: runwayBefore,
          emergencyRunwayAfter,
          runwayStatus,
          allocationDriftChange: driftChange,
          goalImpact,
          liquidityPositionAfter: liquidCashBefore,
        },
        executionChecklist: [
          `Log into MF Central / AMC portal for ${mfNames}.`,
          `Place redemption order for ₹${totalGross.toLocaleString('en-IN')}.`,
          `Verification strategy: FIFO lot redemption applies.`,
          `Estimated direct friction: ₹${totalFriction.toLocaleString('en-IN')} (Taxes: ₹${totalTax.toLocaleString('en-IN')}, Exit Loads: ₹${totalExitLoads.toLocaleString('en-IN')}).`,
          `Expect payout credit of ₹${totalNet.toLocaleString('en-IN')} in registered bank account within T+2 to T+3 business days.`,
        ],
        isViable: violations.length === 0 && totalGross >= amountNeeded && amountNeeded > 0,
        constraintViolations: violations,
      });
    }
  }

  // =========================================================================
  // Scenario D: Cash + MF
  // Hybrid split between surplus cash and overweight equity/MF lots.
  // =========================================================================
  {
    const totalCashAvailable = scopedCash.reduce((sum, c) => sum + (Number(c.currentBalance) || 0), 0);
    const mfHoldings = scopedHoldings.filter(
      (h) => h.assetType === 'MF' && (Number(h.currentValue) || 0) > 0
    );
    const totalMfValue = mfHoldings.reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0);

    // Determine surplus cash above emergency reserve target
    const surplusCash = Math.max(0, liquidCashBefore - state.emergencyReserveTarget);

    let cashTarget = 0;
    let mfTarget = 0;

    if (surplusCash > 0 && surplusCash < amountNeeded) {
      cashTarget = Math.min(surplusCash, totalCashAvailable);
      mfTarget = amountNeeded - cashTarget;
    } else {
      cashTarget = Math.min(amountNeeded * 0.5, totalCashAvailable);
      mfTarget = amountNeeded - cashTarget;
    }

    if (mfTarget > totalMfValue) {
      mfTarget = totalMfValue;
      cashTarget = Math.min(amountNeeded - mfTarget, totalCashAvailable);
    }

    // 1. Process cash portion
    const cashGross = Number(cashTarget.toFixed(2));
    let remainingToDeduct = cashGross;
    const updatedCash = scopedCash.map((acc) => {
      const bal = Number(acc.currentBalance) || 0;
      const deduct = Math.min(bal, remainingToDeduct);
      remainingToDeduct -= deduct;
      return {
        ...acc,
        currentBalance: Number((bal - deduct).toFixed(2)),
      };
    });

    // 2. Process MF portion
    let mfGross = 0;
    let mfTax = 0;
    let mfExitLoads = 0;
    let mfFriction = 0;
    let mfNet = 0;
    const redeemedMfIds: string[] = [];
    const updatedHoldings = state.holdings.map((h) => ({ ...h }));
    let remainingMfNeeded = mfTarget;
    let annualExemptionRemaining = EQUITY_LTCG_EXEMPTION_FY2425;

    for (const mf of mfHoldings) {
      if (remainingMfNeeded <= 0) break;

      const mfVal = Number(mf.currentValue) || 0;
      const drawAmount = Math.min(mfVal, remainingMfNeeded);
      redeemedMfIds.push(mf.id);

      const nav =
        mf.currentPrice > 0 ? mf.currentPrice : mf.totalUnits > 0 ? mfVal / mf.totalUnits : 100;
      const unitsNeeded = Math.min(
        mf.totalUnits || drawAmount / nav,
        Number((drawAmount / nav).toFixed(4))
      );

      let lots = state.taxLots.filter((l) => l.holdingId === mf.id);
      if (lots.length === 0) {
        lots = [
          {
            id: `${mf.id}-synthetic-lot`,
            holdingId: mf.id,
            purchaseDate: new Date('2023-01-01'),
            units: mf.totalUnits || unitsNeeded,
            remainingUnits: mf.totalUnits || unitsNeeded,
            buyPrice: nav * 0.75,
          },
        ];
      }

      const matchedLots = matcher.matchLots(lots, unitsNeeded, 'FIFO', {
        currentNav: nav,
        asOfDate: new Date(),
      });

      const ownerSlab = getMemberTaxSlabPct(mf.ownerMemberId, scopedMembers);
      const evalResult = rules.evaluateGains(
        matchedLots,
        'MF',
        ownerSlab,
        annualExemptionRemaining,
        {
          category: mf.category,
          isDebtFund: mf.category === 'debt',
          exitLoadWindowDays: mf.exitLoadWindowDays ?? 365,
          exitLoadPct: mf.exitLoadPct ?? 1.0,
        }
      );

      annualExemptionRemaining = Math.max(0, annualExemptionRemaining - evalResult.ltcgGain);

      mfGross += evalResult.grossProceeds;
      mfTax += evalResult.estimatedTaxImpact;
      mfExitLoads += evalResult.exitLoads;
      mfFriction += evalResult.totalDirectFriction;
      mfNet += evalResult.netCashRealized;

      remainingMfNeeded -= evalResult.grossProceeds;

      const matchHolding = updatedHoldings.find((h) => h.id === mf.id);
      if (matchHolding) {
        matchHolding.currentValue = Math.max(
          0,
          Number((matchHolding.currentValue - evalResult.grossProceeds).toFixed(2))
        );
        matchHolding.totalUnits = Math.max(
          0,
          Number((matchHolding.totalUnits - unitsNeeded).toFixed(4))
        );
      }
    }

    const combinedGross = Number((cashGross + mfGross).toFixed(2));
    const combinedTax = Number(mfTax.toFixed(2));
    const combinedExitLoads = Number(mfExitLoads.toFixed(2));
    const combinedFriction = Number(mfFriction.toFixed(2));
    const combinedNet = Number((cashGross + mfNet).toFixed(2));

    const liquidCashAfter = Math.max(0, Number((liquidCashBefore - cashGross).toFixed(2)));
    const emergencyRunwayAfter = calculateEmergencyRunway(liquidCashAfter, monthlyObligations);
    const runwayStatus = getRunwayStatus(emergencyRunwayAfter);

    const driftChange = evaluateDriftChange(state, updatedHoldings, updatedCash);
    const goalImpact = evaluateGoalImpact(state.goals, redeemedMfIds, combinedGross);

    const violations: string[] = [];
    if (combinedGross < amountNeeded) {
      violations.push(
        `Insufficient combined liquid assets: ₹${(totalCashAvailable + totalMfValue).toLocaleString('en-IN')} available vs ₹${amountNeeded.toLocaleString('en-IN')} needed.`
      );
    }
    if (emergencyRunwayAfter < 2.0) {
      violations.push(
        `Emergency runway drops to ${emergencyRunwayAfter.toFixed(1)} months (below critical 2.0-month floor).`
      );
    }
    for (const g of goalImpact) {
      if (g.priority === 'P1' && g.delayMonths > 12) {
        violations.push(
          `High-priority goal '${g.goalName}' suffers delay of ${g.delayMonths} months (exceeds 12-month threshold).`
        );
      }
    }

    scenarios.push({
      id: 'scenario-d-cash-plus-mf',
      name: 'Scenario D: Cash + MF',
      sourceDescription: `Hybrid split: ₹${cashGross.toLocaleString('en-IN')} from cash accounts + ₹${mfGross.toLocaleString('en-IN')} from Mutual Funds`,
      tier1Friction: {
        grossProceeds: combinedGross,
        estimatedTaxImpact: combinedTax,
        exitLoads: combinedExitLoads,
        preClosurePenalties: 0,
        totalDirectFriction: combinedFriction,
        netCashReceived: combinedNet,
        settlementTime: 'T+0 (Cash portion) / T+2 to T+3 (MF portion)',
      },
      tier2Consequences: {
        emergencyRunwayBefore: runwayBefore,
        emergencyRunwayAfter,
        runwayStatus,
        allocationDriftChange: driftChange,
        goalImpact,
        liquidityPositionAfter: liquidCashAfter,
      },
      executionChecklist: [
        `Transfer ₹${cashGross.toLocaleString('en-IN')} immediately from liquid cash accounts (T+0).`,
        `Submit redemption order for ₹${mfGross.toLocaleString('en-IN')} across overweight mutual funds (T+2 to T+3).`,
        `Preserves a cushioned emergency runway of ${emergencyRunwayAfter.toFixed(1)} months while minimizing capital gains friction.`,
      ],
      isViable: violations.length === 0 && combinedGross >= amountNeeded && amountNeeded > 0,
      constraintViolations: violations,
    });
  }

  // =========================================================================
  // Clean Scenario Determination & Constraint Handling
  // =========================================================================
  const cleanScenarios = scenarios.filter((s) => s.isViable && s.constraintViolations.length === 0);
  const hasCleanScenario = cleanScenarios.length > 0;

  let constraintSummary: string | undefined;
  let adjustableParametersGuide: string[] | undefined;

  if (!hasCleanScenario) {
    constraintSummary =
      'No evaluated scenario meets the configured household constraints without a material consequence.';
    adjustableParametersGuide = [
      'Consider reducing withdrawal amount to preserve emergency runway above 2.0 months.',
      'Consider staggering the withdrawal across multiple months to allow cash flow recovery.',
      'Consider re-evaluating or extending high-priority life goal target dates to absorb shortfall.',
    ];
  }

  const snapshot = createScenarioSnapshot(
    state,
    request as unknown as Record<string, unknown>,
    { request },
    {
      scenarios,
      hasCleanScenario,
      constraintSummary,
    }
  );

  return {
    request,
    scenarios,
    hasCleanScenario,
    constraintSummary,
    adjustableParametersGuide,
    snapshot,
  };
}
