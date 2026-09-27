'use client';

import * as React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function AssetAllocationChart({ holdings }: { holdings?: any[] }) {
  const hasHoldings = holdings && holdings.length > 0;

  const categoryData = hasHoldings
    ? holdings.reduce((acc: Record<string, number>, holding: any) => {
        const value = Number(holding.units || 0) * Number(holding.currentNav || holding.avgCost || 0);
        const cat = holding.category || 'Other';
        acc[cat] = (acc[cat] || 0) + value;
        return acc;
      }, {})
    : { Equity: 60, Debt: 30, Gold: 10 };

  const labels = Object.keys(categoryData);
  const dataValues = Object.values(categoryData);

  const data = {
    labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: [
          '#6366f1', // Indigo (Equity)
          '#06b6d4', // Cyan (Debt)
          '#eab308', // Yellow (Gold)
          '#10b981', // Emerald
          '#ec4899', // Pink
          '#8b5cf6', // Violet
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
      <h3 className="text-base font-semibold text-slate-800 mb-4 self-start">Asset Allocation</h3>
      <div className="w-64 h-64">
        <Pie data={data} options={{ maintainAspectRatio: false }} />
      </div>
      {!hasHoldings && (
        <p className="text-[11px] text-slate-400 mt-2">Showing target model allocation</p>
      )}
    </div>
  );
}
