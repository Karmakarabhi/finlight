'use client';

import * as React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function MarketCapChart({ holdings }: { holdings?: any[] }) {
  const hasHoldings = holdings && holdings.length > 0;
  const equityHoldings = hasHoldings
    ? holdings.filter((h: any) => h.category === 'Equity' || h.type === 'MF' || h.type === 'Stock')
    : [];

  const capData = equityHoldings.length > 0
    ? equityHoldings.reduce((acc: Record<string, number>, holding: any) => {
        const value = Number(holding.units || 0) * Number(holding.currentNav || holding.avgCost || 0);
        const cap = holding.capType || 'Multi';
        acc[cap] = (acc[cap] || 0) + value;
        return acc;
      }, {})
    : { Large: 50, Mid: 30, Small: 20 };

  const labels = Object.keys(capData);
  const dataValues = Object.values(capData);

  const data = {
    labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: [
          '#3b82f6', // Blue (Large Cap)
          '#8b5cf6', // Violet (Mid Cap)
          '#ec4899', // Pink (Small Cap)
          '#10b981', // Emerald (Multi Cap)
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
      <h3 className="text-base font-semibold text-slate-800 mb-4 self-start">Market Capitalization</h3>
      <div className="w-64 h-64">
        <Doughnut data={data} options={{ maintainAspectRatio: false }} />
      </div>
      {equityHoldings.length === 0 && (
        <p className="text-[11px] text-slate-400 mt-2">Showing target equity distribution</p>
      )}
    </div>
  );
}
