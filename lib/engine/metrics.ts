/**
 * Finlight V1: Pure Mathematical Metrics & Decision Solvers
 * Strictly adheres to docs/FINLIGHT_V1_SPECIFICATION.md
 *
 * NOTE: Pure TypeScript functions. No DB imports, no React imports, no external API calls.
 */

import {
  Holding,
  CashAccount,
  Liability,
  LifeGoal,
  FamilyMember,
  TargetAllocation,
  EmergencyAdjustmentFactors,
  AllocationDriftItem,
  TripartiteRiskProfile,
  RiskCapacityLevel,
  RiskToleranceLevel,
} from './types';

/**
 * 1. calculateGrossWealth
 * Gross Wealth = Liquid Wealth + Invested Wealth + Fixed Wealth
 * Reference: docs/FINLIGHT_V1_SPECIFICATION.md Section 2.1
 */
export function calculateGrossWealth(
  liquid: number,
  invested: number,
  fixed: number
): number {
  const l = Number(liquid) || 0;
  const i = Number(invested) || 0;
  const f = Number(fixed) || 0;
  return Number((l + i + f).toFixed(2));
}

/**
 * 2. calculateNetWorth
 * Net Worth = Gross Wealth - Total Liabilities
 * Reference: docs/FINLIGHT_V1_SPECIFICATION.md Section 2.1
 */
export function calculateNetWorth(
  gross: number,
  liabilities: number
): number {
  const g = Number(gross) || 0;
  const l = Number(liabilities) || 0;
  return Number((g - l).toFixed(2));
}

/**
 * 3. calculateEmergencyRunway
 * Emergency Runway (Months) = Liquid Cash / Monthly Obligations
 * Monthly Obligations = Essential Expenses + Debt Servicing (EMIs)
 * Reference: docs/FINLIGHT_V1_SPECIFICATION.md Section 2.2
 */
export function calculateEmergencyRunway(
  liquidCash: number,
  monthlyObligations: number
): number {
  const cash = Number(liquidCash) || 0;
  const obligations = Number(monthlyObligations) || 0;

  if (obligations <= 0) {
    return cash > 0 ? Number.POSITIVE_INFINITY : 0;
  }
  if (cash <= 0) {
    return 0;
  }

  return Number((cash / obligations).toFixed(2));
}

/**
 * 4. calculateEmergencyReserveTarget
 * Emergency Reserve Target = Monthly Obligations * Configured Months
 * Reference: docs/FINLIGHT_V1_SPECIFICATION.md Section 2.2
 */
export function calculateEmergencyReserveTarget(
  monthlyObligations: number,
  baseMonths: number,
  adjustmentFactors?: EmergencyAdjustmentFactors | Record<string, number> | number
): number {
  const obligations = Math.max(0, Number(monthlyObligations) || 0);
  let months = Math.max(0, Number(baseMonths) || 0);

  if (typeof adjustmentFactors === 'number') {
    months = Math.max(0, months + adjustmentFactors);
  } else if (adjustmentFactors && typeof adjustmentFactors === 'object') {
    let additive = 0;
    let multiplier = 1.0;

    for (const [key, val] of Object.entries(adjustmentFactors)) {
      if (typeof val === 'number' && !Number.isNaN(val)) {
        if (key === 'multiplier') {
          multiplier = val;
        } else {
          additive += val;
        }
      }
    }

    months = Math.max(0, (months + additive) * multiplier);
  }

  return Number((obligations * months).toFixed(2));
}

/**
 * 5. calculateDecisionAvailableCash
 * Decision-Available Cash = Liquid Cash - Protected Emergency Reserve - Known Near-Term Obligations
 * Reference: docs/FINLIGHT_V1_SPECIFICATION.md Section 2.2
 */
export function calculateDecisionAvailableCash(
  liquidCash: number,
  protectedEmergencyReserve: number,
  nearTermObligations: number = 0
): number {
  const cash = Number(liquidCash) || 0;
  const reserve = Number(protectedEmergencyReserve) || 0;
  const obligations = Number(nearTermObligations) || 0;

  return Number((cash - reserve - obligations).toFixed(2));
}

/**
 * Helper to calculate monthly obligations (Essential Expenses + Debt Servicing)
 */
export function calculateMonthlyObligations(
  essentialExpenses: number,
  debtServicing: number
): number {
  return Number(((Number(essentialExpenses) || 0) + (Number(debtServicing) || 0)).toFixed(2));
}

/**
 * Helper to calculate monthly surplus
 * Monthly Surplus = Inflow - Essential Expenses - Debt Servicing - Discretionary Expenses
 */
export function calculateMonthlySurplus(
  inflow: number,
  essentialExpenses: number,
  debtServicing: number,
  discretionaryExpenses: number
): number {
  const totalOutflows =
    (Number(essentialExpenses) || 0) +
    (Number(debtServicing) || 0) +
    (Number(discretionaryExpenses) || 0);
  return Number(((Number(inflow) || 0) - totalOutflows).toFixed(2));
}

/**
 * 6. calculateAllocationDrift
 * Evaluates asset allocation across target categories (equity, debt, gold, cash).
 * Handles Indian hybrid funds (65% equity / 35% debt standard split unless hybrid target is specified).
 * Reference: docs/FINLIGHT_V1_SPECIFICATION.md Section 2.1 & 6.1
 */
export function calculateAllocationDrift(
  holdings: Holding[],
  cashAccounts: CashAccount[],
  targetAllocation: TargetAllocation
): Record<string, AllocationDriftItem> {
  const actualAmounts: Record<string, number> = {
    equity: 0,
    debt: 0,
    gold: 0,
    cash: 0,
  };

  // 1. All cash accounts are pure liquid cash
  for (const acc of cashAccounts) {
    const bal = Number(acc.currentBalance) || 0;
    actualAmounts.cash += bal;
  }

  const hasExplicitHybridTarget =
    targetAllocation.hybridPct !== undefined && targetAllocation.hybridPct > 0;
  if (hasExplicitHybridTarget) {
    actualAmounts.hybrid = 0;
  }

  // 2. Classify holdings
  for (const h of holdings) {
    const val = Number(h.currentValue) || 0;
    const cat = (h.category || '').toLowerCase();
    const assetType = h.assetType;

    if (assetType === 'FD') {
      // Contractual fixed deposits belong to debt
      actualAmounts.debt += val;
    } else if (cat === 'cash') {
      actualAmounts.cash += val;
    } else if (cat === 'equity') {
      actualAmounts.equity += val;
    } else if (cat === 'debt') {
      actualAmounts.debt += val;
    } else if (cat === 'gold') {
      actualAmounts.gold += val;
    } else if (cat === 'hybrid') {
      if (hasExplicitHybridTarget) {
        actualAmounts.hybrid = (actualAmounts.hybrid || 0) + val;
      } else {
        // Standard Indian SEBI Aggressive / Dynamic Hybrid split: 65% Equity / 35% Debt
        actualAmounts.equity += val * 0.65;
        actualAmounts.debt += val * 0.35;
      }
    } else {
      // Custom / unknown category
      actualAmounts[cat] = (actualAmounts[cat] || 0) + val;
    }
  }

  // Also include any categories present in targetAllocation
  for (const key of Object.keys(targetAllocation)) {
    const cleanKey = key.replace(/Pct$/i, '').toLowerCase();
    if (actualAmounts[cleanKey] === undefined) {
      actualAmounts[cleanKey] = 0;
    }
  }

  // Total portfolio value
  const totalPortfolioWealth = Object.values(actualAmounts).reduce((sum, v) => sum + v, 0);

  const driftRecord: Record<string, AllocationDriftItem> = {};

  for (const category of Object.keys(actualAmounts)) {
    const actualRupees = Number(actualAmounts[category].toFixed(2));

    // Target percentage lookup: handles both 'equityPct' and 'equity'
    const targetPctLookup =
      targetAllocation[`${category}Pct`] ??
      targetAllocation[category] ??
      0;
    const targetPct = Number(Number(targetPctLookup).toFixed(2));

    let actualPct = 0;
    if (totalPortfolioWealth > 0) {
      actualPct = Number(((actualRupees / totalPortfolioWealth) * 100).toFixed(2));
    }

    const driftPct = Number((actualPct - targetPct).toFixed(2));
    const targetRupees = Number(((targetPct / 100) * totalPortfolioWealth).toFixed(2));
    // deficitRupees: amount needed to reach target (positive = deficit / underweight)
    const deficitRupees = Number((targetRupees - actualRupees).toFixed(2));

    driftRecord[category] = {
      targetPct,
      actualPct,
      driftPct,
      deficitRupees,
    };
  }

  return driftRecord;
}

/**
 * 7. evaluateTripartiteRisk
 * Separates risk into three non-collapsible dimensions:
 * 1. Risk Capacity: deterministic evaluation from cash flow surplus, runway, liabilities, and dependents.
 * 2. Risk Tolerance: investor's psychological drawdown comfort.
 * 3. Risk Requirement: mathematically required return to achieve active family life goals.
 * Reference: docs/FINLIGHT_V1_SPECIFICATION.md Section 2.3
 */
export function evaluateTripartiteRisk(
  inflow: number,
  surplus: number,
  runway: number,
  liabilities: Liability[] | number,
  dependents: FamilyMember[] | number,
  goals: LifeGoal[] = [],
  tolerance: 'Conservative' | 'Moderate' | 'Aggressive' = 'Moderate',
  currentCorpus?: number
): TripartiteRiskProfile {
  const rationale: string[] = [];
  let capacityScore = 0;

  // --- Dimension 1: Risk Capacity ---

  // Factor A: Emergency Runway
  const numRunway = Number(runway) || 0;
  if (numRunway >= 12) {
    capacityScore += 3;
    rationale.push(
      `Emergency runway is robust at ${numRunway.toFixed(1)} months (well above the 6-month safety threshold).`
    );
  } else if (numRunway >= 6) {
    capacityScore += 2;
    rationale.push(
      `Emergency runway is healthy at ${numRunway.toFixed(1)} months (meets the 6-month safety benchmark).`
    );
  } else if (numRunway >= 3) {
    capacityScore += 1;
    rationale.push(
      `Emergency runway is tight at ${numRunway.toFixed(1)} months (below recommended 6-month reserve).`
    );
  } else {
    capacityScore += 0;
    rationale.push(
      `Emergency runway is critical at ${numRunway.toFixed(1)} months (under 3 months; elevated vulnerability).`
    );
  }

  // Factor B: Monthly Surplus & Savings Rate
  const numInflow = Math.max(0, Number(inflow) || 0);
  const numSurplus = Number(surplus) || 0;
  const surplusRatio = numInflow > 0 ? numSurplus / numInflow : 0;

  if (numSurplus <= 0) {
    capacityScore += 0;
    rationale.push(
      `Monthly cash flow is zero or in deficit (surplus: ₹${Math.round(numSurplus).toLocaleString('en-IN')}); no free buffer for shocks.`
    );
  } else if (surplusRatio >= 0.35) {
    capacityScore += 3;
    rationale.push(
      `High monthly savings rate (${Math.round(surplusRatio * 100)}% of income); strong ongoing absorption capacity.`
    );
  } else if (surplusRatio >= 0.15) {
    capacityScore += 2;
    rationale.push(
      `Healthy monthly savings rate (${Math.round(surplusRatio * 100)}% of income); adequate loss absorption capacity.`
    );
  } else {
    capacityScore += 1;
    rationale.push(
      `Thin monthly savings rate (${Math.round(surplusRatio * 100)}% of income); limited margin for unexpected expenses.`
    );
  }

  // Factor C: Debt Burden & Servicing
  let totalDebt = 0;
  let totalEmi = 0;

  if (Array.isArray(liabilities)) {
    totalDebt = liabilities.reduce((sum, l) => sum + (Number(l.outstandingBalance) || 0), 0);
    totalEmi = liabilities.reduce((sum, l) => sum + (Number(l.monthlyEmi) || 0), 0);
  } else {
    totalDebt = Number(liabilities) || 0;
  }

  if (totalDebt <= 0 && totalEmi <= 0) {
    capacityScore += 3;
    rationale.push('Zero outstanding liabilities; household carries no mandatory debt servicing.');
  } else {
    const emiRatio = numInflow > 0 ? totalEmi / numInflow : 0.4;
    if (emiRatio <= 0.2) {
      capacityScore += 2;
      rationale.push(
        `Manageable debt servicing (EMIs consume ${Math.round(emiRatio * 100)}% of monthly income).`
      );
    } else if (emiRatio <= 0.4) {
      capacityScore += 1;
      rationale.push(
        `Moderate debt servicing (EMIs consume ${Math.round(emiRatio * 100)}% of monthly income).`
      );
    } else {
      capacityScore += 0;
      rationale.push(
        `Heavy debt servicing (EMIs consume ${Math.round(emiRatio * 100)}% of monthly income; fixed overhead is high).`
      );
    }
  }

  // Factor D: Dependency Ratio
  let dependentCount = 0;
  if (Array.isArray(dependents)) {
    dependentCount = dependents.filter(
      (m) =>
        (Number(m.monthlyIncome) || 0) === 0 ||
        m.age < 18 ||
        m.relation === 'Child' ||
        m.relation === 'Father' ||
        m.relation === 'Mother'
    ).length;
  } else {
    dependentCount = Math.max(0, Number(dependents) || 0);
  }

  if (dependentCount === 0) {
    capacityScore += 2;
    rationale.push('No financial dependents; maximum financial flexibility.');
  } else if (dependentCount <= 2) {
    capacityScore += 1;
    rationale.push(`Household supports ${dependentCount} dependent(s); standard family commitments.`);
  } else {
    capacityScore += 0;
    rationale.push(`Household supports ${dependentCount} dependents (higher essential commitments).`);
  }

  // Determine Capacity Level (Max Score: 3 + 3 + 3 + 2 = 11)
  let capacityLevel: RiskCapacityLevel = 'Low';
  if (capacityScore >= 8 && numRunway >= 4 && numSurplus > 0) {
    capacityLevel = 'High';
  } else if (capacityScore >= 4 && numRunway >= 1.5) {
    capacityLevel = 'Moderate';
  } else {
    capacityLevel = 'Low';
  }

  // --- Dimension 2: Risk Tolerance ---
  const validTolerance: RiskToleranceLevel =
    tolerance === 'Conservative' || tolerance === 'Aggressive' || tolerance === 'Moderate'
      ? tolerance
      : 'Moderate';

  // --- Dimension 3: Risk Requirement ---
  const currentYear = new Date().getFullYear();
  const activeGoals = (goals || []).filter((g) => (Number(g.targetAmount) || 0) > 0);

  let requiredReturnPct = 6.0;
  let requirementRationale = '';

  if (activeGoals.length === 0) {
    requiredReturnPct = 6.0;
    requirementRationale =
      'No active life goals defined; baseline required return set to 6.0% to outpace inflation.';
  } else {
    const totalTargetAmount = activeGoals.reduce(
      (sum, g) => sum + (Number(g.targetAmount) || 0),
      0
    );

    const weightedHorizon =
      activeGoals.reduce((sum, g) => {
        const years = Math.max(1, (Number(g.targetYear) || currentYear) - currentYear);
        return sum + years * (Number(g.targetAmount) || 0);
      }, 0) / totalTargetAmount;

    const effectiveHorizon = Math.max(1, Number(weightedHorizon.toFixed(1)));
    const corpus = Math.max(0, Number(currentCorpus) || 0);

    if (corpus >= totalTargetAmount) {
      requiredReturnPct = 0.0;
      requirementRationale = `Active goals (₹${(totalTargetAmount / 100000).toFixed(1)}L) are fully funded by existing portfolio assets; 0.0% capital growth required.`;
    } else if (corpus > 0) {
      // Solve required CAGR: (FV / PV)^(1/T) - 1
      const cagr = (Math.pow(totalTargetAmount / corpus, 1 / effectiveHorizon) - 1) * 100;
      requiredReturnPct = Number(Math.min(30, Math.max(0, cagr)).toFixed(1));
      requirementRationale = `Achieving ₹${(totalTargetAmount / 100000).toFixed(1)}L across ${activeGoals.length} goal(s) over ~${effectiveHorizon} years requires an annualized portfolio return of ${requiredReturnPct}%.`;
    } else if (numSurplus > 0) {
      // No corpus, but positive surplus: check if savings alone fund it
      const totalSavingsOverHorizon = numSurplus * 12 * effectiveHorizon;
      if (totalSavingsOverHorizon >= totalTargetAmount) {
        requiredReturnPct = 6.0;
        requirementRationale = `Target amount of ₹${(totalTargetAmount / 100000).toFixed(1)}L over ${effectiveHorizon} years can be met through monthly cash surplus (₹${Math.round(numSurplus).toLocaleString('en-IN')}/mo) at a modest 6.0% return.`;
      } else {
        // Binary search for required monthly SIP return r
        let low = 0.01;
        let high = 0.4;
        let bestR = 0.12;

        for (let iter = 0; iter < 20; iter++) {
          const mid = (low + high) / 2;
          const monthlyRate = mid / 12;
          const monthsCount = effectiveHorizon * 12;
          const fv = numSurplus * ((Math.pow(1 + monthlyRate, monthsCount) - 1) / monthlyRate);

          if (fv < totalTargetAmount) {
            low = mid;
          } else {
            bestR = mid;
            high = mid;
          }
        }

        requiredReturnPct = Number(Math.min(30, Math.max(1, bestR * 100)).toFixed(1));
        requirementRationale = `Achieving ₹${(totalTargetAmount / 100000).toFixed(1)}L over ${effectiveHorizon} years requires an estimated ${requiredReturnPct}% annualized return given monthly surplus allocation.`;
      }
    } else {
      requiredReturnPct = 12.0;
      requirementRationale = `No existing asset base or monthly surplus allocated to ₹${(totalTargetAmount / 100000).toFixed(1)}L in active goals; standard long-term equity growth rate of 12.0% required.`;
    }
  }

  return {
    riskCapacity: {
      level: capacityLevel,
      rationale,
    },
    riskTolerance: {
      level: validTolerance,
    },
    riskRequirement: {
      requiredReturnPct,
      rationale: requirementRationale,
    },
  };
}
