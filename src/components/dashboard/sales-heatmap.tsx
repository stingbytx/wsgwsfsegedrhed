"use client";
import * as React from "react";
import type { HeatmapCell } from "@/services/dashboard-analytics";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** 24-hour sales heatmap. Darker cells = more sales in that hour. */
export function SalesHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const { currencySymbol } = useUIStore();
  const [hover, setHover] = React.useState<HeatmapCell | null>(null);
  return (
    <div className="rounded-[20px] bg-white border border-slate-100 shadow-[0_2px_20px_rgba(0,48,135,0.06)] p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Sales Heatmap (by hour, last 30 days)</h3>
      <div className="grid grid-cols-12 gap-1">
        {cells.map((c) => (
          <div
            key={c.hour}
            onMouseEnter={() => setHover(c)}
            onMouseLeave={() => setHover(null)}
            className={cn("aspect-square rounded-md flex items-center justify-center text-[9px] font-medium cursor-default")}
            style={{ background: `rgba(0, 112, 224, ${0.08 + c.intensity * 0.92})`, color: c.intensity > 0.5 ? "white" : "#475569" }}
            title={`${c.label} — ${formatMoney(c.total, currencySymbol)}`}
          >
            {c.label}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-2">
        {hover ? `${hover.label} — ${formatMoney(hover.total, currencySymbol)}` : "Darker = busier. Hover a cell for the total."}
      </p>
    </div>
  );
}
