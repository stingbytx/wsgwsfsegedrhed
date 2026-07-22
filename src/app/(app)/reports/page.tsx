"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { useUIStore } from "@/stores/ui-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Download, FileSpreadsheet, FileText, TrendingUp, ShoppingCart, RefreshCw, CreditCard } from "lucide-react";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay } from "date-fns";
import { toast } from "sonner";

type FilterMode = "all" | "daily" | "weekly" | "monthly" | "yearly" | "custom";

const FILTER_LABELS: Record<FilterMode, string> = {
  all: "All Time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom Range",
};

export default function ReportsPage() {
  const db = useDb();
  const { currencySymbol } = useUIStore();
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const orders = useLiveQuery(() => (db ? db.orders.toArray() : []), [db]) ?? [];
  const expenses = useLiveQuery(() => (db ? db.expenses.toArray() : []), [db]) ?? [];
  const creditSales = useLiveQuery(() => (db ? db.creditSales.toArray() : []), [db]) ?? [];
  const customers = useLiveQuery(() => (db ? db.customers.toArray() : []), [db]) ?? [];

  const completed = orders.filter((o) => o.status === "COMPLETED" || o.status === "PARTIALLY_REFUNDED");
  const refunded = orders.filter((o) => o.status === "REFUNDED");

  // Derive filtered orders based on selected period
  const getFilteredOrders = () => {
    switch (filterMode) {
      case "daily":
        return completed.filter((o) => new Date(o.createdAt) >= startOfDay(new Date()));
      case "weekly":
        return completed.filter((o) => new Date(o.createdAt) >= startOfWeek(new Date()));
      case "monthly":
        return completed.filter((o) => new Date(o.createdAt) >= startOfMonth(new Date()));
      case "yearly":
        return completed.filter((o) => new Date(o.createdAt) >= startOfYear(new Date()));
      case "custom": {
        if (!dateFrom || !dateTo) return completed;
        const from = new Date(dateFrom);
        const to = endOfDay(new Date(dateTo));
        return completed.filter((o) => {
          const d = new Date(o.createdAt);
          return d >= from && d <= to;
        });
      }
      default:
        return completed;
    }
  };

  const filteredOrders = getFilteredOrders();
  const filteredTotal = filteredOrders.reduce((s, o) => s + o.total, 0);
  const filteredCount = filteredOrders.length;

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalRefunds = refunded.reduce((s, o) => s + o.total, 0);
  const totalCredit = creditSales.reduce((s, c) => s + c.remainingBalance, 0);

  const getCustomerName = (customerId?: string | null) => {
    if (!customerId) return "—";
    return customers.find((c) => c.id === customerId)?.name ?? "—";
  };

  const getPeriodLabel = () => {
    switch (filterMode) {
      case "daily":
        return `Daily — ${new Date().toLocaleDateString()}`;
      case "weekly":
        return "This Week";
      case "monthly":
        return `This Month — ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}`;
      case "yearly":
        return `This Year — ${new Date().getFullYear()}`;
      case "custom":
        return dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : "Custom Range";
      default:
        return "All Time";
    }
  };

  // ─── Export: CSV ──────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error("No data to export");
      return;
    }
    const rows = filteredOrders.map((o) => ({
      "Order Number": o.orderNumber,
      Date: new Date(o.createdAt).toLocaleString(),
      Customer: getCustomerName(o.customerId),
      Items: o.items.length,
      Subtotal: o.subtotal,
      Tax: o.taxTotal,
      Total: o.total,
      "Payment Method": o.payments.map((p) => p.method).join(", "),
      Status: o.status,
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unipos-report-${filterMode}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  // ─── Export: Excel (SpreadsheetML .xls) ──────────────────────────────────
  const exportExcel = () => {
    if (filteredOrders.length === 0) {
      toast.error("No data to export");
      return;
    }
    const esc = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const strCell = (v: string) => `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
    const numCell = (v: number) => `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;

    const headers = ["Order Number", "Date", "Customer", "Items", "Subtotal", "Tax", "Total", "Payment Method", "Status"];
    const headerRow = `<Row>${headers.map(strCell).join("")}</Row>`;
    const dataRows = filteredOrders
      .map(
        (o) =>
          `<Row>
            ${strCell(o.orderNumber)}
            ${strCell(new Date(o.createdAt).toLocaleString())}
            ${strCell(getCustomerName(o.customerId))}
            ${numCell(o.items.length)}
            ${numCell(o.subtotal)}
            ${numCell(o.taxTotal)}
            ${numCell(o.total)}
            ${strCell(o.payments.map((p) => p.method).join(", "))}
            ${strCell(o.status)}
          </Row>`
      )
      .join("");

    const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Sales Report">
    <Table>
      ${headerRow}
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unipos-report-${filterMode}-${new Date().toISOString().split("T")[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel file exported");
  };

  // ─── Export: PDF (print new window) ──────────────────────────────────────
  const exportPDF = () => {
    if (filteredOrders.length === 0) {
      toast.error("No data to export");
      return;
    }
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Allow pop-ups to export PDF");
      return;
    }
    const rows = filteredOrders
      .map(
        (o) => `<tr>
          <td>${o.orderNumber}</td>
          <td>${new Date(o.createdAt).toLocaleString()}</td>
          <td>${getCustomerName(o.customerId)}</td>
          <td style="text-align:center">${o.items.length}</td>
          <td style="text-align:right">${currencySymbol}${o.total.toFixed(2)}</td>
          <td>${o.payments.map((p) => p.method).join(", ")}</td>
          <td>${o.status}</td>
        </tr>`
      )
      .join("");

    w.document.write(`<!DOCTYPE html><html><head><title>UniPOS Report</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#1e293b;font-size:13px}
        h1{font-size:22px;margin-bottom:4px;color:#0070E0}
        .meta{color:#64748b;font-size:12px;margin-bottom:20px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#f1f5f9;padding:8px 10px;border:1px solid #e2e8f0;text-align:left;font-weight:600;color:#475569}
        td{padding:7px 10px;border:1px solid #e2e8f0}
        tr:nth-child(even){background:#f8fafc}
        tfoot td{font-weight:700;background:#f1f5f9;color:#1e293b}
        @media print{@page{margin:12mm}}
      </style>
    </head><body>
      <h1>UniPOS Sales Report</h1>
      <div class="meta">
        Period: <strong>${getPeriodLabel()}</strong> &nbsp;|&nbsp;
        Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp;
        Orders: <strong>${filteredCount}</strong> &nbsp;|&nbsp;
        Revenue: <strong>${currencySymbol}${filteredTotal.toFixed(2)}</strong>
      </div>
      <table>
        <thead><tr>
          <th>Order #</th><th>Date &amp; Time</th><th>Customer</th>
          <th style="text-align:center">Items</th>
          <th style="text-align:right">Total</th>
          <th>Payment</th><th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="4">TOTAL (${filteredCount} orders)</td>
          <td style="text-align:right">${currencySymbol}${filteredTotal.toFixed(2)}</td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
    toast.success("Opening print dialog…");
  };

  // ─── Expenses Excel export ────────────────────────────────────────────────
  const exportExpensesExcel = () => {
    if (expenses.length === 0) { toast.error("No expenses to export"); return; }
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const strCell = (v: string) => `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
    const numCell = (v: number) => `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
    const headers = ["Category", "Description", "Amount", "Date"];
    const headerRow = `<Row>${headers.map(strCell).join("")}</Row>`;
    const dataRows = expenses.map((e) => `<Row>${strCell(e.category)}${strCell(e.description ?? "")}${numCell(e.amount)}${strCell(e.date)}</Row>`).join("");
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Expenses"><Table>${headerRow}${dataRows}</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `unipos-expenses-${new Date().toISOString().split("T")[0]}.xls`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Expenses Excel exported");
  };

  const exportExpensesPDF = () => {
    if (expenses.length === 0) { toast.error("No expenses to export"); return; }
    const w = window.open("", "_blank");
    if (!w) { toast.error("Allow pop-ups to export PDF"); return; }
    const rows = expenses.map((e) => `<tr><td>${e.category}</td><td>${e.description ?? "—"}</td><td style="text-align:right">${currencySymbol}${e.amount.toFixed(2)}</td><td>${e.date}</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>UniPOS Expenses</title><style>body{font-family:Arial;padding:24px;font-size:13px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;padding:8px;border:1px solid #e2e8f0;text-align:left}td{padding:7px 10px;border:1px solid #e2e8f0}</style></head><body><h1>UniPOS Expense Report</h1><p>Generated: ${new Date().toLocaleString()} | Total: ${currencySymbol}${totalExpenses.toFixed(2)}</p><table><thead><tr><th>Category</th><th>Description</th><th>Amount</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 300);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">Reports</h1>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-2">
            {(["all", "daily", "weekly", "monthly", "yearly", "custom"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  filterMode === mode
                    ? "bg-[#0070E0] text-white border-[#0070E0]"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {FILTER_LABELS[mode]}
              </button>
            ))}
          </div>

          {/* Custom date range pickers */}
          {filterMode === "custom" && (
            <div className="flex flex-wrap items-end gap-4 mt-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0070E0]/30"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0070E0]/30"
                />
              </div>
              {dateFrom && dateTo && (
                <p className="text-xs text-slate-400 self-end pb-2">
                  Showing results from <strong>{dateFrom}</strong> to <strong>{dateTo}</strong>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-[#0070E0]" />
              <p className="text-xs text-slate-400">Orders</p>
            </div>
            <p className="text-xl font-semibold text-slate-800">{filteredCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{getPeriodLabel()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <p className="text-xs text-slate-400">Revenue</p>
            </div>
            <p className="text-xl font-semibold text-slate-800">{formatCurrency(filteredTotal, currencySymbol)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{getPeriodLabel()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="h-4 w-4 text-orange-500" />
              <p className="text-xs text-slate-400">Refunds</p>
            </div>
            <p className="text-xl font-semibold text-slate-800">{formatCurrency(totalRefunds, currencySymbol)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-slate-400">Outstanding Credit</p>
            </div>
            <p className="text-xl font-semibold text-slate-800">{formatCurrency(totalCredit, currencySymbol)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Orders Table ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>
              Sales — {getPeriodLabel()}
              <span className="ml-2 text-sm font-normal text-slate-400">({filteredCount} orders)</span>
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportExcel}>
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders found for this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs">Order #</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs">Date &amp; Time</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs">Customer</th>
                    <th className="text-center py-2.5 px-3 text-slate-400 font-medium text-xs">Items</th>
                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium text-xs">Total</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs">Payment</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{o.orderNumber}</td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">{getCustomerName(o.customerId)}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{o.items.length}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#0070E0]">
                        {formatCurrency(o.total, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">
                        {o.payments.map((p) => p.method).join(", ")}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            o.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700"
                              : o.status === "PARTIALLY_REFUNDED"
                              ? "bg-orange-50 text-orange-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {o.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-semibold border-t border-slate-200">
                    <td colSpan={4} className="py-2.5 px-3 text-slate-700">
                      Total ({filteredCount} orders)
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#0070E0]">
                      {formatCurrency(filteredTotal, currencySymbol)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Expenses ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Expenses</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportExpensesExcel}>
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportExpensesPDF}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-slate-800 mb-4">
            {formatCurrency(totalExpenses, currencySymbol)}
          </p>
          {expenses.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs">Category</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs">Description</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">Amount</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 px-3">{e.category}</td>
                      <td className="py-2 px-3 text-slate-500 text-xs">{e.description ?? "—"}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(e.amount, currencySymbol)}</td>
                      <td className="py-2 px-3 text-xs text-slate-400">{e.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Refunds & Credit summary ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Refund Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-800 mb-2">
              {formatCurrency(totalRefunds, currencySymbol)}
            </p>
            <p className="text-xs text-slate-400">{refunded.length} refunded orders (all time)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Credit Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-800 mb-2">
              {formatCurrency(totalCredit, currencySymbol)}
            </p>
            <p className="text-xs text-slate-400">{creditSales.length} credit sales — outstanding balance</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
