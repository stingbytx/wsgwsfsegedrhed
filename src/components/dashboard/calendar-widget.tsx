"use client";
import * as React from "react";
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarDayData } from "@/services/dashboard-analytics";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney } from "@/lib/format";

/** Mini month calendar. Clicking a day shows that day's sales/purchases/expenses/profit. */
export function CalendarWidget({ days }: { days: CalendarDayData[] }) {
  const { currencySymbol } = useUIStore();
  const [cursor, setCursor] = React.useState(new Date());
  const [selected, setSelected] = React.useState<CalendarDayData | null>(null);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const rows: Date[][] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) { week.push(day); day = addDays(day, 1); }
    rows.push(week);
  }

  const dataFor = (d: Date) => days.find((x) => x.date === format(d, "yyyy-MM-dd"));
  const maxSales = Math.max(...days.map((d) => d.sales), 1);

  return (
    <div className="rounded-[20px] bg-white border border-slate-100 shadow-[0_2px_20px_rgba(0,48,135,0.06)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Calendar</h3>
        <div className="flex gap-1">
          <button onClick={() => setCursor(addDays(monthStart, -1))} className="px-2 py-0.5 text-xs rounded-md hover:bg-slate-100 text-slate-500">‹</button>
          <span className="text-xs text-slate-500 px-2">{format(cursor, "MMMM yyyy")}</span>
          <button onClick={() => setCursor(addDays(monthEnd, 1))} className="px-2 py-0.5 text-xs rounded-md hover:bg-slate-100 text-slate-500">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {rows.flat().map((d, i) => {
          const data = dataFor(d);
          const inMonth = isSameMonth(d, cursor);
          const intensity = data ? data.sales / maxSales : 0;
          return (
            <button
              key={i}
              onClick={() => data && setSelected(data)}
              disabled={!data}
              className={cn(
                "aspect-square rounded-md text-[10px] flex flex-col items-center justify-center transition-colors",
                !inMonth && "opacity-30",
                data ? "hover:ring-1 hover:ring-[#0070E0] cursor-pointer" : "cursor-default",
                isSameDay(d, new Date()) && "ring-1 ring-[#0070E0]"
              )}
              style={data ? { background: `rgba(0, 112, 224, ${0.06 + intensity * 0.5})` } : { background: "#f8fafc" }}
            >
              <span className={cn("font-medium", data && intensity > 0.3 ? "text-white" : "text-slate-600")}>{format(d, "d")}</span>
              {data && data.events > 0 && <span className={cn("text-[8px]", intensity > 0.3 ? "text-white/80" : "text-slate-400")}>{data.events}</span>}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1">
          <p className="text-slate-500 font-medium">{format(new Date(selected.date), "EEEE, dd MMM yyyy")}</p>
          <p className="flex justify-between"><span className="text-slate-400">Sales</span><span className="text-slate-700 font-medium">{formatMoney(selected.sales, currencySymbol)}</span></p>
          <p className="flex justify-between"><span className="text-slate-400">Purchases</span><span className="text-slate-700 font-medium">{formatMoney(selected.purchases, currencySymbol)}</span></p>
          <p className="flex justify-between"><span className="text-slate-400">Expenses</span><span className="text-slate-700 font-medium">{formatMoney(selected.expenses, currencySymbol)}</span></p>
          <p className="flex justify-between"><span className="text-slate-400">Profit</span><span className={selected.profit >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{formatMoney(selected.profit, currencySymbol)}</span></p>
          <p className="flex justify-between"><span className="text-slate-400">Events</span><span className="text-slate-700 font-medium">{selected.events}</span></p>
        </div>
      )}
    </div>
  );
}
