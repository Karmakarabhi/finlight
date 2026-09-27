'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";

async function getHoldingExplanation(holdingId: any) {
  const res = await fetch('/api/ai/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdingId })
  });
  const data = await res.json();
  return { data: data.data || data };
}
import { Sparkles, X, Loader2, BookOpen, ShieldAlert, Target, TrendingUp } from 'lucide-react';

export default function AIHoldingExplainer({ holding, totalPortfolioValue = 0, autoTrigger = false }: { holding: any; totalPortfolioValue?: number; autoTrigger?: boolean }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [explanation, setExplanation] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const holdingValue = (holding.currentNav || 0) * (holding.units || 0);
  const weight = totalPortfolioValue > 0
    ? ((holdingValue / totalPortfolioValue) * 100).toFixed(1)
    : 0;

  // Auto-fire when rendered in expanded row
  useEffect(() => {
    if (autoTrigger && state === 'idle') {
      handleExplain({ stopPropagation: () => {} });
    }
  }, [autoTrigger]); // eslint-disable-line

  const handleExplain = async (e?: any) => {
    e?.stopPropagation?.();
    setState('loading');
    try {
      const data = await getHoldingExplanation(holding.id || holding._id);
      setExplanation(data);
      setState('done');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to get explanation.');
      setState('error');
    }
  };

  // ── Trigger button ──────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExplain}
        className="h-7 px-2 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50"
        title="Explain this holding with AI"
      >
        <Sparkles className="w-3 h-3 mr-1" />
        Explain
      </Button>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <Button variant="ghost" size="sm" disabled className="h-7 px-2 text-xs">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Thinking…
      </Button>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="inline-flex items-center gap-1 text-xs text-rose-600">
        <span>{errorMsg}</span>
        <button onClick={() => setState('idle')} className="underline ml-1">Retry</button>
      </div>
    );
  }

  // ── Explanation card (shown inline below the row) ───────────────────────────
  return (
    <div className="mt-2 mx-2 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 text-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600" />
          <span className="font-semibold text-violet-800">{holding.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
            {weight}% of portfolio
          </span>
        </div>
        <button onClick={() => setState('idle')} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Explanation rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {explanation?.whatItIs && (
          <ExplainRow icon={BookOpen} label="What it is" text={explanation.whatItIs} />
        )}
        {explanation?.portfolioRole && (
          <ExplainRow icon={Target} label="Role in portfolio" text={explanation.portfolioRole} />
        )}
        {explanation?.riskNote && (
          <ExplainRow icon={ShieldAlert} label="Key risk" text={explanation.riskNote} color="text-amber-600" />
        )}
        {explanation?.concentration && (
          <ExplainRow icon={TrendingUp} label="Concentration" text={explanation.concentration} />
        )}
      </div>

      <p className="text-[10px] text-muted-foreground pt-1">
        AI-generated explanation for informational purposes only. Not financial advice.
      </p>
    </div>
  );
}

function ExplainRow({ icon: Icon, label, text, color = 'text-violet-600' }: { icon: any; label: string; text: string; color?: string }) {
  return (
    <div className="bg-white/70 rounded-lg p-3 border border-white">
      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed">{text}</p>
    </div>
  );
}
