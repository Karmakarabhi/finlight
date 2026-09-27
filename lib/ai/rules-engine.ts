import { PortfolioMetricsContext } from '../math/portfolio-metrics';

export const THRESHOLDS = {
  ALLOCATION_WARNING: 5,
  ALLOCATION_CAUTION: 15, // Note: the prompt says WARNING=5, CAUTION=15, let's keep them as specified
  CONCENTRATION_WARNING: 15,
  CONCENTRATION_CAUTION: 25,
  MIN_HOLDINGS: 3,
  MIN_ASSET_TYPES: 2,
  GOAL_RISK: 50,
  MATURITY_WINDOW: 90, // <=90 days is upcoming
  IMMINENT_MATURITY: 30,
};

export type FindingType = 'allocation' | 'concentration' | 'diversification' | 'goal_risk' | 'maturity' | 'performance';
export type FindingSeverity = 'info' | 'warning' | 'critical';

export interface Finding {
  type: FindingType;
  severity: FindingSeverity;
  message: string;
}

export function runRules(metrics: PortfolioMetricsContext) {
  const findings: Finding[] = [];

  // Allocation
  const reb = metrics.rebalancing;
  const maxDev = Math.max(
    Math.abs(reb.equity.delta),
    Math.abs(reb.debt.delta),
    Math.abs(reb.gold.delta)
  );
  if (maxDev >= THRESHOLDS.ALLOCATION_CAUTION) {
    findings.push({ type: 'allocation', severity: 'critical', message: `High allocation deviation (${maxDev.toFixed(1)}%). Rebalancing recommended.` });
  } else if (maxDev >= THRESHOLDS.ALLOCATION_WARNING) {
    findings.push({ type: 'allocation', severity: 'warning', message: `Moderate allocation deviation (${maxDev.toFixed(1)}%).` });
  }

  // Concentration
  const largest = metrics.largestHolding;
  if (largest && largest.weight >= THRESHOLDS.CONCENTRATION_CAUTION) {
    findings.push({ type: 'concentration', severity: 'critical', message: `${largest.name} is ${largest.weight.toFixed(1)}% of your portfolio.` });
  } else if (largest && largest.weight >= THRESHOLDS.CONCENTRATION_WARNING) {
    findings.push({ type: 'concentration', severity: 'warning', message: `${largest.name} is ${largest.weight.toFixed(1)}% of your portfolio.` });
  }

  // Diversification
  if (metrics.summary.holdingCount < THRESHOLDS.MIN_HOLDINGS && metrics.summary.holdingCount > 0) {
    findings.push({ type: 'diversification', severity: 'warning', message: `Only ${metrics.summary.holdingCount} holdings. Consider diversifying.` });
  }

  // Goals
  for (const g of metrics.goalProgress) {
    if (g.daysLeft <= 365 && g.progressPct < THRESHOLDS.GOAL_RISK) {
      findings.push({ type: 'goal_risk', severity: 'critical', message: `Goal "${g.name}" is at ${g.progressPct.toFixed(1)}% with <1 year left.` });
    }
  }

  // Maturities
  for (const m of metrics.upcomingMaturities) {
    if (m.daysLeft <= THRESHOLDS.IMMINENT_MATURITY) {
      findings.push({ type: 'maturity', severity: 'warning', message: `${m.name} matures in ${m.daysLeft} days.` });
    } else if (m.daysLeft <= THRESHOLDS.MATURITY_WINDOW) {
      findings.push({ type: 'maturity', severity: 'info', message: `${m.name} matures in ${m.daysLeft} days.` });
    }
  }

  const healthMatrix = generateHealthMatrix(findings, metrics);

  return { findings, healthMatrix };
}

function generateHealthMatrix(findings: Finding[], metrics: PortfolioMetricsContext) {
  const matrix: Record<string, string> = {
    allocation: 'good',
    concentration: 'good',
    diversification: 'good',
    goals: 'good',
    maturity: 'good'
  };

  for (const f of findings) {
    const category = f.type === 'goal_risk' ? 'goals' : f.type;
    if (f.severity === 'critical') {
      matrix[category] = 'critical';
    } else if (f.severity === 'warning' && matrix[category] !== 'critical') {
      matrix[category] = 'warning';
    } else if (f.severity === 'info' && matrix[category] === 'good') {
      matrix[category] = 'info';
    }
  }

  return matrix;
}
