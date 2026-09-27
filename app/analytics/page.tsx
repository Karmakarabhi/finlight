'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageHeader } from '@/components/layout/PageHeader';
import { useHousehold } from '@/context/HouseholdContext';
import {
  Scale,
  Shield,
  Target,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  DollarSign,
  Percent,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { state, rawData, memberFilter } = useHousehold();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formatINR = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('en-IN');
  };

  const currentYear = new Date().getFullYear();

  // Allocation Drift calculation
  const driftItems = useMemo(() => {
    if (!state || !state.allocationDrift) return [];
    const order = ['equity', 'debt', 'gold', 'cash'];
    return order
      .filter((k) => state.allocationDrift[k])
      .map((k) => {
        const item = state.allocationDrift[k];
        const label =
          k === 'equity'
            ? 'Equity (MFs & Stocks)'
            : k === 'debt'
            ? 'Debt & Fixed Deposits'
            : k === 'gold'
            ? 'Gold (SGB & ETFs)'
            : 'Liquid Cash & Savings';

        const isSurplus = item.deficitRupees < 0; // Negative deficit means surplus
        const absDiff = Math.abs(item.deficitRupees);

        return {
          key: k,
          label,
          targetPct: item.targetPct,
          actualPct: item.actualPct,
          driftPct: item.driftPct,
          deficitRupees: item.deficitRupees,
          absDiff,
          isSurplus,
        };
      });
  }, [state]);

  // Goal Trajectory calculations
  const goalTrajectories = useMemo(() => {
    if (!state || !state.goals) return [];

    const holdingMap = new Map();
    (state.holdings || []).forEach((h) => holdingMap.set(h.id, h));

    return state.goals.map((g) => {
      const yearsRemaining = Math.max(1, g.targetYear - currentYear);
      const monthsRemaining = yearsRemaining * 12;

      // Calculate current value of linked holdings
      let linkedValuation = 0;
      if (g.linkedHoldingIds && g.linkedHoldingIds.length > 0) {
        linkedValuation = g.linkedHoldingIds.reduce((sum, id) => {
          const h = holdingMap.get(id);
          return sum + (h?.currentValue || 0);
        }, 0);
      } else {
        // If unlinked, proportional share based on general portfolio
        linkedValuation = state.investedWealth * (g.priority === 'P1' ? 0.35 : g.priority === 'P2' ? 0.2 : 0.1);
      }

      const shortfall = Math.max(0, g.targetAmount - linkedValuation);
      const fundedPct = Math.min(100, (linkedValuation / g.targetAmount) * 100);
      const requiredMonthlyRunRate = shortfall > 0 ? Math.round(shortfall / monthsRemaining) : 0;

      let statusText = 'On Track';
      let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      if (fundedPct < 40 && yearsRemaining <= 3) {
        statusText = 'Critical Gap';
        statusColor = 'text-rose-700 bg-rose-50 border-rose-200';
      } else if (fundedPct < 60) {
        statusText = 'Needs Run Rate';
        statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
      }

      return {
        ...g,
        yearsRemaining,
        monthsRemaining,
        linkedValuation,
        shortfall,
        fundedPct,
        requiredMonthlyRunRate,
        statusText,
        statusColor,
      };
    });
  }, [state, currentYear]);

  if (!mounted || !state) {
    return (
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <AppSidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  const risk = state.risk;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <AppHeader />

        <div className="p-6 max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Portfolio Analytics</h1>
                <Badge variant="outline" className="text-violet-700 bg-violet-50 border-violet-200">
                  Non-Collapsible Model
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Asset allocation drift, deterministic tripartite risk breakdown, and life goal trajectories.
              </p>
            </div>

            <Link href="/decision?tab=invest">
              <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
                <span>Simulate Rebalancing / Investment</span>
              </Button>
            </Link>
          </div>

          {/* Section 1: Allocation Drift */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  1. Asset Allocation Drift (Target vs Actual)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Portfolio balance compared to configured household policy (60% Eq / 30% Debt / 10% Gold / 0% Cash)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {driftItems.map((item) => {
                const isOver = item.driftPct > 0;
                return (
                  <div
                    key={item.key}
                    className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {item.key}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                          Math.abs(item.driftPct) <= 2
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isOver
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        )}
                      >
                        {item.driftPct >= 0 ? '+' : ''}
                        {item.driftPct.toFixed(1)}% Drift
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">Actual</span>
                        <div className="text-xl font-bold text-slate-900">{item.actualPct.toFixed(1)}%</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase">Target</span>
                        <div className="text-sm font-semibold text-slate-500">{item.targetPct.toFixed(1)}%</div>
                      </div>
                    </div>

                    {/* Progress representation */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all',
                            item.key === 'equity'
                              ? 'bg-violet-600'
                              : item.key === 'debt'
                              ? 'bg-blue-600'
                              : item.key === 'gold'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          )}
                          style={{ width: `${Math.min(100, item.actualPct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Rupee Rebalancing Delta */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">Rebalance Gap:</span>
                      <span
                        className={cn(
                          'font-bold',
                          item.isSurplus ? 'text-blue-700' : 'text-amber-700'
                        )}
                      >
                        {item.isSurplus ? '+' : '-'}
                        {formatINR(item.absDiff)}{' '}
                        <span className="text-[10px] font-normal text-slate-400">
                          ({item.isSurplus ? 'Surplus' : 'Deficit'})
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Tripartite Risk Model */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Tripartite Risk Model (Non-Collapsible 3-Card Architecture)
                </h2>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/50">
                  Separates Ability, Psychology & Math
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Finlight strictly prevents collapsing subjective comfort, balance sheet capacity, and mathematical goal return into a single misleading score.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Risk Capacity */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        1
                      </div>
                      <span className="font-bold text-slate-800 uppercase tracking-wider">
                        Risk Capacity
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-bold px-2.5 py-0.5 rounded-full border',
                        risk?.riskCapacity?.level === 'High'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : risk?.riskCapacity?.level === 'Moderate'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      )}
                    >
                      {risk?.riskCapacity?.level || 'Moderate'} Capacity
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-600 mb-3">
                    What financial loss can the household realistically absorb? Computed deterministically from runway, surplus, and debt burden.
                  </p>

                  <div className="space-y-2 mt-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Deterministic Rationale
                    </span>
                    {(risk?.riskCapacity?.rationale || [
                      `Emergency runway is ${state.emergencyRunwayMonths.toFixed(1)} months.`,
                      `Monthly surplus is ${formatINR(state.monthlySurplus)}/month.`,
                      `Total debt burden is ${formatINR(state.totalLiabilities)}.`,
                    ]).map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  Dimension 1: Mathematical Solvency
                </div>
              </div>

              {/* Card 2: Risk Tolerance */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        2
                      </div>
                      <span className="font-bold text-slate-800 uppercase tracking-wider">
                        Risk Tolerance
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                      {risk?.riskTolerance?.level || 'Moderate'} Comfort
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-600 mb-3">
                    How psychologically comfortable is the household with market drawdowns and equity volatility?
                  </p>

                  <div className="space-y-3 mt-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Household Member Tolerance
                    </span>
                    <div className="space-y-2">
                      {(state.members || []).map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                          <span className="font-semibold text-slate-800">
                            {m.name} ({m.relation})
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {m.riskTolerance}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  Dimension 2: Psychological Appetite
                </div>
              </div>

              {/* Card 3: Risk Requirement */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                        3
                      </div>
                      <span className="font-bold text-slate-800 uppercase tracking-wider">
                        Risk Requirement
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                      {risk?.riskRequirement?.requiredReturnPct?.toFixed(1) || '10.8'}% CAGR Needed
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-600 mb-3">
                    What rate of return is mathematically required to achieve active family goals within their target horizons?
                  </p>

                  <div className="p-3 bg-violet-50/70 border border-violet-200/70 rounded-xl space-y-2 mt-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-800 block">
                      Goal Solver Rationale
                    </span>
                    <p className="text-xs text-violet-900 leading-relaxed">
                      {risk?.riskRequirement?.rationale ||
                        `Achieving target goals across life milestones requires an annualized portfolio return of ${risk?.riskRequirement?.requiredReturnPct?.toFixed(1) || '10.8'}%.`}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  Dimension 3: Mathematical Goal Mandate
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Goal Trajectories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  3. Life Goal Trajectories & Run Rate Analysis
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Projected capital shortfalls and monthly investment run rates required to meet milestones.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {goalTrajectories.map((goal) => (
                <div
                  key={goal.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{goal.name}</h3>
                      <span className="text-xs text-slate-400">Target Year: {goal.targetYear} ({goal.yearsRemaining}y remaining)</span>
                    </div>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', goal.statusColor)}>
                      {goal.statusText}
                    </span>
                  </div>

                  {/* Target vs Funded */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Target Corpus</span>
                      <span className="text-base font-bold text-slate-900">{formatINR(goal.targetAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Currently Linked</span>
                      <span className="text-base font-bold text-emerald-700">{formatINR(goal.linkedValuation)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Funded Progress</span>
                      <span className="font-semibold text-slate-800">{goal.fundedPct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-violet-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, goal.fundedPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Shortfall & Required Run Rate */}
                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Projected Shortfall:</span>
                      <span className="font-bold text-rose-600">{formatINR(goal.shortfall)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Required Run Rate:</span>
                      <span className="font-bold text-violet-700">
                        {goal.requiredMonthlyRunRate > 0 ? `${formatINR(goal.requiredMonthlyRunRate)}/mo` : 'Fully Funded'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
