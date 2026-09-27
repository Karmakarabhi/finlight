'use client';

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function getPortfolioReview(portfolioId?: string) {
  const res = await fetch('/api/ai/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portfolioId: portfolioId || 'default' })
  });
  const data = await res.json();
  return { data: data.data || data };
}
import {
  Sparkles, Brain, AlertTriangle, CheckCircle2, Info,
  ChevronDown, ChevronUp, Zap, Star, Loader2, Shield,
  PieChart, Target, TrendingUp, BarChart3
} from 'lucide-react';

// ── Status display config ─────────────────────────────────────────────────────
const STATUS: Record<string, any> = {
  good:    { label: 'Good',    icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200', dot: 'bg-emerald-500' },
  info:    { label: 'Review',  icon: Info,          color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-400' },
  warning: { label: 'Warning', icon: AlertTriangle,  color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200',  dot: 'bg-amber-500' },
  caution: { label: 'Caution', icon: AlertTriangle,  color: 'text-rose-600',   bg: 'bg-rose-50',    border: 'border-rose-200',   dot: 'bg-rose-500' },
};

const CATEGORY_ICONS: Record<string, any> = {
  'Allocation':      PieChart,
  'Concentration':   BarChart3,
  'Diversification': Target,
  'Goal Progress':   TrendingUp,
  'Maturity Alert':  Shield,
};

const CONFIDENCE_LABEL: Record<string, any> = {
  high:   { text: 'High confidence',   style: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  medium: { text: 'Medium confidence', style: 'text-amber-700 bg-amber-50 border-amber-200' },
  low:    { text: 'Low confidence',    style: 'text-slate-600 bg-slate-50 border-slate-200' },
};

// ── Health Matrix ─────────────────────────────────────────────────────────────
function HealthMatrix({ healthMatrix }: { healthMatrix: Record<string, string> }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4 text-violet-600" />
        <h4 className="text-sm font-semibold text-foreground">Portfolio Health</h4>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium ml-auto">
          Powered by Portfolio Intelligence
        </span>
      </div>
      <div className="divide-y divide-border">
        {Object.entries(healthMatrix).map(([category, status]) => {
          const cfg = STATUS[status] || STATUS.info;
          const StatusIcon = cfg.icon;
          const CatIcon = CATEGORY_ICONS[category] || Shield;
          return (
            <div key={category} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2.5">
                <CatIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{category}</span>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                <StatusIcon className="w-3 h-3" />
                {cfg.label}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Rebalancing bar ───────────────────────────────────────────────────────────
function RebalancingBar({ label, actual, target, delta, excessValue }: { label: string; actual: number; target: number; delta: number; excessValue?: number | null }) {
  const isOver    = delta > 0;
  const absDeviation = Math.abs(delta);
  const barColor  = absDeviation <= 5 ? '#10b981' : isOver ? '#f59e0b' : '#3b82f6';
  const currency  = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">target {target}%</span>
          <span className="font-semibold text-foreground">{actual}%</span>
          {absDeviation > 2 && (
            <span className={`font-medium ${isOver ? 'text-amber-600' : 'text-blue-600'}`}>
              ({isOver ? '+' : ''}{delta}%)
            </span>
          )}
        </div>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(actual, 100)}%`, backgroundColor: barColor }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/40"
          style={{ left: `${Math.min(target, 100)}%` }}
          title={`Target: ${target}%`}
        />
      </div>
      {/* Show rupee amount only when backend has calculated it */}
      {excessValue !== 0 && excessValue !== null && (
        <p className="text-[10px] text-muted-foreground">
          {isOver
            ? `Overweight by ~${currency.format(excessValue as number)}`
            : `Underweight by ~${currency.format(Math.abs(excessValue as number))}`
          }
        </p>
      )}
    </div>
  );
}

// ── Finding card ──────────────────────────────────────────────────────────────
function FindingCard({ finding }: { finding: any }) {
  const [expanded, setExpanded] = useState(false);
  const cfg  = STATUS[finding.severity] || STATUS.info;
  const Icon = cfg.icon;
  const conf = CONFIDENCE_LABEL[finding.confidence] || CONFIDENCE_LABEL.medium;

  return (
    <div className={`border rounded-xl p-4 ${cfg.bg} ${cfg.border} transition-all`}>
      <div
        className="flex items-start justify-between gap-3 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-xs font-semibold ${cfg.color}`}>{finding.category}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${conf.style}`}>
                {conf.text}
              </span>
            </div>
            {/* AI explanation — the primary content */}
            {finding.explanation && (
              <p className="text-xs text-foreground/80 leading-relaxed">{finding.explanation}</p>
            )}
          </div>
        </div>
        <button className="flex-shrink-0 mt-0.5">
          {expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </button>
      </div>

      {/* Expanded: raw evidence */}
      {expanded && finding.evidence && (
        <div className="mt-3 pt-3 border-t border-current/10">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">
            Evidence (calculated by system)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(finding.evidence).map(([key, val]) => (
              <div key={key} className="bg-white/60 rounded px-2 py-1.5">
                <span className="text-[9px] text-muted-foreground block font-medium uppercase tracking-wide">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {typeof val === 'number' && key.toLowerCase().includes('value')
                    ? `₹${val.toLocaleString('en-IN')}`
                    : typeof val === 'number' && key.toLowerCase().includes('pct')
                    ? `${val}%`
                    : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AIAdvisorPanel({ portfolioId }: { portfolioId?: string }) {
  const [state, setState] = useState('idle');
  const [data, setData]   = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReview = async () => {
    setState('loading');
    setErrorMsg('');
    try {
      const result = await getPortfolioReview(portfolioId || 'default-portfolio');
      setData(result);
      setState('done');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Portfolio review failed. Please try again.');
      setState('error');
    }
  };

  // ── Idle ───────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <Card className="p-6 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 border-violet-200">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-foreground mb-1">Portfolio Intelligence</h3>
            <p className="text-sm text-muted-foreground max-w-lg">
              Get a structured analysis of your portfolio — allocation health, rebalancing signals,
              concentration risk, and plain-English explanations of every finding.
            </p>
          </div>
          <Button
            onClick={handleReview}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md flex-shrink-0"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Run Analysis
          </Button>
        </div>
      </Card>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    const steps = [
      'Computing asset allocation',
      'Running portfolio rules',
      'Generating plain-English insights',
    ];
    return (
      <Card className="p-8 border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <Loader2 className="w-5 h-5 text-violet-600 animate-spin absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Analyzing your portfolio…</h3>
            <p className="text-sm text-muted-foreground mt-1">Running portfolio rules and generating insights</p>
          </div>
          <div className="w-full max-w-xs space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin text-violet-500 flex-shrink-0" />
                {step}
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <Card className="p-6 border-rose-200 bg-rose-50">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3 className="font-semibold text-rose-800">Analysis Failed</h3>
        </div>
        <p className="text-sm text-rose-700 mb-4">{errorMsg}</p>
        <Button variant="outline" size="sm" onClick={() => setState('idle')}>Try Again</Button>
      </Card>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  const { portfolioSummary, healthMatrix, findings, metrics } = data;
  const reb = metrics?.rebalancing;

  // Sort findings by severity
  const SEVERITY_ORDER: Record<string, number> = { caution: 0, warning: 1, info: 2 };
  const sortedFindings = [...(findings || [])].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-violet-600" />
          <h3 className="font-semibold text-foreground">Portfolio Intelligence</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
            AI-Explained
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setState('idle')} className="text-xs text-muted-foreground">
          Re-run
        </Button>
      </div>

      {/* AI Summary */}
      {portfolioSummary && (
        <Card className="p-4 bg-slate-50 border-slate-200">
          <p className="text-sm text-foreground leading-relaxed">{portfolioSummary}</p>
        </Card>
      )}

      {/* Health matrix — deterministic, not AI-generated */}
      {healthMatrix && <HealthMatrix healthMatrix={healthMatrix} />}

      {/* Rebalancing — numbers are backend-calculated */}
      {reb && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">Allocation vs Target</h4>
            <span className="text-[10px] text-muted-foreground ml-auto">│ marks your target</span>
          </div>
          <div className="space-y-4">
            <RebalancingBar label="Equity" {...reb.equity} />
            <RebalancingBar label="Debt"   {...reb.debt} />
            <RebalancingBar label="Gold"   {...reb.gold} />
          </div>
        </Card>
      )}

      {/* Findings — each merged with AI explanation */}
      {sortedFindings.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Zap className="w-3 h-3" />
            {sortedFindings.length} Finding{sortedFindings.length !== 1 ? 's' : ''}
          </div>
          {sortedFindings.map((f, i) => (
            <FindingCard key={`${f.type}-${i}`} finding={f} />
          ))}
        </div>
      ) : (
        <Card className="p-5 bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">No significant issues detected</p>
              <p className="text-xs text-emerald-700 mt-0.5">Your portfolio is well-aligned with your targets.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground text-center px-4 pt-1">
        Portfolio Intelligence identifies allocation and concentration patterns. This is not financial advice.
        Consult a SEBI-registered advisor before making investment decisions.
      </p>
    </div>
  );
}
