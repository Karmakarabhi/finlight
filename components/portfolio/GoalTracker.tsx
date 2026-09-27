'use client';

import React, { useState } from 'react';
import { Target, TrendingUp, AlertCircle, Edit2, Calendar } from 'lucide-react';
import { differenceInMonths, addMonths, format } from 'date-fns';

export default function GoalTracker({ currentValue = 0, xirr = 0 }) {
  // Local state for demonstration. In a real app, this would sync with InvestmentGoal model.
  const [goal, setGoal] = useState({
    name: 'Retirement',
    targetAmount: 10000000, 
    targetDate: new Date(new Date().getFullYear() + 10, 0, 1).toISOString().split('T')[0]
  });
  const [isEditing, setIsEditing] = useState(false);

  const progress = goal.targetAmount > 0 
    ? Math.min((currentValue / goal.targetAmount) * 100, 100) 
    : 0;

  // Calculate projected date using compound interest formula: FV = PV * (1 + r)^t
  // t = ln(FV/PV) / ln(1 + r)
  let projectedYears = 0;
  let projectedDate = null;
  let isOnTrack = false;
  let monthsRemaining = 0;

  const targetDateObj = new Date(goal.targetDate);
  const now = new Date();
  
  if (currentValue > 0 && xirr > 0 && goal.targetAmount > currentValue) {
    const rate = xirr; 
    projectedYears = Math.log(goal.targetAmount / currentValue) / Math.log(1 + rate);
    const projectedMonths = projectedYears * 12;
    projectedDate = addMonths(now, projectedMonths);
    
    monthsRemaining = differenceInMonths(targetDateObj, now);
    isOnTrack = projectedMonths <= monthsRemaining;
  } else if (currentValue >= goal.targetAmount) {
    isOnTrack = true;
    projectedDate = now;
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Investment Goal</h3>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Goal Name</label>
            <input 
              type="text" 
              value={goal.name}
              onChange={(e) => setGoal({...goal, name: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Amount (₹)</label>
            <input 
              type="number" 
              value={goal.targetAmount}
              onChange={(e) => setGoal({...goal, targetAmount: Number(e.target.value)})}
              className="w-full p-2 border border-slate-300 rounded-lg"
              required min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
            <input 
              type="date" 
              value={goal.targetDate}
              onChange={(e) => setGoal({...goal, targetDate: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Goal</button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{goal.name}</p>
              <p className="text-2xl font-bold text-slate-800 tracking-tight mt-1">
                ₹{currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                <span className="text-sm font-medium text-slate-400 ml-2">
                  / ₹{goal.targetAmount.toLocaleString('en-IN')}
                </span>
              </p>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5
              ${isOnTrack ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
            `}>
              {isOnTrack ? <TrendingUp className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {isOnTrack ? 'On Track' : 'Behind Target'}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>Progress</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${isOnTrack ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs font-medium text-slate-500">Target Date</p>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {format(targetDateObj, 'MMM yyyy')}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex items-center gap-1.5 mb-1">
                 <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs font-medium text-slate-500">Projected Date</p>
              </div>
              <p className={`text-sm font-semibold ${isOnTrack ? 'text-emerald-600' : 'text-rose-600'}`}>
                {projectedDate && xirr > 0 ? format(projectedDate, 'MMM yyyy') : 'N/A'}
              </p>
            </div>
          </div>
          
          {!isOnTrack && xirr > 0 && currentValue > 0 && (
            <p className="text-xs text-rose-600 mt-2 bg-rose-50 p-2 rounded-lg border border-rose-100">
              Your estimated growth ({ (xirr * 100).toFixed(1) }%) is not pacing quickly enough to hit the target. Consider increasing your SIP.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
