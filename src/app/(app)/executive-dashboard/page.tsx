"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ExecutiveHeader } from "@/components/dashboard/executive-header";
import { SalesAnalyticsChart } from "@/components/dashboard/sales-analytics-chart";
import { SalesHeatmap } from "@/components/dashboard/sales-heatmap";
import { CalendarWidget } from "@/components/dashboard/calendar-widget";
import { Panel } from "@/components/dashboard/panel";
import { CategorySalesPie, PaymentMethodsPie, ProfitTrendChart, BrandsChart } from "@/components/dashboard/charts";
import { Button } from "@/components/ui/button";
import { LoadingOverlay, Badge, statusTone } from "@/components/ui/primitives";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney, formatDateTime, formatNumber } from "@/lib/format";
import { exportPDFOrPrint, exportCSV, exportExcel } from "@/services/export";
import { toast } from "sonner";
import {
  Lightbulb, Bell, DatabaseBackup, Server, Package, TrendingUp,
  AlertTriangle, RefreshCw, ArrowRight,
} from "lucide-react";

export default function ExecutiveDashboardPage() {
  const data = useDashboardAnalytics();
  const { currencySymbol } = useUIStore();
  const router = useRouter();

  if (!data) return <div className="p-6"><LoadingOverlay label="Crunching your numbers…" /></div>;

  const go = (href: string) => router.push(href);

  // ── Export the dashboard snapshot ─────────────────────────────────────────────
  const snapshotRows = data.kpis.map((k) => ({ KPI: k.title, Value: k.displayValue, Delta: k.deltaPct?.toFixed(1) ?? "—", Subtitle: k.subtitle ?? "" }));
  const doExportPDF = () => {
    exportPDFOrPrint({
      title: "UniPOS Executive Dashboard", subtitle: `Generated ${formatDateTime(new Date())}`,
      columns: [
        { key: "KPI", label: "KPI" },
        { key: "Value", label: "Value", align: "right" },
        { key: "Delta", label: "Δ %", align: "right" },
        { key: "Subtitle", label: "Notes" },
      ],
      rows: snapshotRows, currencySymbol,
    });
    toast.success("Dashboard exported to PDF");
  };
  const doExportCSV = () => { exportCSV(snapshotRows, ["KPI", "Value", "Delta", "Subtitle"], "unipos-dashboard.csv"); toast.success("CSV exported"); };
  const doExportExcel = () => { exportExcel(snapshotRows, ["KPI", "Value", "Delta", "Subtitle"], "unipos-dashboard.xls", "Dashboard"); toast.success("Excel exported"); };

  return (
    <div className="p-6 space-y-6">
      {/* Header + quick actions */}
      <ExecutiveHeader warehouse={data.warehouseSummary[0]?.name ?? "Main"} />

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Executive Business Intelligence</h2>
          <p className="text-xs text-slate-400">Auto-refreshes after every sale, purchase, return, adjustment &amp; expense.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={doExportCSV}>CSV</Button>
          <Button variant="outline" size="sm" onClick={doExportExcel}>Excel</Button>
          <Button variant="outline" size="sm" onClick={doExportPDF}>PDF / Print</Button>
        </div>
      </div>

      {/* KPI grid: 4 per row (desktop) / 2 (tablet) / 1 (mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {data.kpis.map((k) => (
          <KpiCard key={k.id} kpi={k} onClick={k.href ? () => { if (k.href) go(k.href); } : undefined} />
        ))}
      </div>

      {/* Sales analytics + Profit trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesAnalyticsChart />
        <ProfitTrendChart data={data.profitTrend} />
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CategorySalesPie data={data.topCategories} />
        <PaymentMethodsPie data={data.paymentMethods} />
        <CashFlowPanel data={data.cashFlow} currencySymbol={currencySymbol} />
      </div>

      {/* Heatmap + Calendar + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SalesHeatmap cells={data.heatmap} />
        <CalendarWidget days={data.calendar} />
        <InsightsPanel insights={data.insights} />
      </div>

      {/* Top products + Top customers + Top suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Top Selling Products" subtitle="Top 10 by revenue" actions={<ArrowRight className="h-4 w-4 text-slate-300" />}>
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {data.topProducts.length === 0 && <EmptyRow />}
            {data.topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm cursor-pointer hover:bg-slate-50/60" onClick={() => go("/inventory")}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-slate-400 w-5">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400">{p.category} • {p.quantitySold} sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">{formatMoney(p.revenue, currencySymbol)}</p>
                  <p className="text-[11px] text-slate-400">Stock: {p.stock}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Top Customers" subtitle="By purchase count">
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {data.topCustomers.length === 0 && <EmptyRow />}
            {data.topCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between py-2 text-sm cursor-pointer hover:bg-slate-50/60" onClick={() => go("/customers")}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-slate-400 w-5">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-400">{c.purchases} purchases</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">{formatMoney(c.credit, currencySymbol)}</p>
                  <p className="text-[11px] text-slate-400">credit</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Top Suppliers" subtitle="By purchase value">
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {data.topSuppliers.length === 0 && <EmptyRow />}
            {data.topSuppliers.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between py-2 text-sm cursor-pointer hover:bg-slate-50/60" onClick={() => go("/suppliers")}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-slate-400 w-5">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400">{s.lastPurchase ? formatDateTime(s.lastPurchase) : "—"}</p>
                  </div>
                </div>
                <p className="font-semibold text-slate-800">{formatMoney(s.purchaseValue, currencySymbol)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Recent activity tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentPanel title="Recent Sales" rows={data.recentSales.map((r) => ({ id: r.id, cols: [r.orderNumber, r.customer, r.payment, formatMoney(r.amount, currencySymbol), r.status], headers: ["Invoice", "Customer", "Payment", "Amount", "Status"] }))} onRow={() => go("/reports")} />
        <RecentPanel title="Recent Purchases" rows={data.recentPurchases.map((r) => ({ id: r.id, cols: [r.poNumber, r.supplier, r.warehouse, formatMoney(r.amount, currencySymbol), r.status], headers: ["PO #", "Supplier", "Warehouse", "Amount", "Status"] }))} onRow={() => go("/purchases")} />
        <RecentPanel title="Recent Expenses" rows={data.recentExpenses.map((r) => ({ id: r.id, cols: [r.type, r.description, formatMoney(r.amount, currencySymbol), r.date], headers: ["Type", "Description", "Amount", "Date"] }))} onRow={() => go("/expenses")} />
        <RecentPanel title="Recent Stock Movements" rows={data.recentStockMovements.map((r) => ({ id: r.id, cols: [r.reference, r.product, String(r.quantity), r.type, formatDateTime(r.date)], headers: ["Reference", "Product", "Qty", "Type", "Date"] }))} onRow={() => go("/inventory")} />
      </div>

      {/* Low stock + Expiry alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Low Stock Alert" subtitle={`${data.lowStock.length} products below minimum`} actions={<Button size="sm" variant="outline" onClick={() => go("/inventory?filter=low")}>Open</Button>}>
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {data.lowStock.length === 0 && <EmptyRow text="All stock levels are healthy" />}
            {data.lowStock.slice(0, 12).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <div className="min-w-0"><p className="font-medium text-slate-800 truncate">{p.name}</p><p className="text-[11px] text-slate-400">{p.barcode ?? "—"}</p></div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-amber-600">{p.stock} <span className="text-slate-400 text-xs">/ {p.minStock}</span></p>
                  <button className="text-[11px] text-[#0070E0] hover:underline" onClick={() => go("/purchases")}>Reorder</button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Expiry Alert" subtitle="Products nearing expiry (≤ 30 days)">
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {data.expiringSoon.length === 0 && <EmptyRow text="No products expiring soon" />}
            {data.expiringSoon.slice(0, 12).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full ${p.tone === "danger" ? "bg-red-500" : p.tone === "warning" ? "bg-amber-500" : "bg-yellow-400"}`} />
                  <div className="min-w-0"><p className="font-medium text-slate-800 truncate">{p.name}</p><p className="text-[11px] text-slate-400">{p.batch ?? "—"} • {p.warehouse}</p></div>
                </div>
                <Badge tone={p.tone}>{p.daysRemaining}d</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Brands + Employee performance + Warehouse summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BrandsChart data={data.topBrands} />
        <Panel title="Employee Performance" subtitle="Sales attributed to cashiers">
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {data.employeePerformance.length === 0 && <EmptyRow />}
            {data.employeePerformance.map((e) => (
              <div key={e.id} className="py-2 text-sm">
                <div className="flex justify-between"><span className="font-medium text-slate-800">{e.name}</span><span className="font-semibold text-slate-800">{formatMoney(e.sales, currencySymbol)}</span></div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                  <span>{e.invoices} invoices • avg {formatMoney(e.avgBill, currencySymbol)}</span>
                  <span>{e.refunds} refunds</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Warehouse Summary" subtitle="Stock value & alerts by warehouse">
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {data.warehouseSummary.map((w) => (
              <div key={w.id} className="py-2 text-sm">
                <div className="flex justify-between"><span className="font-medium text-slate-800">{w.name}</span><span className="font-semibold text-slate-800">{formatMoney(w.stockValue, currencySymbol)}</span></div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                  <span>{formatNumber(w.products)} products</span>
                  <span className="text-amber-600">{w.lowStock} low</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Inventory value + Cash flow detail + Expense breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Inventory Value" subtitle="Current stock × cost price">
          <p className="text-3xl font-semibold text-slate-800">{formatMoney(data.inventoryValue, currencySymbol)}</p>
          <p className="text-xs text-slate-400 mt-1">Across {formatNumber(data.systemStatus.products)} products</p>
        </Panel>
        <Panel title="Cash Flow Summary">
          <div className="space-y-1.5 text-sm">
            <FlowRow label="Cash Sales" value={data.cashFlow.cashSales} sym={currencySymbol} />
            <FlowRow label="Credit Sales" value={data.cashFlow.creditSales} sym={currencySymbol} />
            <FlowRow label="Expenses" value={-data.cashFlow.expenses} sym={currencySymbol} />
            <FlowRow label="Purchases" value={-data.cashFlow.purchases} sym={currencySymbol} />
            <div className="border-t border-slate-100 pt-1.5 flex justify-between font-semibold">
              <span>Net Cash</span><span className={data.cashFlow.netCash >= 0 ? "text-emerald-600" : "text-red-600"}>{formatMoney(data.cashFlow.netCash, currencySymbol)}</span>
            </div>
          </div>
        </Panel>
        <Panel title="Today's Expense Breakdown">
          <div className="space-y-1.5 text-sm">
            {data.expenseBreakdown.length === 0 && <EmptyRow text="No expenses today" />}
            {data.expenseBreakdown.slice(0, 6).map((e) => (
              <div key={e.category} className="flex justify-between"><span className="text-slate-600">{e.category}</span><span className="font-medium text-slate-800">{formatMoney(e.amount, currencySymbol)}</span></div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Notifications + Backup + System status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Notifications" subtitle="Unread alerts">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.notifications.length === 0 && <EmptyRow text="No pending alerts" />}
            {data.notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-2 text-sm">
                <Bell className={`h-4 w-4 mt-0.5 shrink-0 ${n.tone === "danger" ? "text-red-500" : n.tone === "warning" ? "text-amber-500" : "text-[#0070E0]"}`} />
                <div><p className="font-medium text-slate-700">{n.type}</p><p className="text-xs text-slate-500">{n.text}</p></div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Backup Status">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Last Backup</span><span className="text-slate-700 font-medium">{data.backupStatus.lastBackupDate ? formatDateTime(data.backupStatus.lastBackupDate) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span><Badge tone={data.backupStatus.status === "OK" ? "success" : "warning"}>{data.backupStatus.status}</Badge></div>
            <div className="flex justify-between"><span className="text-slate-500">Next Recommended</span><span className="text-slate-700 font-medium">{data.backupStatus.nextRecommended}</span></div>
            <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => go("/settings#backup")}><DatabaseBackup className="h-4 w-4" /> Go to Backup</Button>
          </div>
        </Panel>
        <Panel title="System Status">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Storage Used</span><span className="text-slate-700 font-medium">{data.systemStatus.storageUsed}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Products</span><span className="text-slate-700 font-medium">{formatNumber(data.systemStatus.products)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Customers</span><span className="text-slate-700 font-medium">{formatNumber(data.systemStatus.customers)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Invoices</span><span className="text-slate-700 font-medium">{formatNumber(data.systemStatus.invoices)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Suppliers</span><span className="text-slate-700 font-medium">{formatNumber(data.systemStatus.suppliers)}</span></div>
            <div className="flex justify-between pt-1.5 border-t border-slate-100"><span className="text-slate-500 inline-flex items-center gap-1"><Server className="h-3.5 w-3.5" /> Local DB</span><Badge tone="success">Healthy</Badge></div>
          </div>
        </Panel>
      </div>

      <p className="text-center text-[11px] text-slate-400 pt-2">
        Executive BI Dashboard • Generated {formatDateTime(data.generatedAt)} • Auto-refreshes on data changes
      </p>
    </div>
  );
}

// ─── Small inline helpers ─────────────────────────────────────────────────────

function CashFlowPanel({ data, currencySymbol }: { data: import("@/services/dashboard-analytics").CashFlowSummary; currencySymbol: string }) {
  return (
    <Panel title="Cash Flow Summary" subtitle="All-time cash position">
      <div className="space-y-1.5 text-sm">
        <FlowRow label="Cash Sales" value={data.cashSales} sym={currencySymbol} />
        <FlowRow label="Credit Sales" value={data.creditSales} sym={currencySymbol} />
        <FlowRow label="Expenses" value={-data.expenses} sym={currencySymbol} />
        <FlowRow label="Purchases" value={-data.purchases} sym={currencySymbol} />
        <div className="border-t border-slate-100 pt-1.5 flex justify-between font-semibold">
          <span>Net Cash</span><span className={data.netCash >= 0 ? "text-emerald-600" : "text-red-600"}>{formatMoney(data.netCash, currencySymbol)}</span>
        </div>
      </div>
    </Panel>
  );
}

function FlowRow({ label, value, sym }: { label: string; value: number; sym: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={value >= 0 ? "text-slate-700 font-medium" : "text-red-600 font-medium"}>{formatMoney(value, sym)}</span>
    </div>
  );
}

function InsightsPanel({ insights }: { insights: import("@/services/dashboard-analytics").Insight[] }) {
  return (
    <Panel title="Business Insights" subtitle="Auto-generated from your data">
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {insights.length === 0 && <EmptyRow text="Not enough data yet" />}
        {insights.map((i) => (
          <div key={i.id} className="flex items-start gap-2 text-sm">
            <Lightbulb className={`h-4 w-4 mt-0.5 shrink-0 ${i.tone === "danger" ? "text-red-500" : i.tone === "warning" ? "text-amber-500" : i.tone === "success" ? "text-emerald-500" : "text-[#0070E0]"}`} />
            <p className="text-slate-600">{i.text}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RecentPanel({ title, rows, onRow }: {
  title: string;
  rows: { id: string; cols: string[]; headers: string[] }[];
  onRow?: () => void;
}) {
  return (
    <Panel title={title}>
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50/60 sticky top-0">
            <tr>{rows[0]?.headers.map((h, i) => <th key={i} className="p-2 text-left text-slate-400 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td className="p-4 text-center text-slate-300">No records</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} onClick={onRow} className={`border-t border-slate-50 ${onRow ? "cursor-pointer hover:bg-slate-50/60" : ""}`}>
                {r.cols.map((c, i) => {
                  const isStatus = r.headers[i]?.toLowerCase() === "status";
                  return <td key={i} className="p-2 text-slate-600">{isStatus ? <Badge tone={statusTone(c)}>{c.replace(/_/g, " ")}</Badge> : c}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function EmptyRow({ text = "No records yet" }: { text?: string }) {
  return <div className="py-6 text-center text-sm text-slate-300">{text}</div>;
}
