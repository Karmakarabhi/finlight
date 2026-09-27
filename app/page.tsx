'use client';

import * as React from 'react';
import Link from 'next/link';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageHeader } from '@/components/layout/PageHeader';
import { useHousehold } from '@/context/HouseholdContext';
import {
  Wallet,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Banknote,
  PiggyBank,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { state, rawData, memberFilter, setMemberFilter } = useHousehold();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !state) {
    return (
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <AppSidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading household balance sheet…</p>
          </div>
        </main>
      </div>
    );
  }

  // Format INR helper
  const formatINR = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('en-IN');
  };

  // Runway status logic
  const runwayMonths = state.emergencyRunwayMonths || 0;
  const runwayBadge =
    runwayMonths >= 6.0
      ? { label: 'Safe', variant: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ShieldCheck }
      : runwayMonths >= 3.0
      ? { label: 'Warning', variant: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle }
      : { label: 'Critical', variant: 'bg-rose-50 text-rose-700 border-rose-200', icon: ShieldAlert };

  const RunwayIcon = runwayBadge.icon;

  // Calculate member-specific aggregates
  const members = state.members || [];
  const memberSummaries = members.map((m) => {
    const memberHoldings = (state.holdings || []).filter((h) => h.ownerMemberId === m.id);
    const memberCash = (state.cashAccounts || []).filter((c) => c.ownerMemberId === m.id);
    const memberLiabilities = (state.liabilities || []).filter((l) => l.ownerMemberId === m.id);

    const holdingsValue = memberHoldings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
    const cashValue = memberCash.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
    const totalWealth = holdingsValue + cashValue;
    const debt = memberLiabilities.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0);

    return {
      id: m.id,
      name: m.name,
      relation: m.relation,
      monthlyIncome: m.monthlyIncome,
      wealth: totalWealth,
      liabilities: debt,
      riskTolerance: m.riskTolerance,
      employmentStatus: m.employmentStatus,
      holdingsCount: memberHoldings.length,
    };
  });

  const filteredMembers =
    memberFilter === 'all'
      ? memberSummaries
      : memberSummaries.filter((m) => m.relation.toLowerCase() === memberFilter.toLowerCase());

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <AppHeader />

        <div className="p-6 max-w-7xl mx-auto space-y-8">
          {/* Header & Filter Indicator */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Household Dashboard</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                  Karmakar Family
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Unified balance sheet, emergency runway analysis, and decision readiness.
              </p>
            </div>

            {/* Quick Action Triggers */}
            <div className="flex items-center gap-3">
              <Link href="/decision?tab=withdraw">
                <Button
                  variant="outline"
                  className="gap-2 border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-800 shadow-xs"
                >
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                  <span>Withdraw Money</span>
                </Button>
              </Link>
              <Link href="/decision?tab=invest">
                <Button
                  className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm shadow-indigo-500/20"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Invest Money</span>
                </Button>
              </Link>
            </div>
          </div>

          {memberFilter !== 'all' && (
            <div className="p-3 bg-violet-50/70 border border-violet-200 rounded-xl flex items-center justify-between text-xs text-violet-900">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-600" />
                <span>
                  Viewing filtered perspective for <strong>{memberFilter}</strong>. Consolidated family metrics remain visible below.
                </span>
              </div>
              <button
                onClick={() => setMemberFilter('all')}
                className="font-semibold text-violet-700 hover:text-violet-900 underline"
              >
                Reset to Entire Family
              </button>
            </div>
          )}

          {/* Section 1: Financial Position */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Financial Position (Balance Sheet)
              </h2>
              <span className="text-xs text-slate-400">All figures consolidated in INR</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Gross Wealth */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Gross Wealth</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {formatINR(state.grossWealth)}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Liquid: {formatINR(state.liquidWealth)}</span>
                  <span>Invested: {formatINR(state.investedWealth)}</span>
                  <span>Fixed: {formatINR(state.fixedWealth)}</span>
                </div>
              </div>

              {/* Net Worth */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Net Worth</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-700 tracking-tight">
                  {formatINR(state.netWorth)}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Gross Wealth − Total Debt</span>
                  <span className="font-semibold text-emerald-600">
                    +{((state.netWorth / (state.grossWealth || 1)) * 100).toFixed(0)}% Solvency
                  </span>
                </div>
              </div>

              {/* Total Debt */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Debt</span>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                    <PiggyBank className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {formatINR(state.totalLiabilities)}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Monthly EMI Outflow:</span>
                  <span className="font-semibold text-rose-600">{formatINR(state.monthlyDebtServicing)}/mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Can We Safely Act? */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  2. Decision Readiness Gate
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">Can We Safely Act Right Now?</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Emergency Protocol:</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border',
                    runwayBadge.variant
                  )}
                >
                  <RunwayIcon className="w-3.5 h-3.5" />
                  {runwayBadge.label} Runway
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Emergency Runway */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between text-slate-300 text-xs mb-1">
                  <span>Emergency Runway</span>
                  <span className="text-slate-400">Target: {rawData.profile?.baseEmergencyMonths || 6} mo</span>
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight">
                  {runwayMonths.toFixed(1)} <span className="text-sm font-normal text-slate-300">Months</span>
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Liquid cash covers {runwayMonths.toFixed(1)} months of essential household obligations (₹{Math.round(state.monthlyEssentialExpenses + state.monthlyDebtServicing).toLocaleString('en-IN')}/mo).
                </p>
              </div>

              {/* Decision-Available Cash */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between text-slate-300 text-xs mb-1">
                  <span>Decision-Available Cash</span>
                  <span className="text-emerald-400 text-xs font-medium">Free Capital</span>
                </div>
                <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                  {formatINR(state.decisionAvailableCash)}
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Liquid cash surplus above the protected 6-month reserve target (₹{Math.round(state.emergencyReserveTarget).toLocaleString('en-IN')}). Safe for deploy/spend.
                </p>
              </div>

              {/* Monthly Surplus */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between text-slate-300 text-xs mb-1">
                  <span>Monthly Free Cash Flow</span>
                  <span className="text-indigo-300 text-xs font-medium">Net Monthly</span>
                </div>
                <div className="text-3xl font-extrabold text-indigo-300 tracking-tight">
                  {formatINR(state.monthlySurplus)}
                  <span className="text-sm font-normal text-slate-300">/mo</span>
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Inflow ₹{state.monthlyInflow.toLocaleString('en-IN')} minus essentials, EMIs, and discretionary costs. Max sustainable SIP capacity.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Who Owns What (Household Members) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                3. Who Owns What (Household Member Distribution)
              </h2>
              <span className="text-xs text-slate-500">
                {members.length} Household Members Registered
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredMembers.map((member) => {
                const wealthPct = state.grossWealth > 0 ? (member.wealth / state.grossWealth) * 100 : 0;
                return (
                  <Card key={member.id} className="p-4 bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900">{member.name}</h3>
                        </div>
                        <span className="text-[11px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                          {member.relation}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold text-slate-500">
                        {member.riskTolerance}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Wealth Owned</span>
                        <div className="text-base font-bold text-slate-900">
                          {formatINR(member.wealth)}
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-violet-600 h-1.5 rounded-full"
                            style={{ width: `${Math.min(wealthPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {wealthPct.toFixed(1)}% of household gross wealth
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Monthly Income</span>
                          <span className="font-semibold text-slate-700">
                            {member.monthlyIncome > 0 ? formatINR(member.monthlyIncome) : '₹0'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Liabilities</span>
                          <span className="font-semibold text-rose-600">
                            {member.liabilities > 0 ? formatINR(member.liabilities) : 'Nil'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Section 4: Goals Summary */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                4. Household Life Goals
              </h2>
              <Link href="/analytics" className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1">
                <span>View Goal Trajectories</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(state.goals || []).map((goal) => {
                const priorityBadge =
                  goal.priority === 'P1'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : goal.priority === 'P2'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200';

                return (
                  <div
                    key={goal.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800">{goal.name}</span>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                          priorityBadge
                        )}
                      >
                        {goal.priority} Milestone
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Target Amount</span>
                        <span className="text-lg font-bold text-slate-900">
                          {formatINR(goal.targetAmount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Target Year</span>
                        <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{goal.targetYear}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Linked Assets: {goal.linkedHoldingIds?.length || 0}</span>
                      <span className="text-violet-600 font-medium">Active Tracking</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
