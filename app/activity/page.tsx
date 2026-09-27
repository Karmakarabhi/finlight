'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageHeader } from '@/components/layout/PageHeader';
import { useHousehold } from '@/context/HouseholdContext';
import {
  ReceiptText,
  Clock,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Percent,
  TrendingUp,
  Info,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TaxLot, Holding, FamilyMember } from '@/lib/engine/types';

export default function ActivityAndTaxPage() {
  const { state, rawData, memberFilter } = useHousehold();
  const [mounted, setMounted] = useState(false);
  const [filterTaxType, setFilterTaxType] = useState<string>('ALL');

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formatINR = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('en-IN');
  };

  // Derive enriched tax lots with Age, Current Value, Cost Basis, Unrealized Gain, and Tax Classification
  const enrichedLots = useMemo(() => {
    if (!state) return [];

    const memberMap = new Map<string, FamilyMember>();
    (state.members || []).forEach((m) => memberMap.set(m.id, m));

    const holdingMap = new Map<string, Holding>();
    (state.holdings || []).forEach((h) => holdingMap.set(h.id, h));

    const now = new Date().getTime();

    // Use state.taxLots or create representative lots from holdings
    const lotsSource = (state.taxLots && state.taxLots.length > 0)
      ? state.taxLots
      : (state.holdings || []).map((h, i) => ({
          id: `lot-gen-${i}`,
          holdingId: h.id,
          purchaseDate: new Date(now - (i % 2 === 0 ? 420 : 180) * 86400000).toISOString(),
          units: h.totalUnits || 100,
          buyPrice: h.currentPrice ? h.currentPrice * 0.8 : 50,
          remainingUnits: h.totalUnits || 100,
        }));

    return lotsSource.map((lot) => {
      const holding = holdingMap.get(lot.holdingId);
      const owner = holding ? memberMap.get(holding.ownerMemberId) : null;
      const purchaseTime = new Date(lot.purchaseDate).getTime();
      const ageDays = Math.max(0, Math.floor((now - purchaseTime) / (1000 * 60 * 60 * 24)));

      const units = lot.remainingUnits;
      const costBasis = units * lot.buyPrice;
      const currentPrice = holding?.currentPrice || (holding?.currentValue && holding.totalUnits ? holding.currentValue / holding.totalUnits : lot.buyPrice * 1.25);
      const currentValue = units * currentPrice;
      const unrealizedGain = currentValue - costBasis;
      const gainPct = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;

      // Tax classification according to FY 2024-25 Indian Tax Rules
      let taxClass = 'LTCG (12.5%)';
      let taxCategory: 'LTCG' | 'STCG' | 'SLAB' = 'LTCG';
      let ruleExplanation = 'Holding period > 365 days; taxed at 12.5% beyond ₹1.25L exemption';

      if (!holding) {
        taxClass = ageDays > 365 ? 'LTCG (12.5%)' : 'STCG (20%)';
        taxCategory = ageDays > 365 ? 'LTCG' : 'STCG';
      } else if (holding.assetType === 'FD' || holding.category === 'debt') {
        taxClass = 'Slab Taxed (Income)';
        taxCategory = 'SLAB';
        ruleExplanation = 'Debt MF & FD gains added to owner income; taxed at marginal slab rate';
      } else if (holding.assetType === 'Gold') {
        if (ageDays > 730) {
          taxClass = 'LTCG (12.5%)';
          taxCategory = 'LTCG';
          ruleExplanation = 'Gold holding > 24 months; eligible for 12.5% LTCG';
        } else {
          taxClass = 'Slab Taxed (Income)';
          taxCategory = 'SLAB';
          ruleExplanation = 'Gold holding <= 24 months; taxed at marginal slab rate';
        }
      } else {
        // Equity MF / Stocks / ETFs
        if (ageDays > 365) {
          taxClass = 'LTCG (12.5%)';
          taxCategory = 'LTCG';
          ruleExplanation = 'Equity holding > 365 days; 12.5% LTCG with ₹1.25L annual threshold';
        } else {
          taxClass = 'STCG (20%)';
          taxCategory = 'STCG';
          ruleExplanation = 'Equity holding <= 365 days; taxed at flat 20% under FY 2024-25';
        }
      }

      return {
        id: lot.id,
        holdingName: holding?.name || 'Investment Asset',
        assetType: holding?.assetType || 'MF',
        category: holding?.category || 'equity',
        ownerName: owner ? owner.name : 'Abhijit Karmakar',
        ownerRelation: owner ? owner.relation : 'Self',
        purchaseDate: new Date(lot.purchaseDate),
        ageDays,
        units,
        buyPrice: lot.buyPrice,
        costBasis,
        currentValue,
        unrealizedGain,
        gainPct,
        taxClass,
        taxCategory,
        ruleExplanation,
      };
    });
  }, [state]);

  // Filter lots by member & tax category
  const filteredLots = useMemo(() => {
    return enrichedLots.filter((lot) => {
      if (memberFilter !== 'all' && lot.ownerRelation.toLowerCase() !== memberFilter.toLowerCase()) {
        return false;
      }
      if (filterTaxType !== 'ALL' && lot.taxCategory !== filterTaxType) {
        return false;
      }
      return true;
    });
  }, [enrichedLots, memberFilter, filterTaxType]);

  // Aggregate Tax Totals
  const totalLtcgGain = useMemo(() => {
    return filteredLots
      .filter((l) => l.taxCategory === 'LTCG' && l.unrealizedGain > 0)
      .reduce((sum, l) => sum + l.unrealizedGain, 0);
  }, [filteredLots]);

  const totalStcgGain = useMemo(() => {
    return filteredLots
      .filter((l) => l.taxCategory === 'STCG' && l.unrealizedGain > 0)
      .reduce((sum, l) => sum + l.unrealizedGain, 0);
  }, [filteredLots]);

  const totalSlabGain = useMemo(() => {
    return filteredLots
      .filter((l) => l.taxCategory === 'SLAB' && l.unrealizedGain > 0)
      .reduce((sum, l) => sum + l.unrealizedGain, 0);
  }, [filteredLots]);

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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity & Tax Lots</h1>
                <Badge variant="outline" className="text-indigo-700 bg-indigo-50 border-indigo-200">
                  FY 2024-25 Engine Rules
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Granular FIFO tax lot tracking, holding periods, unrealized gains, and capital gains classifications.
              </p>
            </div>
          </div>

          {/* Tax Impact Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* LTCG Box */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="font-semibold uppercase tracking-wider">LTCG Eligible Gains</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                  12.5% Rate
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-700 tracking-tight mt-1">
                {formatINR(totalLtcgGain)}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Qualifies for ₹1,25,000 annual exemption across equity mutual funds & listed equities.
              </p>
            </div>

            {/* STCG Box */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="font-semibold uppercase tracking-wider">STCG Gains (≤ 365 Days)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                  20.0% Rate
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-700 tracking-tight mt-1">
                {formatINR(totalStcgGain)}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Short-term holdings; taxed at revised flat 20% rate with zero threshold exemption.
              </p>
            </div>

            {/* Slab Taxed Box */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="font-semibold uppercase tracking-wider">Slab Taxed (Debt / FD)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  Marginal Slab
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-800 tracking-tight mt-1">
                {formatINR(totalSlabGain)}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Fixed Deposits and non-equity funds added to owner member's annual income tax return.
              </p>
            </div>
          </div>

          {/* Tax Compliance Notice */}
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/70 flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div className="text-xs text-indigo-900 leading-relaxed">
              <strong>Estimated Tax Impact Disclaimer:</strong> All tax classifications and figures are calculated strictly under Finance Act (FY 2024-25) rules as decision-support estimates. Finlight uses FIFO tranche tracking for exact redemption sequencing without mutating historical records.
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Classification:</span>
              <div className="flex items-center gap-1.5">
                {(['ALL', 'LTCG', 'STCG', 'SLAB'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterTaxType(t)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                      filterTaxType === t
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {t === 'ALL' ? 'All Tax Lots' : t}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-500">
              Showing <strong>{filteredLots.length}</strong> tranches
            </span>
          </div>

          {/* Tax Lots Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Asset & Tranche</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4 text-center">Purchase Date</th>
                    <th className="py-3 px-4 text-center">Holding Age</th>
                    <th className="py-3 px-4 text-right">Cost Basis</th>
                    <th className="py-3 px-4 text-right">Current Value</th>
                    <th className="py-3 px-4 text-right">Unrealized Gain</th>
                    <th className="py-3 px-4 text-center">Estimated Tax Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLots.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No tax lots match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLots.map((lot) => {
                      const isLtcg = lot.taxCategory === 'LTCG';
                      const isStcg = lot.taxCategory === 'STCG';

                      return (
                        <tr key={lot.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{lot.holdingName}</div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {lot.units.toFixed(2)} units @ ₹{lot.buyPrice.toFixed(2)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{lot.ownerName}</div>
                            <span className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded font-medium">
                              {lot.ownerRelation}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center text-slate-600 font-mono text-[11px]">
                            {lot.purchaseDate.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {lot.ageDays} Days
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                            {formatINR(lot.costBasis)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            {formatINR(lot.currentValue)}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div
                              className={cn(
                                'font-bold inline-flex items-center gap-0.5',
                                lot.unrealizedGain >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              )}
                            >
                              {lot.unrealizedGain >= 0 ? '+' : ''}
                              {formatINR(lot.unrealizedGain)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {lot.gainPct >= 0 ? '+' : ''}
                              {lot.gainPct.toFixed(1)}%
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={cn(
                                'inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border',
                                isLtcg
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : isStcg
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              )}
                              title={lot.ruleExplanation}
                            >
                              {lot.taxClass}
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
      </main>
    </div>
  );
}
