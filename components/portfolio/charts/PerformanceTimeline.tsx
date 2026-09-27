'use client';

import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PerformanceTimelineProps {
  transactions?: any[];
}

export default function PerformanceTimeline({ transactions }: PerformanceTimelineProps) {
  const chartData = useMemo(() => {
    if (transactions && transactions.length > 0) {
      let cumulativeInvested = 0;
      const labels: string[] = [];
      const investedData: number[] = [];

      transactions.forEach((tx: any) => {
        const dateStr = new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        const amount = Number(tx.amount || 0);
        if (['BUY', 'SIP', 'SWITCH_IN'].includes(tx.type)) {
          cumulativeInvested += amount;
        } else if (['SELL', 'SWITCH_OUT'].includes(tx.type)) {
          cumulativeInvested -= amount;
        }
        labels.push(dateStr);
        investedData.push(cumulativeInvested);
      });

      return {
        labels,
        datasets: [
          {
            label: 'Cumulative Invested (₹)',
            data: investedData,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.3,
          },
        ],
      };
    }

    // Default sample trend
    return {
      labels: ['Jan 2026', 'Mar 2026', 'May 2026', 'Jul 2026', 'Sep 2026'],
      datasets: [
        {
          label: 'Invested Capital (₹)',
          data: [500000, 750000, 920000, 1100000, 1245000],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          fill: true,
          tension: 0.35,
        },
        {
          label: 'Current Valuation (₹)',
          data: [520000, 810000, 1050000, 1320000, 1582350],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [transactions]);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Portfolio Performance Trajectory</h3>
          <p className="text-xs text-slate-500">Historical capital invested vs current market valuation</p>
        </div>
      </div>
      <div className="h-72 w-full">
        <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
      </div>
    </div>
  );
}
