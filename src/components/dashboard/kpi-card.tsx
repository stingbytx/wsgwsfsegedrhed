"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DollarSign, TrendingUp, BarChart3, Wallet, Receipt, CreditCard, AlertTriangle,
  PackageX, CalendarClock, Truck, Users, Banknote, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { formatDateTime } from "@/lib/format";
import type { KpiCard as KpiCardData } from "@/services/dashboard-analytics";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney } from "@/lib/format";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign, TrendingUp, BarChart3, Wallet, Receipt, CreditCard, AlertTriangle,
  PackageX, CalendarClock, Truck, Users, Banknote,
};

const TONE: Record<KpiCardData["tone"], { ring: string; icon: string; text: string; spark: string }> = {
  success: { ring: "border-emerald-100", icon: "bg-emerald-50 text-emerald-600", text: "text-emerald-600", spark: "#10b981" },
  warning: { ring: "border-amber-100", icon: "bg-amber-50 text-amber-600", text: "text-amber-600", spark: "#f59e0b" },
  danger: { ring: "border-red-100", icon: "bg-red-50 text-red-600", text: "text-red-600", spark: "#ef4444" },
  info: { ring: "border-blue-100", icon: "bg-[#0070E0]/10 text-[#0070E0]", text: "text-[#0070E0]", spark: "#0070E0" },
  purple: { ring: "border-purple-100", icon: "bg-purple-50 text-purple-600", text: "text-purple-600", spark: "#8b5cf6" },
};

export function KpiCard({ kpi, onClick }: { kpi: KpiCardData; onClick?: () => void }) {
  const { currencySymbol } = useUIStore();
  const tone = TONE[kpi.tone];
  const Icon = ICONS[kpi.icon] ?? DollarSign;
  const isCurrency = kpi.id !== "low-stock" && kpi.id !== "out-of-stock" && kpi.id !== "expiring" && kpi.id !== "today-customers";
  const display = isCurrency ? formatMoney(kpi.value, currencySymbol) : kpi.displayValue;
  const delta = kpi.deltaPct;
  const deltaUp = (delta ?? 0) >= 0;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "text-left rounded-[20px] bg-white border shadow-[0_2px_20px_rgba(0,48,135,0.06)] p-4 transition-all",
        tone.ring,
        onClick && "hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", tone.icon)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        {delta !== null && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", deltaUp ? "text-emerald-600" : "text-red-600")}>
            {deltaUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 font-medium">{kpi.title}</p>
      <p className="text-xl font-semibold text-slate-800 mt-0.5">{display}</p>
      {kpi.subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{kpi.subtitle}</p>}
      {kpi.trend.length > 1 && (
        <div className="h-10 mt-2 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={kpi.trend}>
              <defs>
                <linearGradient id={`g-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tone.spark} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={tone.spark} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={tone.spark} strokeWidth={1.5} fill={`url(#g-${kpi.id})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-[10px] text-slate-300 mt-1">Updated {formatDateTime(kpi.lastUpdated)}</p>
    </button>
  );
}
