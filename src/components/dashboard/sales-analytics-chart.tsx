"use client";
import * as React from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { useSalesSeries } from "@/hooks/use-dashboard-analytics";
import type { TrendGranularity, ChartType } from "@/services/dashboard-analytics";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const GRAN: TrendGranularity[] = ["hourly", "daily", "weekly", "monthly", "yearly"];
const TYPES: ChartType[] = ["line", "bar", "area"];

export function SalesAnalyticsChart() {
  const [gran, setGran] = React.useState<TrendGranularity>("daily");
  const [type, setType] = React.useState<ChartType>("area");
  const [metrics, setMetrics] = React.useState<Record<"revenue" | "profit" | "invoices", boolean>>({ revenue: true, profit: true, invoices: false });
  const { currencySymbol } = useUIStore();
  const series = useSalesSeries(gran);

  const fmt = (v: number) => formatMoney(Number(v), currencySymbol);

  return (
    <div className="rounded-[20px] bg-white border border-slate-100 shadow-[0_2px_20px_rgba(0,48,135,0.06)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Sales Analytics</h3>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {GRAN.map((g) => (
              <button key={g} onClick={() => setGran(g)} className={cn("px-2.5 py-1 text-xs capitalize", gran === g ? "bg-[#0070E0] text-white" : "text-slate-600 hover:bg-slate-50")}>{g}</button>
            ))}
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)} className={cn("px-2.5 py-1 text-xs capitalize", type === t ? "bg-slate-700 text-white" : "text-slate-600 hover:bg-slate-50")}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-2 text-xs">
        {(["revenue", "profit", "invoices"] as const).map((m) => (
          <label key={m} className="inline-flex items-center gap-1.5 text-slate-600 capitalize">
            <input type="checkbox" checked={metrics[m]} onChange={(e) => setMetrics((s) => ({ ...s, [m]: e.target.checked }))} />
            {m}
          </label>
        ))}
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend />
              {metrics.revenue && <Line type="monotone" dataKey="revenue" stroke="#0070E0" strokeWidth={2} />}
              {metrics.profit && <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} />}
              {metrics.invoices && <Line type="monotone" dataKey="invoices" stroke="#f59e0b" strokeWidth={2} />}
            </LineChart>
          ) : type === "bar" ? (
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend />
              {metrics.revenue && <Bar dataKey="revenue" fill="#0070E0" radius={[6, 6, 0, 0]} />}
              {metrics.profit && <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} />}
              {metrics.invoices && <Bar dataKey="invoices" fill="#f59e0b" radius={[6, 6, 0, 0]} />}
            </BarChart>
          ) : (
            <AreaChart data={series}>
              <defs>
                <linearGradient id="sa-rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0070E0" stopOpacity={0.4} /><stop offset="100%" stopColor="#0070E0" stopOpacity={0} /></linearGradient>
                <linearGradient id="sa-prof" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.4} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend />
              {metrics.revenue && <Area type="monotone" dataKey="revenue" stroke="#0070E0" strokeWidth={2} fill="url(#sa-rev)" />}
              {metrics.profit && <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#sa-prof)" />}
              {metrics.invoices && <Area type="monotone" dataKey="invoices" stroke="#f59e0b" strokeWidth={2} fill="transparent" />}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
