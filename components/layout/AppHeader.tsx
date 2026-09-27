'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  User,
  Shield,
  RefreshCw,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHousehold, MemberFilter } from '@/context/HouseholdContext';

export function AppHeader() {
  const { memberFilter, setMemberFilter, familyName, loading, refresh } = useHousehold();

  const memberOptions: { label: string; value: MemberFilter; sub: string }[] = [
    { label: 'Entire Family', value: 'all', sub: 'Consolidated View' },
    { label: 'Self', value: 'Self', sub: 'Abhijit (CFO)' },
    { label: 'Spouse', value: 'Spouse', sub: 'Priyanka' },
    { label: 'Father', value: 'Father', sub: 'Prabir' },
    { label: 'Mother', value: 'Mother', sub: 'Kabita' },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
      {/* Left: Family Selector & Member Filter */}
      <div className="flex items-center gap-3">
        {/* Family Selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
          <div className="flex items-center justify-center w-5 h-5 rounded-md bg-violet-100 text-violet-700">
            <Users className="w-3 h-3" />
          </div>
          <span>
            Family: <strong className="font-semibold text-slate-900">{familyName}</strong>
          </span>
          <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
            Active
          </span>
        </div>

        {/* Member View Filter */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="member-filter-select" className="text-xs text-slate-500 font-medium whitespace-nowrap">
            View:
          </label>
          <div className="relative">
            <select
              id="member-filter-select"
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value as MemberFilter)}
              className="appearance-none bg-white border border-slate-200 rounded-lg pl-8 pr-8 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer transition-colors"
            >
              {memberOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.sub})
                </option>
              ))}
            </select>
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => refresh()}
          disabled={loading}
          className="h-9 gap-1.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs"
          title="Reload latest household snapshot"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh State</span>
        </Button>

        <div className="h-4 w-px bg-slate-200" />

        <Link href="/login">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Exit Session</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
