'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  ReceiptText,
  PieChart,
  Compass,
  Sparkles,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Holdings', href: '/holdings', icon: Briefcase },
  { title: 'Activity & Tax', href: '/activity', icon: ReceiptText },
  { title: 'Analytics', href: '/analytics', icon: PieChart },
];

const decisionNavItems: NavItem[] = [
  {
    title: 'Decision Center',
    href: '/decision',
    icon: Compass,
    badge: 'Simulate',
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-violet-600/20">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-800 tracking-tight">Finlight</span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
              V1
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Family Wealth Platform</span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 py-5 px-3 space-y-6">
        {/* MAIN GROUP */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Main
          </div>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-violet-50 text-violet-700 font-semibold shadow-sm shadow-violet-100/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isActive ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    />
                    <span>{item.title}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-violet-600" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* DECISIONS GROUP (Visually Highlighted) */}
        <div>
          <div className="px-3 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              Decisions
            </span>
            <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
              Active Engine
            </span>
          </div>

          <nav className="space-y-1">
            {decisionNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all border',
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/25 border-transparent'
                      : 'bg-gradient-to-r from-violet-50/80 via-indigo-50/50 to-white text-indigo-900 border-indigo-200/70 hover:border-indigo-300 hover:shadow-sm'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        isActive ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className={cn('text-xs font-bold leading-tight', isActive ? 'text-white' : 'text-slate-900')}>
                        {item.title}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] leading-tight',
                          isActive ? 'text-indigo-100' : 'text-slate-500'
                        )}
                      >
                        What-if Simulations
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider',
                      isActive
                        ? 'bg-white text-indigo-700'
                        : 'bg-indigo-600 text-white shadow-xs'
                    )}
                  >
                    {item.badge}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Family CFO Status Badge */}
        <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/60">
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Local & Private</span>
          </div>
          <p className="text-[11px] text-emerald-700/80 mt-1 leading-relaxed">
            All decision math runs locally in pure TypeScript. Zero data leaves your machine.
          </p>
        </div>
      </div>

      {/* Footer Operator Info */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            AK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">Abhijit Karmakar</p>
            <p className="text-[10px] text-slate-400 truncate">Family CFO (Operator)</p>
          </div>
          <Link href="/login" title="Logout" className="text-slate-400 hover:text-slate-600 p-1">
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
