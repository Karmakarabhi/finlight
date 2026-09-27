/**
 * Finlight V1: Investment Decision Engine
 * Evaluates Lump Sum deployment and Recurring SIP scenarios against household gates:
 * Safety Gate (emergency reserve), Debt Prepayment Gate (>10% liabilities),
 * Allocation Realignment Gate (negative drift deficits), and Goal Milestone Gate (P1 goals).
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md
 *
 * NOTE: Pure TypeScript. No DB imports, no React imports, no external API calls.
 */

import {
  HouseholdFinancialState,
  TargetAllocation,
  LifeGoal,
} from '../types';
import {
  calculateEmergencyRunway,
  calculateMonthlyObligations,
  calculateAllocationDrift,
} from '../metrics';
import { createScenarioSnapshot } from '../state-builder';
import {
  InvestmentRequest,
  InvestmentScenario,
  InvestmentEngineResult,
  AssetDeploymentItem,
  AllocationDriftChangeItem,
  GoalMilestoneImpactItem,
} from './types';

/**
 * Returns suggested financial instrument type based on asset category.
 */
function getSuggestedInstrumentType(category: string): string {
  switch (category.toLowerCase()) {
    case 'equity':
      return 'Index Funds / Flexi-cap Equity MF';
    case 'debt':
      return 'Short Duration Debt Fund / Liquid Fund / FD';
    case 'gold':
      return 'Sovereign Gold Bonds / Gold ETF';
    case 'cash':
      return 'High-Yield Savings / Auto-Sweep Bank Deposit';
    case 'hybrid':
      return 'Aggressive / Dynamic Asset Allocation Hybrid Fund';
    default:
      return 'Diversified Multi-Asset Instrument';
  }
}

/**
 * Future value of regular monthly contributions with optional annual step-up.
 */
function calculateSipFutureValue(
  monthlyAmount: number,
  annualReturnRate: number,
  years: number,
  annualStepUpPct: number = 0
): number {
  if (monthlyAmount <= 0 || years <= 0) return 0;

  const totalMonths = years * 12;
  const monthlyRate = annualReturnRate / 12;
  const stepUpMultiplier = 1 + annualStepUpPct / 100;

  let currentMonthly = monthlyAmount;
  let futureValue = 0;

  for (let m = 0; m < totalMonths; m++) {
    // Apply step-up at start of each new year
    if (m > 0 && m % 12 === 0) {
      currentMonthly *= stepUpMultiplier;
    }
    const monthsRemaining = totalMonths - m;
    futureValue += currentMonthly * Math.pow(1 + monthlyRate, monthsRemaining);
  }

  return Math.round(futureValue);
}

/**
 * Calculates allocation drift change resulting from new capital deployment.
 */
function evaluateDriftChangeFromDeployment(
  state: HouseholdFinancialState,
  addedAmounts: Record<string, number>
): AllocationDriftChangeItem[] {
  const targetAlloc: TargetAllocation = {
    equityPct: state.allocationDrift.equity?.targetPct ?? 60,
    debtPct: state.allocationDrift.debt?.targetPct ?? 30,
    goldPct: state.allocationDrift.gold?.targetPct ?? 10,
    cashPct: state.allocationDrift.cash?.targetPct ?? 0,
  };

  const totalCurrentWealth =
    state.liquidWealth + state.investedWealth + state.fixedWealth;

  // Approximate current category wealth from actual percentages
  const currentCategoryWealth: Record<string, number> = {};
  for (const [cat, item] of Object.entries(state.allocationDrift)) {
    currentCategoryWealth[cat] = (totalCurrentWealth * (item.actualPct || 0)) / 100;
  }

  // Add new deployments
  let newTotalWealth = totalCurrentWealth;
  const newCategoryWealth: Record<string, number> = { ...currentCategoryWealth };

  for (const [cat, amt] of Object.entries(addedAmounts)) {
    newCategoryWealth[cat] = (newCategoryWealth[cat] || 0) + amt;
    newTotalWealth += amt;
  }

  const result: AllocationDriftChangeItem[] = [];
  const allCats = Array.from(
    new Set([...Object.keys(state.allocationDrift), ...Object.keys(addedAmounts)])
  );

  for (const cat of allCats) {
    const driftBefore = state.allocationDrift[cat]?.driftPct ?? 0;
    const targetPct = targetAlloc[`${cat}Pct`] ?? state.allocationDrift[cat]?.targetPct ?? 0;
    const actualPctAfter =
      newTotalWealth > 0 ? ((newCategoryWealth[cat] || 0) / newTotalWealth) * 100 : 0;
    const driftAfter = Number((actualPctAfter - targetPct).toFixed(2));

    result.push({
      category: cat,
      driftBefore,
      driftAfter,
    });
  }

  return result;
}

/**
 * Pure evaluation function for investment decision simulations.
 * Evaluates Lump Sum deployments and Recurring SIP planning across safety, debt,
 * allocation drift, and goal milestone gates.
 */
export function evaluateInvestment(
  state: HouseholdFinancialState,
  request: InvestmentRequest
): InvestmentEngineResult {
  const isLumpSum = request.mode === 'lump_sum';
  const scenarios: InvestmentScenario[] = [];

  const monthlyObligations = calculateMonthlyObligations(
    state.monthlyEssentialExpenses,
    state.monthlyDebtServicing
  );

  const runwayBefore = state.emergencyRunwayMonths;
  const currentYear = new Date().getFullYear() || 2026;

  // Gate 1: Safety Gate (Emergency Reserve Gap)
  // Negative gap means deficit: target > liquid
  const emergencyReserveGap = state.emergencyReserveGap;
  const safetyDeficit = emergencyReserveGap < 0 ? Math.abs(emergencyReserveGap) : 0;

  // Gate 2: Debt Prepayment Gate (Liabilities with interestRatePct > 10%)
  const highInterestDebts = state.liabilities
    .filter((l) => Number(l.interestRatePct) > 10 && Number(l.outstandingBalance) > 0)
    .sort((a, b) => Number(b.interestRatePct) - Number(a.interestRatePct));

  const totalHighInterestDebt = highInterestDebts.reduce(
    (sum, l) => sum + (Number(l.outstandingBalance) || 0),
    0
  );

  // Gate 3: Allocation Realignment Gate (Underweight categories where deficitRupees > 0)
  const underweightCategories = Object.entries(state.allocationDrift)
    .filter(([_, item]) => item.deficitRupees > 0)
    .map(([cat, item]) => ({ category: cat, deficit: item.deficitRupees }));

  const totalAllocationDeficit = underweightCategories.reduce((sum, c) => sum + c.deficit, 0);

  // Gate 4: Goal Milestone Gate (P1 Goals)
  const p1Goals = [...state.goals]
    .filter((g) => g.priority === 'P1')
    .sort((a, b) => a.targetYear - b.targetYear);

  if (isLumpSum) {
    const totalAmount = Math.max(0, Number(request.lumpSumAmount) || 0);

    // =======================================================================
    // Scenario A: Safety & Debt Paydown
    // Priority: Fill Emergency Reserve Gap -> Prepay >10% Debt -> Target Mix Deployment
    // =======================================================================
    {
      const safetyReserveAlloc = Math.min(totalAmount, safetyDeficit);
      let remaining = totalAmount - safetyReserveAlloc;

      const debtPrepayAlloc = Math.min(remaining, totalHighInterestDebt);
      remaining -= debtPrepayAlloc;

      // Calculate guaranteed interest saved from prepaying high-interest debt
      let guaranteedInterestSaved = 0;
      let monthlyEmiReduction = 0;
      let debtRemainingToPay = debtPrepayAlloc;

      for (const debt of highInterestDebts) {
        if (debtRemainingToPay <= 0) break;
        const bal = Number(debt.outstandingBalance) || 0;
        const pay = Math.min(bal, debtRemainingToPay);
        const rate = (Number(debt.interestRatePct) || 0) / 100;
        guaranteedInterestSaved += pay * rate;

        const debtEmi = Number(debt.monthlyEmi) || 0;
        if (bal > 0) {
          monthlyEmiReduction += (pay / bal) * debtEmi;
        }
        debtRemainingToPay -= pay;
      }
      guaranteedInterestSaved = Math.round(guaranteedInterestSaved);
      monthlyEmiReduction = Math.round(monthlyEmiReduction);

      // Remaining capital deployed across asset classes using household configured target allocation
      const assetDeployments: AssetDeploymentItem[] = [];
      const addedAmounts: Record<string, number> = { cash: safetyReserveAlloc };

      // Configured target percentages
      const targetEntries = Object.entries(state.allocationDrift).filter(
        ([cat, _]) => cat.toLowerCase() !== 'cash'
      );
      const sumTargetPct = targetEntries.reduce((sum, [_, item]) => sum + (item.targetPct || 0), 0);

      if (remaining > 0 && sumTargetPct > 0) {
        for (const [cat, item] of targetEntries) {
          const catAmount = Math.round(remaining * (item.targetPct / sumTargetPct));
          assetDeployments.push({
            category: cat,
            amount: catAmount,
            suggestedInstrumentType: getSuggestedInstrumentType(cat),
          });
          addedAmounts[cat] = (addedAmounts[cat] || 0) + catAmount;
        }
      }

      // Runway after adding safety reserve to liquid cash
      const liquidCashAfter = state.liquidWealth + safetyReserveAlloc;
      const runwayAfter = calculateEmergencyRunway(liquidCashAfter, monthlyObligations);

      const driftChange = evaluateDriftChangeFromDeployment(state, addedAmounts);

      // Wealth projections (5Yr & 10Yr)
      // Conservative 9.5% p.a. market return on investments + compounded debt interest saved
      const investedAmount = remaining;
      const projectedWealth5Yr = Math.round(
        investedAmount * Math.pow(1 + 0.095, 5) +
          safetyReserveAlloc +
          guaranteedInterestSaved * 5
      );
      const projectedWealth10Yr = Math.round(
        investedAmount * Math.pow(1 + 0.095, 10) +
          safetyReserveAlloc +
          guaranteedInterestSaved * 10
      );

      const monthlyCashFlowBuffer = state.monthlySurplus + monthlyEmiReduction;

      scenarios.push({
        id: 'scenario-a-safety-debt',
        name: 'Scenario A: Safety & Debt Paydown',
        tier1Deployment: {
          safetyReserveAllocation: safetyReserveAlloc,
          debtPrepaymentAllocation: debtPrepayAlloc,
          assetDeployments,
        },
        tier2Consequences: {
          emergencyRunwayBefore: runwayBefore,
          emergencyRunwayAfter: runwayAfter,
          guaranteedInterestSaved,
          allocationDriftChange: driftChange,
          monthlyCashFlowBuffer,
          goalMilestoneImpact: [],
          projectedWealth5Yr,
          projectedWealth10Yr,
        },
        executionChecklist: [
          ...(safetyReserveAlloc > 0
            ? [
                `Transfer ₹${safetyReserveAlloc.toLocaleString('en-IN')} to liquid emergency reserve (increases runway from ${runwayBefore.toFixed(1)} to ${runwayAfter.toFixed(1)} months).`,
              ]
            : [`Emergency reserve is already fully funded at ${runwayBefore.toFixed(1)} months.`]),
          ...(debtPrepayAlloc > 0
            ? [
                `Prepay ₹${debtPrepayAlloc.toLocaleString('en-IN')} against high-interest liabilities (${highInterestDebts.map((d) => d.name).join(', ')}).`,
                `Saves guaranteed ₹${guaranteedInterestSaved.toLocaleString('en-IN')}/year in interest payments.`,
                `Frees up ₹${monthlyEmiReduction.toLocaleString('en-IN')}/month in cash flow.`,
              ]
            : [`No high-interest liabilities (>10%) requiring urgent prepayment.`]),
          ...(assetDeployments.length > 0
            ? [
                `Deploy remaining ₹${remaining.toLocaleString('en-IN')} according to household target allocation.`,
              ]
            : []),
        ],
      });
    }

    // =======================================================================
    // Scenario B: Allocation Realignment
    // Priority: Zero debt prepayment -> Close negative drift deficits -> Balance to Target
    // =======================================================================
    {
      const assetDeployments: AssetDeploymentItem[] = [];
      const addedAmounts: Record<string, number> = {};
      let remaining = totalAmount;

      if (totalAllocationDeficit > 0) {
        const allocatable = Math.min(totalAmount, totalAllocationDeficit);
        for (const item of underweightCategories) {
          const share = Math.round(allocatable * (item.deficit / totalAllocationDeficit));
          assetDeployments.push({
            category: item.category,
            amount: share,
            suggestedInstrumentType: getSuggestedInstrumentType(item.category),
          });
          addedAmounts[item.category] = (addedAmounts[item.category] || 0) + share;
        }
        remaining -= allocatable;
      }

      // If surplus remains after closing deficits, distribute by target allocation
      if (remaining > 0) {
        const targetEntries = Object.entries(state.allocationDrift).filter(
          ([cat, _]) => cat.toLowerCase() !== 'cash'
        );
        const sumTargetPct = targetEntries.reduce(
          (sum, [_, item]) => sum + (item.targetPct || 0),
          0
        );

        if (sumTargetPct > 0) {
          for (const [cat, item] of targetEntries) {
            const addAmt = Math.round(remaining * (item.targetPct / sumTargetPct));
            const existing = assetDeployments.find((d) => d.category === cat);
            if (existing) {
              existing.amount += addAmt;
            } else {
              assetDeployments.push({
                category: cat,
                amount: addAmt,
                suggestedInstrumentType: getSuggestedInstrumentType(cat),
              });
            }
            addedAmounts[cat] = (addedAmounts[cat] || 0) + addAmt;
          }
        }
      }

      const driftChange = evaluateDriftChangeFromDeployment(state, addedAmounts);
      const projectedWealth5Yr = Math.round(totalAmount * Math.pow(1 + 0.105, 5));
      const projectedWealth10Yr = Math.round(totalAmount * Math.pow(1 + 0.105, 10));

      scenarios.push({
        id: 'scenario-b-allocation-realignment',
        name: 'Scenario B: Allocation Realignment',
        tier1Deployment: {
          safetyReserveAllocation: 0,
          debtPrepaymentAllocation: 0,
          assetDeployments,
        },
        tier2Consequences: {
          emergencyRunwayBefore: runwayBefore,
          emergencyRunwayAfter: runwayBefore,
          guaranteedInterestSaved: 0,
          allocationDriftChange: driftChange,
          monthlyCashFlowBuffer: state.monthlySurplus,
          goalMilestoneImpact: [],
          projectedWealth5Yr,
          projectedWealth10Yr,
        },
        executionChecklist: [
          `Focus 100% of lump sum capital on eliminating portfolio allocation drift.`,
          ...assetDeployments.map(
            (d) =>
              `Deploy ₹${d.amount.toLocaleString('en-IN')} into ${d.category.toUpperCase()} (${d.suggestedInstrumentType}).`
          ),
          `Brings underweight asset classes back to alignment with household target allocation.`,
        ],
      });
    }

    // =======================================================================
    // Scenario C: Goal Acceleration
    // Priority: Focus on earliest underfunded P1 goals
    // =======================================================================
    {
      const assetDeployments: AssetDeploymentItem[] = [];
      const goalImpacts: GoalMilestoneImpactItem[] = [];
      const addedAmounts: Record<string, number> = {};
      let remaining = totalAmount;

      for (const goal of p1Goals) {
        if (remaining <= 0) break;

        const yearsRemaining = Math.max(0.5, goal.targetYear - currentYear);
        const monthsRemaining = Math.max(6, Math.round(yearsRemaining * 12));
        const requiredMonthlyRunRate = Math.max(100, goal.targetAmount / monthsRemaining);

        // Approximate goal current funding
        const alloc = Math.min(remaining, goal.targetAmount);
        const monthsAccelerated = Number(((alloc / requiredMonthlyRunRate)).toFixed(1));
        const gapReduced = alloc;

        goalImpacts.push({
          goalId: goal.id,
          goalName: goal.name,
          monthsAccelerated,
          gapReducedRupees: gapReduced,
        });

        // Determine appropriate asset category based on horizon
        const category = yearsRemaining > 5 ? 'equity' : yearsRemaining > 2 ? 'hybrid' : 'debt';
        assetDeployments.push({
          category,
          amount: alloc,
          suggestedInstrumentType: getSuggestedInstrumentType(category),
        });
        addedAmounts[category] = (addedAmounts[category] || 0) + alloc;

        remaining -= alloc;
      }

      // If capital remains or no P1 goals exist, allocate by target allocation
      if (remaining > 0) {
        const cat = 'equity';
        assetDeployments.push({
          category: cat,
          amount: remaining,
          suggestedInstrumentType: getSuggestedInstrumentType(cat),
        });
        addedAmounts[cat] = (addedAmounts[cat] || 0) + remaining;
      }

      const driftChange = evaluateDriftChangeFromDeployment(state, addedAmounts);
      const projectedWealth5Yr = Math.round(totalAmount * Math.pow(1 + 0.10, 5));
      const projectedWealth10Yr = Math.round(totalAmount * Math.pow(1 + 0.10, 10));

      scenarios.push({
        id: 'scenario-c-goal-acceleration',
        name: 'Scenario C: Goal Acceleration',
        tier1Deployment: {
          safetyReserveAllocation: 0,
          debtPrepaymentAllocation: 0,
          assetDeployments,
        },
        tier2Consequences: {
          emergencyRunwayBefore: runwayBefore,
          emergencyRunwayAfter: runwayBefore,
          guaranteedInterestSaved: 0,
          allocationDriftChange: driftChange,
          monthlyCashFlowBuffer: state.monthlySurplus,
          goalMilestoneImpact: goalImpacts,
          projectedWealth5Yr,
          projectedWealth10Yr,
        },
        executionChecklist: [
          `Dedicate capital directly to high-priority family life milestones.`,
          ...goalImpacts.map(
            (g) =>
              `Accelerate '${g.goalName}' by ${g.monthsAccelerated} months (funding gap reduced by ₹${g.gapReducedRupees.toLocaleString('en-IN')}).`
          ),
          ...assetDeployments.map(
            (d) =>
              `Deploy ₹${d.amount.toLocaleString('en-IN')} in ${d.suggestedInstrumentType} tailored for goal horizon.`
          ),
        ],
      });
    }
  } else {
    // =======================================================================
    // Mode 2: Recurring SIP Planning
    // Cash Flow Gate: Evaluates commitment against monthly surplus.
    // Zero hardcoded 60:30:10 mandates (uses household's configured target allocation).
    // =======================================================================
    const monthlyCommitment = Math.max(0, Number(request.monthlyCommitment) || 0);
    const stepUpPct = request.optionalStepUpPct || 0;
    const monthlyCashFlowBuffer = Number((state.monthlySurplus - monthlyCommitment).toFixed(2));

    const cashFlowSafetyRatio =
      state.monthlySurplus > 0 ? (monthlyCommitment / state.monthlySurplus) * 100 : 100;

    const cashFlowChecklistNotes: string[] = [];
    if (monthlyCommitment > state.monthlySurplus) {
      cashFlowChecklistNotes.push(
        `WARNING: Proposed monthly SIP (₹${monthlyCommitment.toLocaleString('en-IN')}) exceeds monthly surplus (₹${state.monthlySurplus.toLocaleString('en-IN')}). High cash-flow stress.`
      );
    } else if (cashFlowSafetyRatio > 80) {
      cashFlowChecklistNotes.push(
        `CAUTION: Proposed SIP consumes ${cashFlowSafetyRatio.toFixed(0)}% of monthly surplus (above 80% safety ceiling). Cash flow buffer is tight at ₹${monthlyCashFlowBuffer.toLocaleString('en-IN')}/month.`
      );
    } else {
      cashFlowChecklistNotes.push(
        `Comfortable cash flow buffer: ₹${monthlyCashFlowBuffer.toLocaleString('en-IN')}/month remaining after SIP commitment.`
      );
    }

    // -----------------------------------------------------------------------
    // Recurring Scenario A: Target Mix Split
    // Routes SIP according to household's configured target allocation
    // -----------------------------------------------------------------------
    {
      const monthlySplit: { category: string; monthlyAmount: number }[] = [];
      const annualizedDeployments: AssetDeploymentItem[] = [];
      const addedAmountsAnnual: Record<string, number> = {};

      const targetEntries = Object.entries(state.allocationDrift).filter(
        ([cat, _]) => cat.toLowerCase() !== 'cash'
      );
      const sumTargetPct = targetEntries.reduce((sum, [_, item]) => sum + (item.targetPct || 0), 0);

      if (sumTargetPct > 0) {
        for (const [cat, item] of targetEntries) {
          const catMonthly = Math.round(monthlyCommitment * (item.targetPct / sumTargetPct));
          monthlySplit.push({
            category: cat,
            monthlyAmount: catMonthly,
          });
          annualizedDeployments.push({
            category: cat,
            amount: catMonthly * 12,
            suggestedInstrumentType: getSuggestedInstrumentType(cat),
          });
          addedAmountsAnnual[cat] = catMonthly * 12;
        }
      }

      const driftChange = evaluateDriftChangeFromDeployment(state, addedAmountsAnnual);

      // SIP FV projections (blended ~10.5% return)
      const projectedWealth5Yr = calculateSipFutureValue(monthlyCommitment, 0.105, 5, stepUpPct);
      const projectedWealth10Yr = calculateSipFutureValue(monthlyCommitment, 0.105, 10, stepUpPct);

      scenarios.push({
        id: 'scenario-a-target-mix-sip',
        name: 'Scenario A: Target Mix Split',
        tier1Deployment: {
          safetyReserveAllocation: 0,
          debtPrepaymentAllocation: 0,
          assetDeployments: annualizedDeployments,
          monthlyCommitmentSplit: monthlySplit,
        },
        tier2Consequences: {
          emergencyRunwayBefore: runwayBefore,
          emergencyRunwayAfter: runwayBefore,
          guaranteedInterestSaved: 0,
          allocationDriftChange: driftChange,
          monthlyCashFlowBuffer,
          goalMilestoneImpact: [],
          projectedWealth5Yr,
          projectedWealth10Yr,
        },
        executionChecklist: [
          ...cashFlowChecklistNotes,
          `Set up recurring auto-debit / NACH mandates for total ₹${monthlyCommitment.toLocaleString('en-IN')}/month.`,
          ...monthlySplit.map(
            (s) =>
              `Route ₹${s.monthlyAmount.toLocaleString('en-IN')}/month to ${s.category.toUpperCase()} (${getSuggestedInstrumentType(s.category)}).`
          ),
          stepUpPct > 0
            ? `Configure annual step-up of ${stepUpPct}% on SIP anniversary.`
            : `Review SIP allocations annually to match evolving target asset mix.`,
        ],
      });
    }

    // -----------------------------------------------------------------------
    // Recurring Scenario B: Goal-Targeted Split
    // Routes monthly run rate to close P1 goal deficits first
    // -----------------------------------------------------------------------
    {
      const monthlySplit: { category: string; monthlyAmount: number }[] = [];
      const annualizedDeployments: AssetDeploymentItem[] = [];
      const goalImpacts: GoalMilestoneImpactItem[] = [];
      const addedAmountsAnnual: Record<string, number> = {};

      const goalRequirements = p1Goals.map((g) => {
        const yearsRemaining = Math.max(0.5, g.targetYear - currentYear);
        const monthsRemaining = Math.max(6, Math.round(yearsRemaining * 12));
        const requiredMonthly = Math.max(100, g.targetAmount / monthsRemaining);
        return {
          goal: g,
          yearsRemaining,
          requiredMonthly,
        };
      });

      const totalRequiredMonthly = goalRequirements.reduce(
        (sum, item) => sum + item.requiredMonthly,
        0
      );

      if (goalRequirements.length > 0 && totalRequiredMonthly > 0) {
        for (const req of goalRequirements) {
          const goalMonthly = Math.round(
            monthlyCommitment * (req.requiredMonthly / totalRequiredMonthly)
          );
          const monthsAccelerated = Number(((goalMonthly * 12) / req.requiredMonthly).toFixed(1));
          const gapReduced = goalMonthly * 12;

          goalImpacts.push({
            goalId: req.goal.id,
            goalName: req.goal.name,
            monthsAccelerated,
            gapReducedRupees: gapReduced,
          });

          const cat =
            req.yearsRemaining > 5 ? 'equity' : req.yearsRemaining > 2 ? 'hybrid' : 'debt';
          monthlySplit.push({
            category: cat,
            monthlyAmount: goalMonthly,
          });
          annualizedDeployments.push({
            category: cat,
            amount: goalMonthly * 12,
            suggestedInstrumentType: getSuggestedInstrumentType(cat),
          });
          addedAmountsAnnual[cat] = (addedAmountsAnnual[cat] || 0) + goalMonthly * 12;
        }
      } else {
        // Fallback to equity if no P1 goals exist
        monthlySplit.push({ category: 'equity', monthlyAmount: monthlyCommitment });
        annualizedDeployments.push({
          category: 'equity',
          amount: monthlyCommitment * 12,
          suggestedInstrumentType: getSuggestedInstrumentType('equity'),
        });
        addedAmountsAnnual['equity'] = monthlyCommitment * 12;
      }

      const driftChange = evaluateDriftChangeFromDeployment(state, addedAmountsAnnual);
      const projectedWealth5Yr = calculateSipFutureValue(monthlyCommitment, 0.105, 5, stepUpPct);
      const projectedWealth10Yr = calculateSipFutureValue(monthlyCommitment, 0.105, 10, stepUpPct);

      scenarios.push({
        id: 'scenario-b-goal-targeted-sip',
        name: 'Scenario B: Goal-Targeted Split',
        tier1Deployment: {
          safetyReserveAllocation: 0,
          debtPrepaymentAllocation: 0,
          assetDeployments: annualizedDeployments,
          monthlyCommitmentSplit: monthlySplit,
        },
        tier2Consequences: {
          emergencyRunwayBefore: runwayBefore,
          emergencyRunwayAfter: runwayBefore,
          guaranteedInterestSaved: 0,
          allocationDriftChange: driftChange,
          monthlyCashFlowBuffer,
          goalMilestoneImpact: goalImpacts,
          projectedWealth5Yr,
          projectedWealth10Yr,
        },
        executionChecklist: [
          ...cashFlowChecklistNotes,
          `Direct monthly SIPs specifically toward high-priority milestones.`,
          ...goalImpacts.map(
            (g) =>
              `Accelerate '${g.goalName}' by ${g.monthsAccelerated} months/year (reduces annual gap by ₹${g.gapReducedRupees.toLocaleString('en-IN')}).`
          ),
          `Setup goal-tagged mutual fund folios to separate goal tracking from general wealth.`,
        ],
      });
    }
  }

  const snapshot = createScenarioSnapshot(
    state,
    request as unknown as Record<string, unknown>,
    { request },
    { scenarios }
  );

  return {
    request,
    scenarios,
    snapshot,
  };
}
