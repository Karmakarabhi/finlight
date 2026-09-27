'use client';

import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import AIHoldingExplainer from './AIHoldingExplainer';

interface FundWiseTableProps {
  holdings?: any[];
  xirrData?: any;
}

export default function FundWiseTable({ holdings, xirrData }: FundWiseTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const getGainColor = (gain: number) => gain >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50";

  const totalPortfolioValue = (holdings || []).reduce(
    (sum: number, h: any) => sum + (Number(h.currentNav || 0) * Number(h.units || 0)), 0
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800">Fund-wise Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-3">Fund Name</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Cap Type</th>
              <th className="px-6 py-3 text-right">Invested (₹)</th>
              <th className="px-6 py-3 text-right">Current (₹)</th>
              <th className="px-6 py-3 text-right">Gain (₹)</th>
              <th className="px-6 py-3 text-right">Gain %</th>
              <th className="px-6 py-3 text-center">AI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 divide-x-0">
            {holdings?.map((holding: any) => {
              const invested = Number(holding.units || 0) * Number(holding.avgCost || 0);
              const current = Number(holding.units || 0) * Number(holding.currentNav || 0);
              const gain = current - invested;
              const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
              const isPositive = gain >= 0;
              const holdingKey = holding.id || holding._id;
              const isExpanded = expandedId === holdingKey;

              return (
                <React.Fragment key={holdingKey}>
                  <tr
                    className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isExpanded ? 'bg-violet-50/40' : ''}`}
                    onClick={() => setExpandedId(isExpanded ? null : holdingKey)}
                  >
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {holding.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {holding.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{holding.capType || '-'}</td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      ₹{invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">
                      ₹{current.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1 font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        ₹{Math.abs(gain).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded border font-medium text-xs
                        ${isPositive ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-rose-200 text-rose-700 bg-rose-50'}`}
                      >
                        {gainPct>0 ? '+' : ''}{gainPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                      <AIHoldingExplainer
                        holding={holding}
                        totalPortfolioValue={totalPortfolioValue}
                      />
                    </td>
                  </tr>

                  {/* AI explainer row — expands inline */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="px-0 py-0 bg-violet-50/30">
                        <div className="px-4 pb-4 pt-1">
                          <AIHoldingExplainer
                            holding={holding}
                            totalPortfolioValue={totalPortfolioValue}
                            autoTrigger
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {(!holdings || holdings.length === 0) && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                  No holding data to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
