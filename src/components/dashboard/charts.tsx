"use client";
import * as React from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar,
} from "recharts";
import { Panel } from "./panel";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney } from "@/lib/format";
import type { CategorySlice, PaymentSlice } from "@/services/dashboard-analytics";

const PIE_COLORS = ["#0070E0", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

export function CategorySalesPie({ data }: { data: CategorySlice[] }) {
  const { currencySymbol } = useUIStore();
  if (!data.length) return <Panel title="Category Sales"><EmptyChart /></Panel>;
  return (
    <Panel title="Category Sales" subtitle="Top categories by revenue">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(Number(v), currencySymbol)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function PaymentMethodsPie({ data }: { data: PaymentSlice[] }) {
  const { currencySymbol } = useUIStore();
  if (!data.length) return <Panel title="Payment Methods"><EmptyChart /></Panel>;
  return (
    <Panel title="Payment Methods" subtitle="Share by amount">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey="method" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(Number(v), currencySymbol)} />
            <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => { const item = data.find((d) => d.method === value); return `${value} (${item ? item.pct.toFixed(0) : 0}%)`; }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function ProfitTrendChart({ data }: { data: { label: string; revenue: number; expenses: number; profit: number; netProfit: number }[] }) {
  const { currencySymbol } = useUIStore();
  return (
    <Panel title="Profit Trend" subtitle="Last 6 months — revenue, expenses, profit, net profit">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => formatMoney(Number(v), currencySymbol)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="revenue" stroke="#0070E0" strokeWidth={2} />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
            <Line type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2} />
            <Line type="monotone" dataKey="netProfit" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function BrandsChart({ data }: { data: { name: string; revenue: number }[] }) {
  const { currencySymbol } = useUIStore();
  if (!data.length || (data.length === 1 && data[0].name === "Uncategorized")) {
    return <Panel title="Best Selling Brands" subtitle="Add a `brand` field to products to enable"><EmptyChart /></Panel>;
  }
  return (
    <Panel title="Best Selling Brands" subtitle="Top 10 by revenue">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
            <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip formatter={(v) => formatMoney(Number(v), currencySymbol)} />
            <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function EmptyChart() {
  return <div className="h-48 flex items-center justify-center text-sm text-slate-300">No data yet</div>;
}
