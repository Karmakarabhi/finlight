import * as React from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

interface MetricCardProps {
  label?: string;
  title?: string;
  value: React.ReactNode;
  delta?: number;
  deltaLabel?: string;
  description?: string;
  icon?: any;
  trend?: { value: string; isPositive: boolean };
  accent?: "default" | "success" | "warning" | "info" | string;
}

export function MetricCard({
  label,
  title,
  value,
  delta,
  deltaLabel,
  description,
  icon: Icon,
  trend,
  accent = "default"
}: MetricCardProps) {
  const isUp = trend ? trend.isPositive : (delta ?? 0) >= 0;
  const accentMap: Record<string, string> = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    info: "bg-blue-50 text-blue-700",
  };

  const displayLabel = label || title;
  const displayDelta = trend ? trend.value : (delta !== undefined ? `${isUp ? "+" : ""}${delta}%` : null);

  return (
    <Card className="p-5 hover:shadow-md transition-all border-slate-200 bg-white">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {displayLabel && (
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{displayLabel}</p>
          )}
          <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {description && (
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          )}
        </div>
        {Icon && (
          <div className={cn("p-2.5 rounded-xl border border-slate-100", accentMap[accent] || accentMap.default)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {(displayDelta !== null || deltaLabel) && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {isUp ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
          )}
          {displayDelta && (
            <span className={cn("font-semibold", isUp ? "text-emerald-600" : "text-rose-600")}>
              {displayDelta}
            </span>
          )}
          {deltaLabel && <span className="text-slate-400">{deltaLabel}</span>}
        </div>
      )}
    </Card>
  );
}
