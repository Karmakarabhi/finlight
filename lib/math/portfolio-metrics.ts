import { Portfolio, Holding, InvestmentTransaction, InvestmentGoal } from '@/db/schema';

export type PortfolioMetricsContext = ReturnType<typeof buildPortfolioMetrics>;

export function buildPortfolioMetrics(
  portfolio: any,
  holdings: any[],
  transactions: any[],
  goals: any[]
) {
  let totalInvested = 0;
  let currentValue = 0;

  for (const h of holdings) {
    const units = Number(h.totalUnits ?? h.units ?? 0);
    const avgCost = Number(h.avgCost ?? h.currentPrice ?? 0);
    const nav = Number(h.currentPrice ?? h.currentNav ?? avgCost);
    totalInvested += avgCost * units;
    currentValue += nav * units;
  }

  const absoluteGain = currentValue - totalInvested;
  const gainPercent = totalInvested > 0
    ? Number(((absoluteGain / totalInvested) * 100).toFixed(2))
    : 0;

  const categoryBuckets: Record<string, number> = {};
  for (const h of holdings) {
    const cat = h.category || 'Other';
    const units = Number(h.totalUnits ?? h.units ?? 0);
    const nav = Number(h.currentPrice ?? h.currentNav ?? 0);
    if (!categoryBuckets[cat]) categoryBuckets[cat] = 0;
    categoryBuckets[cat] += nav * units;
  }

  const assetAllocation: Record<string, number> = {};
  for (const [cat, val] of Object.entries(categoryBuckets)) {
    assetAllocation[cat] = currentValue > 0
      ? Number(((val / currentValue) * 100).toFixed(1))
      : 0;
  }

  const equityCategories = ['Equity', 'equity'];
  const debtCategories = ['Debt', 'debt', 'Liquid', 'FD', 'Savings', 'cash'];
  const goldCategories = ['Gold', 'gold'];

  const actualEquityPct = sumPcts(assetAllocation, equityCategories);
  const actualDebtPct = sumPcts(assetAllocation, debtCategories);
  const actualGoldPct = sumPcts(assetAllocation, goldCategories);

  const capBuckets: Record<string, number> = {};
  for (const h of holdings) {
    if ((h.category || '').toLowerCase() !== 'equity') continue;
    const cap = h.capType || 'None';
    const units = Number(h.totalUnits ?? h.units ?? 0);
    const nav = Number(h.currentPrice ?? h.currentNav ?? 0);
    if (!capBuckets[cap]) capBuckets[cap] = 0;
    capBuckets[cap] += nav * units;
  }

  const equityValue = categoryBuckets['Equity'] || categoryBuckets['equity'] || 0;
  const capAllocation: Record<string, number> = {};
  for (const [cap, val] of Object.entries(capBuckets)) {
    capAllocation[cap] = equityValue > 0
      ? Number(((val / equityValue) * 100).toFixed(1))
      : 0;
  }

  const holdingWeights = holdings.map(h => {
    const units = Number(h.totalUnits ?? h.units ?? 0);
    const nav = Number(h.currentPrice ?? h.currentNav ?? 0);
    const avgCost = Number(h.avgCost ?? nav);
    const value = nav * units;
    return {
      name: h.name,
      type: h.type || h.assetType || 'MF',
      category: h.category,
      value,
      weight: currentValue > 0
        ? Number(((value / currentValue) * 100).toFixed(1))
        : 0,
      gain: avgCost > 0
        ? Number((((nav - avgCost) / avgCost) * 100).toFixed(1))
        : 0,
    };
  }).sort((a, b) => b.value - a.value);

  const largestHolding = holdingWeights[0] || null;
  const highConcentration = holdingWeights.filter(h => h.weight > 15);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentTxs = transactions
    .filter(tx => new Date(tx.date) >= thirtyDaysAgo)
    .map(tx => ({
      type: tx.type,
      amount: Number(tx.amount),
      date: tx.date,
    }));

  const upcomingMaturities = holdings
    .filter(h => {
      if (!h.maturityDate) return false;
      const daysLeft = (new Date(h.maturityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      return daysLeft > 0 && daysLeft <= 90;
    })
    .map(h => {
      const daysLeft = Math.ceil((new Date(h.maturityDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const units = Number(h.totalUnits ?? h.units ?? 0);
      const cost = Number(h.avgCost ?? h.currentPrice ?? 0);
      return { 
        name: h.name, 
        daysLeft, 
        value: cost * units 
      };
    });

  const goalProgress = goals.map(g => {
    const targetAmt = Number(g.targetAmount);
    const progressPct = targetAmt > 0
      ? Number(((currentValue / targetAmt) * 100).toFixed(1))
      : 0;
    const daysLeft = Math.ceil((new Date(g.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return {
      name: g.name,
      target: targetAmt,
      current: currentValue,
      progressPct,
      daysLeft: daysLeft > 0 ? daysLeft : 0,
    };
  });

  const targetEquity = Number(portfolio.targetEquityPct ?? 60);
  const targetDebt = Number(portfolio.targetDebtPct ?? 30);
  const targetGold = Number(portfolio.targetGoldPct ?? 10);

  const equityDelta = Number((actualEquityPct - targetEquity).toFixed(1));
  const debtDelta = Number((actualDebtPct - targetDebt).toFixed(1));
  const goldDelta = Number((actualGoldPct - targetGold).toFixed(1));

  const toRupees = (deltaPct: number) =>
    currentValue > 0 ? Math.round((deltaPct / 100) * currentValue) : 0;

  const rebalancing = {
    equity: {
      actual: actualEquityPct,
      target: targetEquity,
      delta: equityDelta,
      excessValue: toRupees(equityDelta),
    },
    debt: {
      actual: actualDebtPct,
      target: targetDebt,
      delta: debtDelta,
      excessValue: toRupees(debtDelta),
    },
    gold: {
      actual: actualGoldPct,
      target: targetGold,
      delta: goldDelta,
      excessValue: toRupees(goldDelta),
    },
  };

  return {
    portfolio: {
      name: portfolio.name,
      memberName: portfolio.memberName,
      riskProfile: portfolio.riskProfile ?? 'Moderate',
      currency: portfolio.currency ?? 'INR',
    },
    summary: {
      totalInvested: Math.round(totalInvested),
      currentValue: Math.round(currentValue),
      absoluteGain: Math.round(absoluteGain),
      gainPercent,
      holdingCount: holdings.length,
    },
    assetAllocation,
    rebalancing,
    capAllocation,
    largestHolding,
    highConcentration,
    holdingWeights: holdingWeights.slice(0, 10),
    recentTxs,
    upcomingMaturities,
    goalProgress,
  };
}

function sumPcts(allocationMap: Record<string, number>, categories: string[]): number {
  return Number(
    categories
      .reduce((sum, cat) => sum + (allocationMap[cat] || 0), 0)
      .toFixed(1)
  );
}
