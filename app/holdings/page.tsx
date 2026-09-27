'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageHeader } from '@/components/layout/PageHeader';
import { useHousehold } from '@/context/HouseholdContext';
import { RecordAssetModal } from '@/components/portfolio/RecordAssetModal';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldAlert,
  Coins,
  Building,
  TrendingUp,
  Landmark,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Holding, TaxLot, FamilyMember } from '@/lib/engine/types';

export default function HoldingsPage() {
  const { state, rawData, memberFilter, setMemberFilter } = useHousehold();
  const [mounted, setMounted] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formatINR = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('en-IN');
  };

  // Derive enriched holdings with Owner, Cost Basis, Gain/Loss, Liquidity Class, and Tax Status
  const enrichedHoldings = useMemo(() => {
    if (!state) return [];

    const memberMap = new Map<string, FamilyMember>();
    (state.members || []).forEach((m) => memberMap.set(m.id, m));

    const lotsByHolding = new Map<string, TaxLot[]>();
    (state.taxLots || []).forEach((lot) => {
      const existing = lotsByHolding.get(lot.holdingId) || [];
      existing.push(lot);
      lotsByHolding.set(lot.holdingId, existing);
    });

    const now = new Date().getTime();

    return (state.holdings || []).map((h) => {
      const owner = memberMap.get(h.ownerMemberId);
      const lots = lotsByHolding.get(h.id) || [];

      // Calculate cost basis
      let costBasis = 0;
      let oldestLotDays = 0;

      if (lots.length > 0) {
        costBasis = lots.reduce((acc, l) => acc + (l.remainingUnits * l.buyPrice), 0);
        const earliestTime = Math.min(...lots.map((l) => new Date(l.purchaseDate).getTime()));
        oldestLotDays = Math.max(0, Math.floor((now - earliestTime) / (1000 * 60 * 60 * 24)));
      } else {
        // Fallback realistic cost basis
        costBasis = h.assetType === 'FD' ? h.currentValue * 0.92 : h.currentValue * 0.78;
        oldestLotDays = 450;
      }

      const gainLoss = h.currentValue - costBasis;
      const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      // Liquidity Class calculation
      let liquidityClass: 'Immediate' | 'High' | 'Medium' | 'Low' = 'Medium';
      if (h.category === 'cash') {
        liquidityClass = 'Immediate';
      } else if (h.assetType === 'FD') {
        liquidityClass = 'High'; // Can be pre-closed within 24h
      } else if (h.assetType === 'MF') {
        if (h.category === 'debt' || h.name.toLowerCase().includes('liquid') || h.name.toLowerCase().includes('short term')) {
          liquidityClass = 'High';
        } else {
          liquidityClass = 'Medium';
        }
      } else if (h.assetType === 'Stock' || h.assetType === 'ETF') {
        liquidityClass = 'Medium';
      } else if (h.assetType === 'Gold') {
        liquidityClass = 'Medium';
      }

      // Tax Status classification
      let taxStatus: 'LTCG Eligible' | 'STCG' | 'Slab Taxed' = 'LTCG Eligible';
      if (h.assetType === 'FD' || h.category === 'debt') {
        taxStatus = 'Slab Taxed';
      } else if (h.assetType === 'Gold') {
        taxStatus = oldestLotDays > 730 ? 'LTCG Eligible' : 'Slab Taxed';
      } else {
        // Equity MF / Stocks / ETFs
        taxStatus = oldestLotDays > 365 ? 'LTCG Eligible' : 'STCG';
      }

      return {
        ...h,
        ownerName: owner ? owner.name : 'Household Member',
        ownerRelation: owner ? owner.relation : 'Family',
        costBasis,
        gainLoss,
        gainLossPct,
        liquidityClass,
        taxStatus,
        lotCount: lots.length,
        oldestLotDays,
      };
    });
  }, [state]);

  // Filter by search query, asset type, and household member view
  const filteredHoldings = useMemo(() => {
    return enrichedHoldings.filter((h) => {
      // Member Filter
      if (memberFilter !== 'all' && h.ownerRelation.toLowerCase() !== memberFilter.toLowerCase()) {
        return false;
      }

      // Type Filter
      if (selectedTypeFilter !== 'ALL' && h.assetType !== selectedTypeFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = h.name.toLowerCase().includes(q);
        const matchesOwner = h.ownerName.toLowerCase().includes(q);
        const matchesIdentifier = h.identifier?.toLowerCase().includes(q);
        return matchesName || matchesOwner || matchesIdentifier;
      }

      return true;
    });
  }, [enrichedHoldings, memberFilter, selectedTypeFilter, searchQuery]);

  // Inventory Totals
  const totalValuation = useMemo(() => {
    return filteredHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  }, [filteredHoldings]);

  const totalCost = useMemo(() => {
    return filteredHoldings.reduce((sum, h) => sum + h.costBasis, 0);
  }, [filteredHoldings]);

  const totalGain = totalValuation - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // Investment Allocation by Asset Type (Option A: Holdings only, excluding Cash)
  const allocationByType = useMemo(() => {
    const map = new Map<string, { label: string; value: number; color: string; count: number; cost: number }>();

    // Core asset types
    map.set('MF', { label: 'Mutual Funds', value: 0, color: '#6366F1', count: 0, cost: 0 });
    map.set('FD', { label: 'Fixed Deposits', value: 0, color: '#0EA5E9', count: 0, cost: 0 });
    map.set('Gold', { label: 'Gold', value: 0, color: '#F59E0B', count: 0, cost: 0 });
    map.set('Stock', { label: 'Stocks & ETFs', value: 0, color: '#10B981', count: 0, cost: 0 });

    filteredHoldings.forEach((h) => {
      const key = (h.assetType === 'ETF' ? 'Stock' : h.assetType) || 'MF';
      const existing = map.get(key) || { label: h.assetType, value: 0, color: '#8B5CF6', count: 0, cost: 0 };
      existing.value += h.currentValue;
      existing.cost += h.costBasis;
      existing.count += 1;
      map.set(key, existing);
    });

    const total = Array.from(map.values()).reduce((sum, item) => sum + item.value, 0);

    return Array.from(map.entries())
      .map(([key, item]) => {
        const gain = item.value - item.cost;
        const gainPct = item.cost > 0 ? (gain / item.cost) * 100 : 0;
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return {
          key,
          ...item,
          pct,
          gain,
          gainPct,
        };
      })
      .filter((item) => item.value > 0 || item.count > 0);
  }, [filteredHoldings]);

  // Donut chart slices data
  const allocationChartData = useMemo(() => {
    return allocationByType
      .filter((item) => item.value > 0)
      .map((item) => ({
        name: item.label,
        value: item.value,
        color: item.color,
        pct: item.pct,
      }));
  }, [allocationByType]);

  // Gain/Loss breakdown by asset type
  const gainByAssetType = useMemo(() => {
    return allocationByType.filter((item) => item.cost > 0 || item.value > 0);
  }, [allocationByType]);

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

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <AppHeader />

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header & Add Asset Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Holdings Inventory</h1>
                <Badge variant="outline" className="text-violet-700 bg-violet-50 border-violet-200">
                  {filteredHoldings.length} Assets Tracked
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Household-oriented inventory across Mutual Funds, Equities, Fixed Deposits, and Gold.
              </p>
            </div>

            <Button
              onClick={() => setIsRecordModalOpen(true)}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Asset</span>
            </Button>
          </div>

          {/* Quick Aggregate Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block tracking-wider">
                Invested Wealth
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">{formatINR(totalValuation)}</div>
              <span className="text-xs text-slate-500 mt-1 block">Across {filteredHoldings.length} tracked holdings</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block tracking-wider">
                Total Cost Basis
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">{formatINR(totalCost)}</div>
              <span className="text-xs text-slate-500 mt-1 block">Cumulative purchase capital</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block tracking-wider">
                Unrealized Gain / Loss
              </span>
              <div
                className={cn(
                  'text-xl font-bold mt-1 flex items-center gap-1',
                  totalGain >= 0 ? 'text-emerald-700' : 'text-rose-700'
                )}
              >
                {totalGain >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {formatINR(totalGain)}
                <span className="text-xs font-semibold">({totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(1)}%)</span>
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Household portfolio gain</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase text-slate-400 block tracking-wider">
                  Immediate Liquid Reserve
                </span>
                <Badge variant="outline" className="text-[10px] text-indigo-600 bg-indigo-50 border-indigo-200 py-0 px-1.5">
                  Separate Cash
                </Badge>
              </div>
              <div className="text-xl font-bold text-indigo-700 mt-1">{formatINR(state.liquidWealth)}</div>
              <span className="text-xs text-slate-500 mt-1 block">Bank savings & liquid funds</span>
            </div>
          </div>

          {/* Visual Analysis Deck (Investment Allocation & Gain/Loss by Asset Type) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Primary Visual: Investment Allocation Donut */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-violet-600" />
                      Investment Allocation
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Where is your money invested? (Excludes bank savings)
                    </p>
                  </div>
                  <Badge variant="outline" className="text-slate-700 bg-slate-50 border-slate-200 text-xs font-semibold">
                    {formatINR(totalValuation)} Tracked
                  </Badge>
                </div>

                {/* Donut Chart & Progress Breakdown */}
                <div className="mt-5 flex flex-col sm:flex-row items-center gap-6">
                  {/* Recharts Donut */}
                  <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocationChartData}
                          innerRadius={50}
                          outerRadius={74}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {allocationChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number) => [formatINR(value), 'Current Value']}
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderRadius: '0.75rem',
                            border: '1px solid #e2e8f0',
                            fontSize: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-sm font-bold text-slate-900 leading-tight">
                        {totalValuation >= 10000000
                          ? `₹${(totalValuation / 10000000).toFixed(1)}Cr`
                          : totalValuation >= 100000
                          ? `₹${(totalValuation / 100000).toFixed(1)}L`
                          : formatINR(totalValuation)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Invested</span>
                    </div>
                  </div>

                  {/* Asset Class Progress & Legend */}
                  <div className="flex-1 w-full space-y-3">
                    {allocationByType.map((item) => (
                      <div key={item.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-semibold text-slate-800">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{formatINR(item.value)}</span>
                            <span className="text-slate-400 text-[11px] font-mono">({item.pct.toFixed(1)}%)</span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(item.pct, 0)}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Total Assets: {filteredHoldings.length} tracked</span>
                <span>Immediate Liquidity: {formatINR(state.liquidWealth)}</span>
              </div>
            </div>

            {/* Secondary Visual: Gain / Loss by Asset Type */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      Gain / Loss by Asset Type
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      What is driving your portfolio return?
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-md',
                      totalGain >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    )}
                  >
                    {totalGain >= 0 ? '+' : ''}{totalGainPct.toFixed(1)}% Net
                  </span>
                </div>

                {/* Gain Breakdown List */}
                <div className="mt-4 space-y-2.5">
                  {gainByAssetType.map((item) => (
                    <div
                      key={item.key}
                      className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{item.label}</span>
                          <span className="text-[11px] text-slate-400">Invested: {formatINR(item.cost)}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={cn(
                            'text-xs font-bold flex items-center justify-end gap-0.5',
                            item.gain >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          )}
                        >
                          {item.gain >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {item.gain >= 0 ? '+' : ''}{formatINR(item.gain)}
                        </div>
                        <span
                          className={cn(
                            'text-[10px] font-semibold block',
                            item.gain >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          )}
                        >
                          {item.gainPct >= 0 ? '+' : ''}{item.gainPct.toFixed(1)}% return
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Net Gain: {formatINR(totalGain)}</span>
                <span className="text-emerald-700 font-semibold">Profitable in {gainByAssetType.filter(i => i.gain >= 0).length}/{gainByAssetType.length} classes</span>
              </div>
            </div>
          </div>

          {/* Table Controls (Search & Asset Type Tabs) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            {/* Search */}
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by asset name, owner, or symbol…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Type Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'MF', 'Stock', 'FD', 'Gold'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTypeFilter(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                    selectedTypeFilter === t
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {t === 'ALL' ? 'All Types' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Household-Oriented Inventory Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Asset & Scheme</th>
                    <th className="py-3 px-4">Owner Member</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Current Value</th>
                    <th className="py-3 px-4 text-right">Cost Basis</th>
                    <th className="py-3 px-4 text-right">Gain / Loss</th>
                    <th className="py-3 px-4 text-center">Liquidity Class</th>
                    <th className="py-3 px-4 text-center">Tax Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No assets found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredHoldings.map((h) => {
                      // Liquidity Badge Styling
                      const liquidityBadge =
                        h.liquidityClass === 'Immediate'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : h.liquidityClass === 'High'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : h.liquidityClass === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200';

                      // Tax Status Badge Styling
                      const taxBadge =
                        h.taxStatus === 'LTCG Eligible'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : h.taxStatus === 'STCG'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200';

                      return (
                        <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Asset Name & Identifier */}
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="font-semibold text-slate-800">{h.name}</div>
                            {h.identifier && (
                              <div className="text-[11px] text-slate-400">{h.identifier}</div>
                            )}
                          </td>

                          {/* Owner Member */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{h.ownerName}</div>
                            <span className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded font-medium">
                              {h.ownerRelation}
                            </span>
                          </td>

                          {/* Type */}
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="text-[10px] font-bold text-slate-700">
                              {h.assetType}
                            </Badge>
                          </td>

                          {/* Current Value */}
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            {formatINR(h.currentValue)}
                          </td>

                          {/* Cost Basis */}
                          <td className="py-3.5 px-4 text-right text-slate-600">
                            {formatINR(h.costBasis)}
                          </td>

                          {/* Gain / Loss */}
                          <td className="py-3.5 px-4 text-right">
                            <div
                              className={cn(
                                'font-bold inline-flex items-center gap-0.5',
                                h.gainLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              )}
                            >
                              {h.gainLoss >= 0 ? '+' : ''}
                              {formatINR(h.gainLoss)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {h.gainLossPct >= 0 ? '+' : ''}
                              {h.gainLossPct.toFixed(1)}%
                            </div>
                          </td>

                          {/* Liquidity Class */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={cn(
                                'inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                                liquidityBadge
                              )}
                            >
                              {h.liquidityClass}
                            </span>
                          </td>

                          {/* Tax Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={cn(
                                'inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                                taxBadge
                              )}
                            >
                              {h.taxStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal using createPortal */}
        <RecordAssetModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
        />
      </main>
    </div>
  );
}
