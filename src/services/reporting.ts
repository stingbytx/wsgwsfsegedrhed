// ============================================================================
// Report Engine — one reporting service. Every report (sales, expenses,
// inventory, profit, tax, employee performance) is built here so report
// logic is never duplicated across pages.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { Order } from "@/types";
import { computeFinanceSummary, expensesByCategory, type DateRange, inRange } from "./finance";
import { getStockStatuses, getMovements } from "./inventory";

export type ReportKind =
  | "sales" | "expenses" | "inventory" | "profit" | "tax"
  | "credit" | "refunds" | "employees" | "stockMovements";

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  type?: "text" | "number" | "currency" | "date";
}

export interface ReportDataset {
  kind: ReportKind;
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary: Record<string, { label: string; value: number; currency?: boolean }>;
}

export async function buildReport(db: PosDatabase, kind: ReportKind, range?: DateRange): Promise<ReportDataset> {
  switch (kind) {
    case "sales": return salesReport(db, range);
    case "expenses": return expensesReport(db, range);
    case "inventory": return inventoryReport(db);
    case "profit": return profitReport(db, range);
    case "tax": return taxReport(db, range);
    case "credit": return creditReport(db);
    case "refunds": return refundsReport(db, range);
    case "stockMovements": return stockMovementsReport(db, range);
    case "employees": return employeesReport(db, range);
  }
}

async function salesReport(db: PosDatabase, range?: DateRange): Promise<ReportDataset> {
  const [orders, customers] = await Promise.all([db.orders.toArray(), db.customers.toArray()]);
  const customerName = (id?: string | null) => (id ? customers.find((c) => c.id === id)?.name ?? "—" : "—");
  const rows = orders
    .filter((o) => (o.status === "COMPLETED" || o.status === "PARTIALLY_REFUNDED") && inRange(o.createdAt, range))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o) => ({
      orderNumber: o.orderNumber,
      date: o.createdAt,
      customer: customerName(o.customerId),
      items: o.items.length,
      subtotal: o.subtotal,
      tax: o.taxTotal,
      total: o.total,
      payment: o.payments.map((p) => p.method).join(", "),
      status: o.status,
    }));
  const finance = await computeFinanceSummary(db, range);
  return {
    kind: "sales",
    title: "Sales Report",
    columns: [
      { key: "orderNumber", label: "Order #" },
      { key: "date", label: "Date", type: "date" },
      { key: "customer", label: "Customer" },
      { key: "items", label: "Items", align: "center", type: "number" },
      { key: "subtotal", label: "Subtotal", align: "right", type: "currency" },
      { key: "tax", label: "Tax", align: "right", type: "currency" },
      { key: "total", label: "Total", align: "right", type: "currency" },
      { key: "payment", label: "Payment" },
      { key: "status", label: "Status" },
    ],
    rows,
    summary: {
      orderCount: { label: "Orders", value: finance.orderCount },
      revenue: { label: "Revenue", value: finance.revenue, currency: true },
      avg: { label: "Avg Order", value: finance.avgOrderValue, currency: true },
    },
  };
}

async function expensesReport(db: PosDatabase, range?: DateRange): Promise<ReportDataset> {
  const expenses = await db.expenses.toArray();
  const rows = expenses
    .filter((e) => inRange(e.date, range))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => ({ category: e.category, description: e.description ?? "—", amount: e.amount, date: e.date }));
  const byCat = await expensesByCategory(db, range);
  const total = byCat.reduce((s, c) => s + c.total, 0);
  return {
    kind: "expenses",
    title: "Expense Report",
    columns: [
      { key: "category", label: "Category" },
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount", align: "right", type: "currency" },
      { key: "date", label: "Date", type: "date" },
    ],
    rows,
    summary: { total: { label: "Total Expenses", value: total, currency: true }, count: { label: "Entries", value: rows.length } },
  };
}

async function inventoryReport(db: PosDatabase): Promise<ReportDataset> {
  const statuses = await getStockStatuses(db);
  const rows = statuses.map((s) => ({
    name: s.name, sku: s.sku, stock: s.stock,
    lowStockThreshold: s.lowStockThreshold,
    status: s.outOfStock ? "Out of stock" : s.isLow ? "Low" : "OK",
    inventoryValue: s.inventoryValue,
    retailValue: s.retailValue,
  }));
  const totalCost = rows.reduce((s, r) => s + (r.inventoryValue as number), 0);
  const totalRetail = rows.reduce((s, r) => s + (r.retailValue as number), 0);
  return {
    kind: "inventory",
    title: "Inventory Valuation Report",
    columns: [
      { key: "name", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "stock", label: "Stock", align: "right", type: "number" },
      { key: "status", label: "Status" },
      { key: "inventoryValue", label: "Cost Value", align: "right", type: "currency" },
      { key: "retailValue", label: "Retail Value", align: "right", type: "currency" },
    ],
    rows,
    summary: {
      totalCost: { label: "Total Cost Value", value: totalCost, currency: true },
      totalRetail: { label: "Total Retail Value", value: totalRetail, currency: true },
      units: { label: "Units", value: rows.reduce((s, r) => s + (r.stock as number), 0) },
    },
  };
}

async function profitReport(db: PosDatabase, range?: DateRange): Promise<ReportDataset> {
  const f = await computeFinanceSummary(db, range);
  return {
    kind: "profit",
    title: "Profit & Loss Report",
    columns: [
      { key: "metric", label: "Metric" },
      { key: "value", label: "Amount", align: "right", type: "currency" },
    ],
    rows: [
      { metric: "Revenue", value: f.revenue },
      { metric: "Cost of Goods Sold", value: f.costOfGoods },
      { metric: "Gross Profit", value: f.grossProfit },
      { metric: "Operating Expenses", value: f.expenses },
      { metric: "Net Profit", value: f.netProfit },
      { metric: "Refunds", value: f.refunds },
      { metric: "Gross Margin %", value: f.grossMarginPct },
      { metric: "Net Margin %", value: f.netMarginPct },
    ],
    summary: {
      net: { label: "Net Profit", value: f.netProfit, currency: true },
      margin: { label: "Net Margin", value: f.netMarginPct },
    },
  };
}

async function taxReport(db: PosDatabase, range?: DateRange): Promise<ReportDataset> {
  const orders = await db.orders.toArray();
  const rows = orders
    .filter((o) => (o.status === "COMPLETED" || o.status === "PARTIALLY_REFUNDED") && inRange(o.createdAt, range))
    .map((o) => ({
      orderNumber: o.orderNumber,
      date: o.createdAt,
      subtotal: o.subtotal,
      tax: o.taxTotal,
      total: o.total,
    }));
  const totalTax = rows.reduce((s, r) => s + (r.tax as number), 0);
  const totalSub = rows.reduce((s, r) => s + (r.subtotal as number), 0);
  return {
    kind: "tax",
    title: "Tax Collected Report",
    columns: [
      { key: "orderNumber", label: "Order #" },
      { key: "date", label: "Date", type: "date" },
      { key: "subtotal", label: "Subtotal", align: "right", type: "currency" },
      { key: "tax", label: "Tax", align: "right", type: "currency" },
      { key: "total", label: "Total", align: "right", type: "currency" },
    ],
    rows,
    summary: {
      sub: { label: "Total Subtotal", value: totalSub, currency: true },
      tax: { label: "Total Tax", value: totalTax, currency: true },
    },
  };
}

async function creditReport(db: PosDatabase): Promise<ReportDataset> {
  const [creditSales, customers] = await Promise.all([db.creditSales.toArray(), db.customers.toArray()]);
  const name = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";
  const rows = creditSales
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => ({
      customer: name(c.customerId),
      totalAmount: c.totalAmount,
      amountPaid: c.amountPaid,
      remaining: c.remainingBalance,
      status: c.status,
      dueDate: c.dueDate ?? "—",
    }));
  const total = rows.reduce((s, r) => s + (r.remaining as number), 0);
  return {
    kind: "credit",
    title: "Outstanding Credit Report",
    columns: [
      { key: "customer", label: "Customer" },
      { key: "totalAmount", label: "Total", align: "right", type: "currency" },
      { key: "amountPaid", label: "Paid", align: "right", type: "currency" },
      { key: "remaining", label: "Remaining", align: "right", type: "currency" },
      { key: "status", label: "Status" },
      { key: "dueDate", label: "Due Date" },
    ],
    rows,
    summary: { outstanding: { label: "Outstanding", value: total, currency: true }, count: { label: "Credit Sales", value: rows.length } },
  };
}

async function refundsReport(db: PosDatabase, range?: DateRange): Promise<ReportDataset> {
  const orders = await db.orders.toArray();
  const rows = orders
    .filter((o) => o.status === "REFUNDED" && inRange(o.createdAt, range))
    .map((o) => ({ orderNumber: o.orderNumber, date: o.createdAt, total: o.total, items: o.items.length }));
  const total = rows.reduce((s, r) => s + (r.total as number), 0);
  return {
    kind: "refunds",
    title: "Refunds Report",
    columns: [
      { key: "orderNumber", label: "Order #" },
      { key: "date", label: "Date", type: "date" },
      { key: "items", label: "Items", align: "center", type: "number" },
      { key: "total", label: "Refund Total", align: "right", type: "currency" },
    ],
    rows,
    summary: { total: { label: "Total Refunded", value: total, currency: true }, count: { label: "Orders", value: rows.length } },
  };
}

async function stockMovementsReport(db: PosDatabase, range?: DateRange): Promise<ReportDataset> {
  const [movements, products] = await Promise.all([db.inventoryMovements.toArray(), db.products.toArray()]);
  const name = (id: string) => products.find((p) => p.id === id)?.name ?? "—";
  const rows = movements
    .filter((m) => inRange(m.createdAt, range))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((m) => ({ product: name(m.productId), type: m.type, qty: m.quantity, reason: m.reason ?? "—", date: m.createdAt }));
  return {
    kind: "stockMovements",
    title: "Stock Movement Report",
    columns: [
      { key: "product", label: "Product" },
      { key: "type", label: "Type" },
      { key: "qty", label: "Qty", align: "right", type: "number" },
      { key: "reason", label: "Reason" },
      { key: "date", label: "Date", type: "date" },
    ],
    rows,
    summary: { count: { label: "Movements", value: rows.length } },
  };
}

async function employeesReport(db: PosDatabase, range?: DateRange): Promise<ReportDataset> {
  const [orders, employees] = await Promise.all([db.orders.toArray(), db.employees.toArray()]);
  const completed = orders.filter((o) => (o.status === "COMPLETED" || o.status === "PARTIALLY_REFUNDED") && inRange(o.createdAt, range));
  // Map cashierId -> sales (best effort; existing orders may lack cashierId)
  const byEmp = new Map<string, { name: string; orders: number; sales: number }>();
  for (const e of employees) byEmp.set(e.id, { name: e.fullName, orders: 0, sales: 0 });
  for (const o of completed) {
    const key = o.cashierId ?? "unassigned";
    const entry = byEmp.get(key) ?? { name: key === "unassigned" ? "Unassigned" : "Unknown", orders: 0, sales: 0 };
    entry.orders += 1;
    entry.sales += o.total;
    byEmp.set(key, entry);
  }
  const rows = Array.from(byEmp.entries()).map(([id, v]) => ({ employeeId: id, name: v.name, orders: v.orders, sales: v.sales }));
  return {
    kind: "employees",
    title: "Employee Performance Report",
    columns: [
      { key: "name", label: "Employee" },
      { key: "orders", label: "Orders", align: "right", type: "number" },
      { key: "sales", label: "Sales", align: "right", type: "currency" },
    ],
    rows,
    summary: { totalSales: { label: "Total Sales", value: rows.reduce((s, r) => s + (r.sales as number), 0), currency: true } },
  };
}

export async function listReports(): Promise<{ kind: ReportKind; title: string; description: string }[]> {
  return [
    { kind: "sales", title: "Sales Report", description: "All completed sales with totals and payment methods." },
    { kind: "profit", title: "Profit & Loss", description: "Revenue, COGS, gross/net profit, margins." },
    { kind: "expenses", title: "Expense Report", description: "All expenses grouped by category." },
    { kind: "inventory", title: "Inventory Valuation", description: "Stock on hand valued at cost and retail." },
    { kind: "tax", title: "Tax Collected", description: "Tax collected per order for a period." },
    { kind: "credit", title: "Outstanding Credit", description: "Customer credit balances and due dates." },
    { kind: "refunds", title: "Refunds Report", description: "All refunded orders and totals." },
    { kind: "stockMovements", title: "Stock Movements", description: "Every stock movement with reason." },
    { kind: "employees", title: "Employee Performance", description: "Sales attributed to each employee." },
  ];
}
