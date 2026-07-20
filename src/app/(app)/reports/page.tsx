"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PremiumLock } from "@/components/billing/premium-lock";
import { formatCurrency } from "@/lib/utils";
import { Download } from "lucide-react";
import { startOfDay, startOfWeek, startOfMonth, startOfYear } from "date-fns";

export default function ReportsPage() {
  const db = useDb();
  const isPremium = useAuthStore((s) => s.isPremium);
  const { currencySymbol } = useUIStore();
  const orders = useLiveQuery(() => (db ? db.orders.toArray() : []), [db]) ?? [];
  const expenses = useLiveQuery(() => (db ? db.expenses.toArray() : []), [db]) ?? [];
  const creditSales = useLiveQuery(() => (db ? db.creditSales.toArray() : []), [db]) ?? [];

  const completed = orders.filter((o) => o.status === "COMPLETED" || o.status === "PARTIALLY_REFUNDED");
  const refunded = orders.filter((o) => o.status === "REFUNDED");

  const sumSince = (date: Date) => completed.filter((o) => new Date(o.createdAt) >= date).reduce((s, o) => s + o.total, 0);

  const periods = [
    { label: "Daily Sales", value: sumSince(startOfDay(new Date())) },
    { label: "Weekly Sales", value: sumSince(startOfWeek(new Date())) },
    { label: "Monthly Sales", value: sumSince(startOfMonth(new Date())) },
    { label: "Yearly Sales", value: sumSince(startOfYear(new Date())) },
  ];

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalRefunds = refunded.reduce((s, o) => s + o.total, 0);
  const totalCredit = creditSales.reduce((s, c) => s + c.remainingBalance, 0);

  const exportCsv = (filename: string, rows: Record<string, unknown>[]) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Reports</h1>
        <Button variant="outline" onClick={() => exportCsv("orders.csv", orders as unknown as Record<string, unknown>[])}>
          <Download className="h-4 w-4" /> Export Orders CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {periods.map((p) => (
          <Card key={p.label}>
            <CardContent className="p-5">
              <p className="text-xs text-slate-400">{p.label}</p>
              <p className="text-xl font-semibold text-slate-800 mt-1">{formatCurrency(p.value, currencySymbol)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Expense Report</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-800">{formatCurrency(totalExpenses, currencySymbol)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Refund Report</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-800">{formatCurrency(totalRefunds, currencySymbol)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Credit Report</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-800">{formatCurrency(totalCredit, currencySymbol)}</CardContent>
        </Card>
      </div>

      <Card className={!isPremium ? "opacity-60" : ""}>
        <CardHeader>
          <CardTitle>
            <PremiumLock label="Advanced Reports">Advanced Reports &amp; Profit Analytics</PremiumLock>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">
          Profit margins by product, cost trend analysis, customer lifetime value, and PDF/Excel export are available on
          the Premium plan.
        </CardContent>
      </Card>
    </div>
  );
}
