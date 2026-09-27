'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageHeader } from '@/components/layout/PageHeader';
import { useHousehold } from '@/context/HouseholdContext';
import {
  simulateWithdrawalAction,
  simulateInvestmentAction,
} from '@/lib/actions/decision-actions';
import {
  WithdrawalRequest,
  WithdrawalEngineResult,
  WithdrawalScenario,
  InvestmentRequest,
  InvestmentEngineResult,
  InvestmentScenario,
  WithdrawalUrgency,
  InvestmentMode,
  InvestmentHorizon,
} from '@/lib/engine/decision/types';
import {
  Compass,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Percent,
  CheckCircle2,
  ListChecks,
  Info,
  Sliders,
  DollarSign,
  Layers,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Banknote,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function DecisionContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'invest' ? 'invest' : 'withdraw';

  const [activeTab, setActiveTab] = useState<'withdraw' | 'invest'>(initialTab);
  const { state, familyId } = useHousehold();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Withdrawal Simulation Form State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(500000);
  const [withdrawUrgency, setWithdrawUrgency] = useState<WithdrawalUrgency>('short_term');
  const [withdrawalResult, setWithdrawalResult] = useState<WithdrawalEngineResult | null>(null);
  const [selectedWithdrawalScenarioId, setSelectedWithdrawalScenarioId] = useState<string | null>(null);

  // Investment Simulation Form State
  const [investMode, setInvestMode] = useState<InvestmentMode>('lump_sum');
  const [investAmount, setInvestAmount] = useState<number>(500000);
  const [investMonthly, setInvestMonthly] = useState<number>(30000);
  const [investHorizon, setInvestHorizon] = useState<InvestmentHorizon>('3-7_years');
  const [investStepUp, setInvestStepUp] = useState<number>(10);
  const [investmentResult, setInvestmentResult] = useState<InvestmentEngineResult | null>(null);
  const [selectedInvestmentScenarioId, setSelectedInvestmentScenarioId] = useState<string | null>(null);

  // Completed checklist tracking
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatINR = (val: number) => {
    return '₹' + Math.round(val || 0).toLocaleString('en-IN');
  };

  // Run Withdrawal Simulation
  const runWithdrawalSim = useCallback(async (amount: number, urgency: WithdrawalUrgency) => {
    startTransition(async () => {
      try {
        const req: WithdrawalRequest = {
          amountNeeded: amount,
          urgency,
        };
        const res = await simulateWithdrawalAction(req, familyId);
        setWithdrawalResult(res);
        if (res.scenarios.length > 0) {
          setSelectedWithdrawalScenarioId(res.scenarios[0].id);
        }
      } catch (err) {
        console.error('Failed to run withdrawal simulation:', err);
      }
    });
  }, [familyId]);

  // Run Investment Simulation
  const runInvestmentSim = useCallback(
    async (mode: InvestmentMode, lumpSum: number, monthly: number, horizon: InvestmentHorizon, stepUp: number) => {
      startTransition(async () => {
        try {
          const req: InvestmentRequest = {
            mode,
            lumpSumAmount: mode === 'lump_sum' ? lumpSum : undefined,
            monthlyCommitment: mode === 'recurring_sip' ? monthly : undefined,
            intendedHorizon: horizon,
            optionalStepUpPct: mode === 'recurring_sip' ? stepUp : 0,
          };
          const res = await simulateInvestmentAction(req, familyId);
          setInvestmentResult(res);
          if (res.scenarios.length > 0) {
            setSelectedInvestmentScenarioId(res.scenarios[0].id);
          }
        } catch (err) {
          console.error('Failed to run investment simulation:', err);
        }
      });
    },
    [familyId]
  );

  // Initial simulations on mount
  useEffect(() => {
    if (mounted) {
      runWithdrawalSim(withdrawAmount, withdrawUrgency);
      runInvestmentSim(investMode, investAmount, investMonthly, investHorizon, investStepUp);
    }
  }, [mounted, runWithdrawalSim, runInvestmentSim]);

  const toggleCheckStep = (scenarioId: string, stepIndex: number) => {
    const key = `${scenarioId}-${stepIndex}`;
    setCheckedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  // Active Selected Scenarios
  const activeWithdrawalScenario =
    withdrawalResult?.scenarios.find((s) => s.id === selectedWithdrawalScenarioId) ||
    withdrawalResult?.scenarios[0];

  const activeInvestmentScenario =
    investmentResult?.scenarios.find((s) => s.id === selectedInvestmentScenarioId) ||
    investmentResult?.scenarios[0];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <AppHeader />

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Compass className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Decision Center</h1>
                <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 font-bold uppercase tracking-wider text-[10px]">
                  Signature Simulator
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Simulate consequences of major household financial moves before committing a single rupee.
              </p>
            </div>

            {/* Tab Selector: Withdraw vs Invest */}
            <div className="flex items-center p-1 bg-slate-200/80 rounded-xl shadow-inner">
              <button
                onClick={() => setActiveTab('withdraw')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all',
                  activeTab === 'withdraw'
                    ? 'bg-white text-rose-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                <span>Withdraw Money</span>
              </button>

              <button
                onClick={() => setActiveTab('invest')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all',
                  activeTab === 'invest'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <ArrowUpRight className="w-4 h-4 text-violet-600" />
                <span>Invest Money</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: WITHDRAW MONEY */}
          {/* ========================================================================= */}
          {activeTab === 'withdraw' && (
            <div className="space-y-6">
              {/* Interactive Simulation Parameters Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-sm font-bold text-slate-800">
                      Withdrawal Simulation Parameters
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">
                    Decision-Available Cash:{' '}
                    <strong className="text-emerald-700">
                      {formatINR(state.decisionAvailableCash)}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Amount Needed */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Capital Required (₹)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(Math.max(0, Number(e.target.value)))}
                        className="font-bold text-sm h-10 pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        INR
                      </span>
                    </div>
                    {/* Quick amount chips */}
                    <div className="flex gap-1.5 mt-2">
                      {[100000, 300000, 500000, 1000000, 2000000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setWithdrawAmount(amt)}
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded border transition-colors',
                            withdrawAmount === amt
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          )}
                        >
                          ₹{(amt / 100000).toFixed(0)}L
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Urgency Window */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Urgency Window
                    </label>
                    <select
                      value={withdrawUrgency}
                      onChange={(e) => setWithdrawUrgency(e.target.value as WithdrawalUrgency)}
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    >
                      <option value="immediate">Immediate (T+0 to T+1) — Bank Cash / Liquid Funds</option>
                      <option value="short_term">Short Term (1 - 30 Days) — Mutual Funds / FDs</option>
                      <option value="flexible">Flexible (30+ Days) — Planned Liquidation</option>
                    </select>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Enforces instrument settlement constraints and eligibility
                    </span>
                  </div>

                  {/* Trigger Button */}
                  <div className="flex items-end">
                    <Button
                      onClick={() => runWithdrawalSim(withdrawAmount, withdrawUrgency)}
                      disabled={isPending}
                      className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-2 shadow-sm"
                    >
                      {isPending ? (
                        <span className="animate-spin">◌</span>
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span>Simulate Scenarios</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Constraint Warning Banner when hasCleanScenario: false */}
              {withdrawalResult && !withdrawalResult.hasCleanScenario && (
                <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-amber-900">
                        Neutral Constraint Alert: Material Consequences Detected
                      </h3>
                      <p className="text-xs text-amber-800 mt-0.5 leading-relaxed font-medium">
                        {withdrawalResult.constraintSummary ||
                          'No evaluated scenario meets the configured household constraints without a material consequence.'}
                      </p>
                    </div>
                  </div>

                  {withdrawalResult.adjustableParametersGuide && (
                    <div className="pt-2 border-t border-amber-200/60 pl-8 space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
                        Adjustable Household Parameters Guide:
                      </span>
                      <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                        {withdrawalResult.adjustableParametersGuide.map((guide, idx) => (
                          <li key={idx}>{guide}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Scenarios Comparison Bar / Selector */}
              {withdrawalResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Generated Scenarios (Neutral Presentation)
                      </h2>
                      <span className="text-xs text-slate-500">
                        Select a scenario to view detailed Two-Tier consequence breakdown and execution guide
                      </span>
                    </div>
                  </div>

                  {/* Scenarios Side-by-Side Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {withdrawalResult.scenarios.map((sc) => {
                      const isSelected = selectedWithdrawalScenarioId === sc.id;
                      const runwayAfter = sc.tier2Consequences.emergencyRunwayAfter;
                      const runwayBadge =
                        runwayAfter >= 6
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : runwayAfter >= 3
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200';

                      return (
                        <div
                          key={sc.id}
                          onClick={() => setSelectedWithdrawalScenarioId(sc.id)}
                          className={cn(
                            'p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left relative overflow-hidden',
                            isSelected
                              ? 'bg-white border-violet-600 shadow-md ring-2 ring-violet-600/10'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                          )}
                        >
                          <div>
                            {/* Scenario Title & Tag */}
                            <div className="flex items-start justify-between gap-1 mb-2">
                              <span className="text-xs font-bold text-slate-900 leading-tight">
                                {sc.name}
                              </span>
                              {!sc.isViable && (
                                <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                                  Breached
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">
                              {sc.sourceDescription}
                            </p>

                            {/* Direct Friction Summary */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-400 text-[11px]">Gross Needed:</span>
                                <span className="font-semibold text-slate-700">
                                  {formatINR(sc.tier1Friction.grossProceeds)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 text-[11px]">Total Friction:</span>
                                <span className="font-semibold text-rose-600">
                                  {sc.tier1Friction.totalDirectFriction > 0
                                    ? formatINR(sc.tier1Friction.totalDirectFriction)
                                    : '₹0 (Zero Loss)'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 text-[11px]">Settlement:</span>
                                <span className="font-medium text-slate-700">
                                  {sc.tier1Friction.settlementTime}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Post-Action Runway Pill */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 uppercase">Post Runway:</span>
                            <span
                              className={cn(
                                'text-[11px] font-bold px-2 py-0.5 rounded-full border',
                                runwayBadge
                              )}
                            >
                              {runwayAfter.toFixed(1)} mo
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Two-Tier Consequence Card (Selected Scenario) */}
                  {activeWithdrawalScenario && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                              Two-Tier Consequence Breakdown: {activeWithdrawalScenario.name}
                            </h3>
                            <span className="text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold">
                              Audited Scenario
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {activeWithdrawalScenario.sourceDescription}
                          </p>
                        </div>

                        <span className="text-xs font-semibold text-slate-500">
                          Settlement Window: <strong className="text-slate-900">{activeWithdrawalScenario.tier1Friction.settlementTime}</strong>
                        </span>
                      </div>

                      {/* Side-by-Side: Tier 1 vs Tier 2 */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* TIER 1: How do I get the money? */}
                        <div className="bg-slate-50/70 rounded-xl p-5 border border-slate-200/80 space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                              1
                            </span>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                              Tier 1: Direct Liquidation Friction
                            </h4>
                          </div>

                          <div className="space-y-2.5 text-xs">
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                              <span className="text-slate-600">Gross Liquidation Amount:</span>
                              <span className="font-bold text-slate-900">
                                {formatINR(activeWithdrawalScenario.tier1Friction.grossProceeds)}
                              </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                              <span className="text-slate-600">Estimated Capital Gains Tax Impact:</span>
                              <span className="font-bold text-rose-600">
                                {formatINR(activeWithdrawalScenario.tier1Friction.estimatedTaxImpact)}
                              </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                              <span className="text-slate-600">Exit Load & Mutual Fund Penalties:</span>
                              <span className="font-bold text-rose-600">
                                {formatINR(activeWithdrawalScenario.tier1Friction.exitLoads)}
                              </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                              <span className="text-slate-600">Pre-closure Fixed Deposit Penalties:</span>
                              <span className="font-bold text-rose-600">
                                {formatINR(activeWithdrawalScenario.tier1Friction.preClosurePenalties)}
                              </span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                              <span className="text-slate-600 font-semibold">Total Direct Cash Friction:</span>
                              <span className="font-bold text-rose-700">
                                -{formatINR(activeWithdrawalScenario.tier1Friction.totalDirectFriction)}
                              </span>
                            </div>
                            <div className="flex justify-between py-2 bg-emerald-50/80 px-3 rounded-lg border border-emerald-200/80">
                              <span className="font-bold text-emerald-900">Net Cash Received into Bank:</span>
                              <span className="font-extrabold text-emerald-700 text-sm">
                                {formatINR(activeWithdrawalScenario.tier1Friction.netCashReceived)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* TIER 2: What happens afterward? */}
                        <div className="bg-slate-50/70 rounded-xl p-5 border border-slate-200/80 space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                              2
                            </span>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                              Tier 2: Systemic Consequences
                            </h4>
                          </div>

                          <div className="space-y-3 text-xs">
                            {/* Runway Comparison */}
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                              <span className="text-slate-600">Emergency Runway:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-medium">
                                  {activeWithdrawalScenario.tier2Consequences.emergencyRunwayBefore.toFixed(1)} mo
                                </span>
                                <span className="text-slate-400">→</span>
                                <span
                                  className={cn(
                                    'font-bold px-2 py-0.5 rounded text-[11px]',
                                    activeWithdrawalScenario.tier2Consequences.emergencyRunwayAfter >= 6
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  )}
                                >
                                  {activeWithdrawalScenario.tier2Consequences.emergencyRunwayAfter.toFixed(1)} Months
                                </span>
                              </div>
                            </div>

                            {/* Remaining Liquid Cash */}
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                              <span className="text-slate-600">Liquidity Position After:</span>
                              <span className="font-bold text-slate-800">
                                {formatINR(activeWithdrawalScenario.tier2Consequences.liquidityPositionAfter)}
                              </span>
                            </div>

                            {/* Goal Disruptions */}
                            <div className="py-1.5 border-b border-slate-200/60">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-600">Goal Disruption Impact:</span>
                                <span className="text-slate-500 font-semibold">
                                  {activeWithdrawalScenario.tier2Consequences.goalImpact.length} affected
                                </span>
                              </div>
                              {activeWithdrawalScenario.tier2Consequences.goalImpact.length === 0 ? (
                                <span className="text-[11px] text-emerald-700 font-medium block">
                                  ✓ Zero disruption to active family milestones
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {activeWithdrawalScenario.tier2Consequences.goalImpact.map((g) => (
                                    <div
                                      key={g.goalId}
                                      className="text-[11px] text-rose-700 bg-rose-50/70 p-1.5 rounded flex justify-between"
                                    >
                                      <span>
                                        {g.goalName} ({g.priority})
                                      </span>
                                      <span>
                                        +{g.delayMonths} mo delay / {formatINR(g.fundingShortfallRupees)} shortfall
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Allocation Drift Shift */}
                            <div className="py-1">
                              <span className="text-slate-600 block mb-1">Asset Allocation Shift:</span>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                {activeWithdrawalScenario.tier2Consequences.allocationDriftChange.map(
                                  (d) => (
                                    <div
                                      key={d.category}
                                      className="bg-white p-1.5 rounded border border-slate-200 flex justify-between"
                                    >
                                      <span className="capitalize text-slate-600">{d.category}:</span>
                                      <span className="font-semibold text-slate-800">
                                        {d.driftBefore.toFixed(1)}% → {d.driftAfter.toFixed(1)}%
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step-by-Step Execution Checklist */}
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-3">
                          <ListChecks className="w-4 h-4 text-violet-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Execution Checklist for Family CFO
                          </h4>
                        </div>

                        <div className="space-y-2">
                          {activeWithdrawalScenario.executionChecklist.map((step, idx) => {
                            const stepKey = `${activeWithdrawalScenario.id}-${idx}`;
                            const isDone = !!checkedSteps[stepKey];
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleCheckStep(activeWithdrawalScenario.id, idx)}
                                className={cn(
                                  'p-3 rounded-xl border text-xs flex items-start gap-3 cursor-pointer transition-colors',
                                  isDone
                                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 line-through'
                                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() => {}}
                                  className="mt-0.5 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                                />
                                <span className="leading-relaxed">{step}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: INVEST MONEY */}
          {/* ========================================================================= */}
          {activeTab === 'invest' && (
            <div className="space-y-6">
              {/* Interactive Simulation Parameters Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-sm font-bold text-slate-800">
                      Investment Simulation Parameters
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">
                    Monthly Surplus:{' '}
                    <strong className="text-indigo-700">
                      {formatINR(state.monthlySurplus)}/mo
                    </strong>
                  </span>
                </div>

                {/* Mode Selector: Lump Sum vs Recurring SIP */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInvestMode('lump_sum')}
                    className={cn(
                      'py-2 px-4 rounded-lg text-xs font-bold border transition-all',
                      investMode === 'lump_sum'
                        ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    Lump Sum Deployment
                  </button>

                  <button
                    type="button"
                    onClick={() => setInvestMode('recurring_sip')}
                    className={cn(
                      'py-2 px-4 rounded-lg text-xs font-bold border transition-all',
                      investMode === 'recurring_sip'
                        ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    Recurring Monthly SIP
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                  {/* Amount / Commitment */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {investMode === 'lump_sum' ? 'Lump Sum Amount (₹)' : 'Monthly SIP Commitment (₹)'}
                    </label>
                    <Input
                      type="number"
                      value={investMode === 'lump_sum' ? investAmount : investMonthly}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        if (investMode === 'lump_sum') setInvestAmount(val);
                        else setInvestMonthly(val);
                      }}
                      className="font-bold text-sm h-10"
                    />
                  </div>

                  {/* Horizon */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Time Horizon
                    </label>
                    <select
                      value={investHorizon}
                      onChange={(e) => setInvestHorizon(e.target.value as InvestmentHorizon)}
                      className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    >
                      <option value="<3_years">&lt; 3 Years (Conservative / Debt)</option>
                      <option value="3-7_years">3 - 7 Years (Balanced / Hybrid)</option>
                      <option value=">7_years">&gt; 7 Years (Wealth / Equity)</option>
                    </select>
                  </div>

                  {/* Trigger Button */}
                  <div className="flex items-end">
                    <Button
                      onClick={() =>
                        runInvestmentSim(
                          investMode,
                          investAmount,
                          investMonthly,
                          investHorizon,
                          investStepUp
                        )
                      }
                      disabled={isPending}
                      className="w-full h-10 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs gap-2 shadow-sm"
                    >
                      {isPending ? (
                        <span className="animate-spin">◌</span>
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                      <span>Simulate Deployment</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Scenarios Comparison */}
              {investmentResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Evaluated Investment Scenarios
                      </h2>
                      <span className="text-xs text-slate-500">
                        Multi-gate deployment tested against emergency buffer, high-cost debt, and goal deadlines
                      </span>
                    </div>
                  </div>

                  {/* Scenarios Side-by-Side Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {investmentResult.scenarios.map((sc) => {
                      const isSelected = selectedInvestmentScenarioId === sc.id;
                      return (
                        <div
                          key={sc.id}
                          onClick={() => setSelectedInvestmentScenarioId(sc.id)}
                          className={cn(
                            'p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left relative',
                            isSelected
                              ? 'bg-white border-violet-600 shadow-md ring-2 ring-violet-600/10'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                          )}
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-900 block mb-1">
                              {sc.name}
                            </span>

                            <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                              {sc.tier1Deployment.safetyReserveAllocation > 0 && (
                                <div className="flex justify-between text-emerald-700 font-medium">
                                  <span>Safety Reserve:</span>
                                  <span>{formatINR(sc.tier1Deployment.safetyReserveAllocation)}</span>
                                </div>
                              )}
                              {sc.tier1Deployment.debtPrepaymentAllocation > 0 && (
                                <div className="flex justify-between text-indigo-700 font-medium">
                                  <span>Debt Prepayment:</span>
                                  <span>{formatINR(sc.tier1Deployment.debtPrepaymentAllocation)}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-slate-600">
                                <span>Total Deployment:</span>
                                <span className="font-semibold text-slate-900">
                                  {investMode === 'lump_sum'
                                    ? formatINR(investAmount)
                                    : `${formatINR(investMonthly)}/mo`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">5-Yr Projection:</span>
                            <span className="font-bold text-emerald-700">
                              {formatINR(sc.tier2Consequences.projectedWealth5Yr)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Two-Tier Consequence Card (Selected Investment Scenario) */}
                  {activeInvestmentScenario && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6">
                      <div className="border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            Two-Tier Consequence Breakdown: {activeInvestmentScenario.name}
                          </h3>
                          <Badge variant="outline" className="text-violet-700 border-violet-200 bg-violet-50">
                            Evaluated
                          </Badge>
                        </div>
                      </div>

                      {/* Side-by-Side: Tier 1 vs Tier 2 */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* TIER 1: How is the money deployed? */}
                        <div className="bg-slate-50/70 rounded-xl p-5 border border-slate-200/80 space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                              1
                            </span>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                              Tier 1: Capital Deployment Blueprint
                            </h4>
                          </div>

                          <div className="space-y-3 text-xs">
                            {/* Gate 1 & 2 Allocations */}
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                              <span className="text-slate-600">Emergency Reserve Top-up:</span>
                              <span className="font-bold text-emerald-700">
                                {formatINR(activeInvestmentScenario.tier1Deployment.safetyReserveAllocation)}
                              </span>
                            </div>

                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                              <span className="text-slate-600">High-Interest Debt Prepayment (&gt;10%):</span>
                              <span className="font-bold text-indigo-700">
                                {formatINR(activeInvestmentScenario.tier1Deployment.debtPrepaymentAllocation)}
                              </span>
                            </div>

                            {/* Asset Class Allocations */}
                            <div className="pt-1">
                              <span className="text-slate-500 font-semibold block mb-2">
                                Asset Class Allocations & Instruments:
                              </span>
                              <div className="space-y-2">
                                {activeInvestmentScenario.tier1Deployment.assetDeployments.map((a, i) => (
                                  <div
                                    key={i}
                                    className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                                  >
                                    <div>
                                      <span className="font-bold text-slate-800 capitalize">
                                        {a.category}
                                      </span>
                                      <span className="text-[11px] text-slate-400 block">
                                        {a.suggestedInstrumentType}
                                      </span>
                                    </div>
                                    <span className="font-bold text-slate-900">{formatINR(a.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* TIER 2: What happens afterward? */}
                        <div className="bg-slate-50/70 rounded-xl p-5 border border-slate-200/80 space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                              2
                            </span>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                              Tier 2: Systemic Consequences
                            </h4>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                              <span className="text-slate-600">Post-Action Emergency Runway:</span>
                              <span className="font-bold text-emerald-700">
                                {activeInvestmentScenario.tier2Consequences.emergencyRunwayAfter.toFixed(1)} Months
                              </span>
                            </div>

                            {activeInvestmentScenario.tier2Consequences.guaranteedInterestSaved > 0 && (
                              <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                                <span className="text-slate-600">Guaranteed Interest Saved:</span>
                                <span className="font-bold text-emerald-700">
                                  {formatINR(activeInvestmentScenario.tier2Consequences.guaranteedInterestSaved)}
                                </span>
                              </div>
                            )}

                            {/* Goal Milestone Accelerations */}
                            <div className="py-1.5 border-b border-slate-200/60">
                              <span className="text-slate-600 block mb-1">Goal Milestone Acceleration:</span>
                              {activeInvestmentScenario.tier2Consequences.goalMilestoneImpact.length === 0 ? (
                                <span className="text-[11px] text-slate-400">
                                  Deploys toward broad family wealth creation
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {activeInvestmentScenario.tier2Consequences.goalMilestoneImpact.map((g) => (
                                    <div
                                      key={g.goalId}
                                      className="p-1.5 rounded bg-emerald-50/70 text-emerald-800 flex justify-between text-[11px]"
                                    >
                                      <span>{g.goalName}</span>
                                      <span className="font-semibold">
                                        +{g.monthsAccelerated} mo faster (-{formatINR(g.gapReducedRupees)})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Wealth Projections */}
                            <div className="pt-1 grid grid-cols-2 gap-2 text-center">
                              <div className="p-2 bg-white rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-400 block uppercase">
                                  5-Year Projected Corpus
                                </span>
                                <span className="text-sm font-bold text-slate-900">
                                  {formatINR(activeInvestmentScenario.tier2Consequences.projectedWealth5Yr)}
                                </span>
                              </div>
                              <div className="p-2 bg-white rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-400 block uppercase">
                                  10-Year Projected Corpus
                                </span>
                                <span className="text-sm font-bold text-indigo-700">
                                  {formatINR(activeInvestmentScenario.tier2Consequences.projectedWealth10Yr)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step-by-Step Execution Checklist */}
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-3">
                          <ListChecks className="w-4 h-4 text-violet-600" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Step-by-Step Execution Blueprint
                          </h4>
                        </div>

                        <div className="space-y-2">
                          {activeInvestmentScenario.executionChecklist.map((step, idx) => {
                            const stepKey = `${activeInvestmentScenario.id}-${idx}`;
                            const isDone = !!checkedSteps[stepKey];
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleCheckStep(activeInvestmentScenario.id, idx)}
                                className={cn(
                                  'p-3 rounded-xl border text-xs flex items-start gap-3 cursor-pointer transition-colors',
                                  isDone
                                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 line-through'
                                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() => {}}
                                  className="mt-0.5 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                                />
                                <span className="leading-relaxed">{step}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function DecisionCenterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-slate-50 text-slate-900">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Initializing Decision Engine…</p>
            </div>
          </main>
        </div>
      }
    >
      <DecisionContent />
    </Suspense>
  );
}
