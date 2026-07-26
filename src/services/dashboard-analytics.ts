// ============================================================================
// Dashboard Analytics Engine — the single canonical computation behind every
// Executive BI Dashboard widget. One engine, one pass over the data, cached.
//
// Auto-refresh: the `useDashboardAnalytics` hook wraps this in dexie's
// `useLiveQuery`, which re-runs whenever any read table changes — so every
// widget refreshes after a sale/purchase/return/adjustment/expense with NO
// page reload.
//
// Performance: results are cached (TTL) keyed by the DB instance. For truly
// huge datasets (100k+ products, 500k+ invoices) the heavy aggregation should
// move to indexed DB queries via the Repository seam; the engine's shape
// stays the same. Tables that can grow large (recent activity, top lists)
// are capped and paginated in the UI.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { Order, Product, Customer, Expense, InventoryMovement } from "@/types";
import type { PurchaseOrder, GRN, Warehouse, Employee } from "@/types/enterprise";
import {
  startOfDay, startOfWeek, startOfMonth, startOfYear,
  endOfDay, endOfWeek, endOfMonth, endOfYear,
  subDays, subWeeks, subMonths, subYears,
  format, isSameDay,
} from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrendGranularity = "hourly" | "daily" | "weekly" | "monthly" | "yearly";
export type ChartType = "line" | "bar" | "area";

export interface KpiCard {
  id: string;
  title: string;
  value: number;
  displayValue: string;
  icon: string; // lucide icon name key
  deltaPct: number | null; // % change vs previous period; null if unknown
  trend: { label: string; value: number }[]; // mini sparkline
  tone: "success" | "warning" | "danger" | "info" | "purple";
  subtitle?: string;
  lastUpdated: string;
  href?: string;
}

export interface SalesSeriesPoint {
  label: string;
  revenue: number;
  profit: number;
  invoices: number;
}

export interface CategorySlice {
  name: string;
  revenue: number;
  quantity: number;
  pct: number;
}

export interface PaymentSlice {
  method: string;
  amount: number;
  pct: number;
}

export interface TopProductRow {
  id: string;
  name: string;
  barcode?: string;
  category: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  stock: number;
}

export interface TopCustomerRow {
  id: string;
  name: string;
  purchases: number;
  credit: number;
  lastVisit?: string;
}

export interface TopSupplierRow {
  id: string;
  name: string;
  purchaseValue: number;
  lastPurchase?: string;
}

export interface RecentSaleRow {
  id: string;
  orderNumber: string;
  customer: string;
  cashier: string;
  payment: string;
  amount: number;
  status: string;
  date: string;
}

export interface Insight {
  id: string;
  tone: "success" | "warning" | "danger" | "info";
  text: string;
}

export interface HeatmapCell {
  hour: number;
  label: string;
  total: number;
  intensity: number; // 0..1
}

export interface CalendarDayData {
  date: string;
  sales: number;
  purchases: number;
  expenses: number;
  profit: number;
  events: number;
}

export interface LowStockRow {
  id: string;
  name: string;
  barcode?: string;
  image?: string | null;
  stock: number;
  minStock: number;
  supplier: string;
}

export interface ExpiryRow {
  id: string;
  name: string;
  batch?: string;
  supplier: string;
  warehouse: string;
  daysRemaining: number;
  tone: "danger" | "warning" | "info";
}

export interface EmployeePerfRow {
  id: string;
  name: string;
  invoices: number;
  sales: number;
  avgBill: number;
  refunds: number;
}

export interface WarehouseSummaryRow {
  id: string;
  name: string;
  products: number;
  stockValue: number;
  lowStock: number;
  transfers: number;
}

export interface CashFlowSummary {
  cashSales: number;
  creditSales: number;
  expenses: number;
  purchases: number;
  netCash: number;
}

export interface DashboardAnalytics {
  generatedAt: string;
  kpis: KpiCard[];
  salesSeries: SalesSeriesPoint[];
  profitTrend: { label: string; revenue: number; expenses: number; profit: number; netProfit: number }[];
  categorySales: CategorySlice[];
  paymentMethods: PaymentSlice[];
  topProducts: TopProductRow[];
  topCustomers: TopCustomerRow[];
  topSuppliers: TopSupplierRow[];
  recentSales: RecentSaleRow[];
  recentPurchases: { id: string; poNumber: string; supplier: string; warehouse: string; amount: number; status: string; date: string }[];
  recentExpenses: { id: string; type: string; description: string; amount: number; enteredBy: string; date: string }[];
  recentStockMovements: { id: string; reference: string; product: string; quantity: number; type: string; warehouse: string; date: string; user: string }[];
  insights: Insight[];
  lowStock: LowStockRow[];
  outOfStock: LowStockRow[];
  expiringSoon: ExpiryRow[];
  cashFlow: CashFlowSummary;
  employeePerformance: EmployeePerfRow[];
  warehouseSummary: WarehouseSummaryRow[];
  inventoryValue: number;
  topBrands: { name: string; revenue: number }[];
  topCategories: CategorySlice[];
  heatmap: HeatmapCell[];
  calendar: CalendarDayData[];
  notifications: { id: string; type: string; text: string; tone: "warning" | "danger" | "info" }[];
  backupStatus: { lastBackupDate?: string; size?: string; status: string; nextRecommended?: string };
  systemStatus: { dbSizeBytes: number; products: number; customers: number; invoices: number; suppliers: number; storageUsed: string };
  expenseBreakdown: { category: string; amount: number }[];
  todayCustomers: { total: number; returning: number; new: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sum = (arr: { amount?: number; total?: number; value?: number }[], key: "amount" | "total" | "value") =>
  arr.reduce((s, x) => s + (Number(x[key] ?? 0)), 0);

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function completedOrders(orders: Order[]) {
  return orders.filter((o) => o.status === "COMPLETED" || o.status === "PARTIALLY_REFUNDED");
}

function orderProfit(o: Order) {
  const cogs = o.items.reduce((s, it) => s + (it.cost ?? 0) * it.quantity, 0);
  return o.total - cogs;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

const cache = new WeakMap<object, { ts: number; data: DashboardAnalytics }>();
const TTL = 15_000;

export async function computeDashboardAnalytics(db: PosDatabase): Promise<DashboardAnalytics> {
  const cached = cache.get(db);
  if (cached && Date.now() - cached.ts < TTL) return cached.data;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = endOfDay(subDays(now, 1));
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const [orders, products, customers, expenses, creditSales, suppliers, categories, purchaseOrders, grns, movements, warehouses, employees, auditLogs, settings] = await Promise.all([
    db.orders.toArray(), db.products.toArray(), db.customers.toArray(), db.expenses.toArray(),
    db.creditSales.toArray(), db.suppliers.toArray(), db.categories.toArray(),
    db.purchaseOrders.toArray(), db.grns.toArray(), db.inventoryMovements.toArray(),
    db.warehouses.toArray(), db.employees.toArray(), db.auditLogs.toArray(), db.settings.toArray(),
  ]);

  const completed = completedOrders(orders);
  const inDate = (d: string, from: Date, to: Date) => { const x = new Date(d); return x >= from && x <= to; };

  const categoryName = (id?: string | null) => (id ? categories.find((c) => c.id === id)?.name ?? "Uncategorized" : "Uncategorized");
  const supplierName = (id?: string | null) => (id ? suppliers.find((s) => s.id === id)?.name ?? "—" : "—");
  const customerName = (id?: string | null) => (id ? customers.find((c) => c.id === id)?.name ?? "Walk-in" : "Walk-in");
  const employeeName = (id?: string | null) => (id ? employees.find((e) => e.id === id)?.fullName ?? id : "—");
  const warehouseName = (id?: string | null) => (id ? warehouses.find((w) => w.id === id)?.name ?? "—" : "Main");

  // ── Time-windowed sales ──────────────────────────────────────────────────────
  const todayOrders = completed.filter((o) => inDate(o.createdAt, todayStart, todayEnd));
  const yesterdayOrders = completed.filter((o) => inDate(o.createdAt, yesterdayStart, yesterdayEnd));
  const weekOrders = completed.filter((o) => inDate(o.createdAt, weekStart, weekEnd));
  const lastWeekOrders = completed.filter((o) => inDate(o.createdAt, lastWeekStart, lastWeekEnd));
  const monthOrders = completed.filter((o) => inDate(o.createdAt, monthStart, monthEnd));
  const lastMonthOrders = completed.filter((o) => inDate(o.createdAt, lastMonthStart, lastMonthEnd));

  const todaySales = sum(todayOrders, "total");
  const yesterdaySales = sum(yesterdayOrders, "total");
  const weekSales = sum(weekOrders, "total");
  const lastWeekSales = sum(lastWeekOrders, "total");
  const monthSales = sum(monthOrders, "total");
  const lastMonthSales = sum(lastMonthOrders, "total");

  // ── Profit & expenses ────────────────────────────────────────────────────────
  const todayProfit = todayOrders.reduce((s, o) => s + orderProfit(o), 0) - expenses.filter((e) => inDate(e.date, todayStart, todayEnd)).reduce((s, e) => s + e.amount, 0);
  const todayExpenses = expenses.filter((e) => inDate(e.date, todayStart, todayEnd));
  const todayExpensesTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);

  // Expense breakdown by category (today)
  const expenseBreakdownMap = new Map<string, number>();
  for (const e of todayExpenses) expenseBreakdownMap.set(e.category, (expenseBreakdownMap.get(e.category) ?? 0) + e.amount);
  const expenseBreakdown = Array.from(expenseBreakdownMap.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);

  const profitMargin = todaySales > 0 ? (todayProfit / todaySales) * 100 : 0;

  // ── KPI mini-trends (last 7 days) ─────────────────────────────────────────────
  const last7Labels: string[] = [];
  const last7Sales: number[] = [];
  const last7Profit: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i);
    const ds = startOfDay(d), de = endOfDay(d);
    const dayOrders = completed.filter((o) => inDate(o.createdAt, ds, de));
    last7Labels.push(format(d, "EEE"));
    last7Sales.push(sum(dayOrders, "total"));
    last7Profit.push(dayOrders.reduce((s, o) => s + orderProfit(o), 0));
  }

  // ── Credit ─────────────────────────────────────────────────────────────────────
  const pendingCredit = creditSales.reduce((s, c) => s + c.remainingBalance, 0);
  const creditCustomers = new Set(creditSales.filter((c) => c.remainingBalance > 0).map((c) => c.customerId)).size;
  const avgCredit = creditCustomers > 0 ? pendingCredit / creditCustomers : 0;

  // ── Stock alerts ───────────────────────────────────────────────────────────────
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 5));
  const outOfStock = products.filter((p) => p.stock <= 0);

  // Expiring soon (≤30 days)
  const expiringSoon: ExpiryRow[] = products
    .filter((p) => p.expirationDate)
    .map((p) => {
      const days = Math.ceil((new Date(p.expirationDate!).getTime() - now.getTime()) / 86400000);
      return { id: p.id, name: p.name, batch: (p as { batchNumber?: string }).batchNumber, supplier: "—", warehouse: "Main", daysRemaining: days };
    })
    .filter((x) => x.daysRemaining <= 30 && x.daysRemaining >= -3)
    .map((x) => ({ ...x, tone: (x.daysRemaining <= 7 ? "danger" : x.daysRemaining <= 15 ? "warning" : "info") as "danger" | "warning" | "info" }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  // ── Today's purchases ──────────────────────────────────────────────────────────
  const todayPOs = purchaseOrders.filter((p) => inDate(p.createdAt, todayStart, todayEnd));
  const todayGRNs = grns.filter((g) => inDate(g.receivedAt, todayStart, todayEnd));
  const todayPurchaseTotal = todayPOs.reduce((s, p) => s + p.total, 0);

  // ── Today's customers ──────────────────────────────────────────────────────────
  const todayCustomerIds = new Set(todayOrders.map((o) => o.customerId).filter(Boolean) as string[]);
  const returning = Array.from(todayCustomerIds).filter((id) => {
    const c = customers.find((x) => x.id === id);
    return c && new Date(c.createdAt) < todayStart;
  }).length;
  const todayCustomers = { total: todayCustomerIds.size, returning, new: todayCustomerIds.size - returning };

  // ── Cash in hand ─────────────────────────────────────────────────────────────────
  const cashSalesToday = todayOrders.reduce((s, o) => s + o.payments.filter((p) => p.method === "CASH").reduce((ps, p) => ps + p.amount, 0), 0);
  const cashInHand = cashSalesToday - todayExpensesTotal;

  // ── KPI cards ───────────────────────────────────────────────────────────────────
  const lastUpdated = now.toISOString();
  const kpis: KpiCard[] = [
    {
      id: "today-sales", title: "Today's Sales", value: todaySales, displayValue: fmtMoney(todaySales),
      icon: "DollarSign", deltaPct: pctChange(todaySales, yesterdaySales),
      trend: last7Labels.map((l, i) => ({ label: l, value: last7Sales[i] })), tone: "info",
      subtitle: `${todayOrders.length} invoices`, lastUpdated, href: "/reports",
    },
    {
      id: "week-sales", title: "This Week Sales", value: weekSales, displayValue: fmtMoney(weekSales),
      icon: "TrendingUp", deltaPct: pctChange(weekSales, lastWeekSales),
      trend: last7Labels.map((l, i) => ({ label: l, value: last7Sales[i] })), tone: "success",
      subtitle: `${weekOrders.length} orders`, lastUpdated,
    },
    {
      id: "month-revenue", title: "Monthly Revenue", value: monthSales, displayValue: fmtMoney(monthSales),
      icon: "BarChart3", deltaPct: pctChange(monthSales, lastMonthSales),
      trend: last7Labels.map((l, i) => ({ label: l, value: last7Sales[i] })), tone: "purple",
      subtitle: `${monthOrders.length} orders`, lastUpdated,
    },
    {
      id: "today-profit", title: "Today's Profit", value: todayProfit, displayValue: fmtMoney(todayProfit),
      icon: "Wallet", deltaPct: null,
      trend: last7Labels.map((l, i) => ({ label: l, value: last7Profit[i] })),
      tone: todayProfit >= 0 ? "success" : "danger",
      subtitle: `${profitMargin.toFixed(1)}% margin`, lastUpdated,
    },
    {
      id: "today-expenses", title: "Today's Expenses", value: todayExpensesTotal, displayValue: fmtMoney(todayExpensesTotal),
      icon: "Receipt", deltaPct: null,
      trend: last7Labels.map((l, i) => ({ label: l, value: last7Profit[i] })), tone: "warning",
      subtitle: `${todayExpenses.length} entries`, lastUpdated, href: "/expenses",
    },
    {
      id: "pending-credit", title: "Pending Customer Credit", value: pendingCredit, displayValue: fmtMoney(pendingCredit),
      icon: "CreditCard", deltaPct: null, trend: [], tone: "warning",
      subtitle: `${creditCustomers} customers • avg ${fmtMoney(avgCredit)}`, lastUpdated, href: "/customers",
    },
    {
      id: "low-stock", title: "Low Stock Alert", value: lowStock.length, displayValue: String(lowStock.length),
      icon: "AlertTriangle", deltaPct: null, trend: [], tone: "warning",
      subtitle: `${lowStock.length} items low`, lastUpdated, href: "/inventory?filter=low",
    },
    {
      id: "out-of-stock", title: "Out of Stock", value: outOfStock.length, displayValue: String(outOfStock.length),
      icon: "PackageX", deltaPct: null, trend: [], tone: "danger",
      subtitle: `${outOfStock.length} critical`, lastUpdated, href: "/inventory?filter=out",
    },
    {
      id: "expiring", title: "Expiring Soon", value: expiringSoon.length, displayValue: String(expiringSoon.length),
      icon: "CalendarClock", deltaPct: null, trend: [], tone: "warning",
      subtitle: "≤ 30 days", lastUpdated, href: "/inventory?filter=expiring",
    },
    {
      id: "today-purchases", title: "Today's Purchases", value: todayPurchaseTotal, displayValue: fmtMoney(todayPurchaseTotal),
      icon: "Truck", deltaPct: null, trend: [], tone: "info",
      subtitle: `${todayPOs.length} POs • ${todayGRNs.length} GRNs`, lastUpdated, href: "/purchases",
    },
    {
      id: "today-customers", title: "Today's Customers", value: todayCustomers.total, displayValue: String(todayCustomers.total),
      icon: "Users", deltaPct: null, trend: [], tone: "success",
      subtitle: `${todayCustomers.new} new • ${todayCustomers.returning} returning`, lastUpdated, href: "/customers",
    },
    {
      id: "cash-in-hand", title: "Cash In Hand", value: cashInHand, displayValue: fmtMoney(cashInHand),
      icon: "Banknote", deltaPct: null, trend: [], tone: cashInHand >= 0 ? "success" : "danger",
      subtitle: `Sales ${fmtMoney(cashSalesToday)} − Exp ${fmtMoney(todayExpensesTotal)}`, lastUpdated,
    },
  ];

  // ── Sales analytics series (default daily, 14 days) ─────────────────────────────
  const salesSeries: SalesSeriesPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = subDays(now, i);
    const ds = startOfDay(d), de = endOfDay(d);
    const dayOrders = completed.filter((o) => inDate(o.createdAt, ds, de));
    salesSeries.push({
      label: format(d, "dd MMM"),
      revenue: sum(dayOrders, "total"),
      profit: dayOrders.reduce((s, o) => s + orderProfit(o), 0),
      invoices: dayOrders.length,
    });
  }

  // ── Profit trend (last 6 months) ────────────────────────────────────────────────
  const profitTrend: DashboardAnalytics["profitTrend"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const ms = startOfMonth(d), me = endOfMonth(d);
    const monthOrd = completed.filter((o) => inDate(o.createdAt, ms, me));
    const monthExp = expenses.filter((e) => inDate(e.date, ms, me)).reduce((s, e) => s + e.amount, 0);
    const revenue = sum(monthOrd, "total");
    const grossProfit = monthOrd.reduce((s, o) => s + orderProfit(o), 0);
    profitTrend.push({
      label: format(d, "MMM"),
      revenue,
      expenses: monthExp,
      profit: grossProfit,
      netProfit: grossProfit - monthExp,
    });
  }

  // ── Category sales ───────────────────────────────────────────────────────────────
  const catMap = new Map<string, { revenue: number; quantity: number }>();
  for (const o of completed) {
    for (const it of o.items) {
      const cat = categoryName(products.find((p) => p.id === it.productId)?.categoryId);
      const e = catMap.get(cat) ?? { revenue: 0, quantity: 0 };
      e.revenue += it.total; e.quantity += it.quantity;
      catMap.set(cat, e);
    }
  }
  const totalCatRevenue = Array.from(catMap.values()).reduce((s, x) => s + x.revenue, 0) || 1;
  const categorySales: CategorySlice[] = Array.from(catMap.entries())
    .map(([name, v]) => ({ name, revenue: v.revenue, quantity: v.quantity, pct: (v.revenue / totalCatRevenue) * 100 }))
    .sort((a, b) => b.revenue - a.revenue);
  const topCategories = categorySales.slice(0, 8);

  // ── Payment methods ──────────────────────────────────────────────────────────────
  const payMap = new Map<string, number>();
  for (const o of completed) for (const p of o.payments) payMap.set(p.method, (payMap.get(p.method) ?? 0) + p.amount);
  const totalPay = Array.from(payMap.values()).reduce((s, x) => s + x, 0) || 1;
  const paymentMethods: PaymentSlice[] = Array.from(payMap.entries())
    .map(([method, amount]) => ({ method, amount, pct: (amount / totalPay) * 100 }))
    .sort((a, b) => b.amount - a.amount);

  // ── Top products ─────────────────────────────────────────────────────────────────
  const prodMap = new Map<string, { name: string; barcode?: string; category: string; quantitySold: number; revenue: number; profit: number; stock: number }>();
  for (const o of completed) {
    for (const it of o.items) {
      const p = products.find((x) => x.id === it.productId);
      const e = prodMap.get(it.productId) ?? { name: it.name, barcode: p?.barcode, category: categoryName(p?.categoryId), quantitySold: 0, revenue: 0, profit: 0, stock: p?.stock ?? 0 };
      e.quantitySold += it.quantity; e.revenue += it.total; e.profit += it.total - (it.cost ?? 0) * it.quantity; e.stock = p?.stock ?? e.stock;
      prodMap.set(it.productId, e);
    }
  }
  const topProducts: TopProductRow[] = Array.from(prodMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ── Top customers ─────────────────────────────────────────────────────────────────
  const custMap = new Map<string, { purchases: number; spent: number; lastVisit?: string }>();
  for (const o of completed) {
    if (!o.customerId) continue;
    const e = custMap.get(o.customerId) ?? { purchases: 0, spent: 0 };
    e.purchases += 1; e.spent += o.total;
    if (!e.lastVisit || o.createdAt > e.lastVisit) e.lastVisit = o.createdAt;
    custMap.set(o.customerId, e);
  }
  const topCustomers: TopCustomerRow[] = Array.from(custMap.entries())
    .map(([id, v]) => ({
      id, name: customerName(id), purchases: v.purchases,
      credit: customers.find((c) => c.id === id)?.creditBalance ?? 0, lastVisit: v.lastVisit,
    }))
    .sort((a, b) => b.purchases - a.purchases)
    .slice(0, 10);

  // ── Top suppliers ─────────────────────────────────────────────────────────────────
  const supMap = new Map<string, { value: number; last?: string }>();
  for (const po of purchaseOrders) {
    const e = supMap.get(po.supplierId) ?? { value: 0 };
    e.value += po.total;
    if (!e.last || po.createdAt > e.last) e.last = po.createdAt;
    supMap.set(po.supplierId, e);
  }
  const topSuppliers: TopSupplierRow[] = Array.from(supMap.entries())
    .map(([id, v]) => ({ id, name: supplierName(id), purchaseValue: v.value, lastPurchase: v.last }))
    .sort((a, b) => b.purchaseValue - a.purchaseValue)
    .slice(0, 10);

  // ── Recent activity ───────────────────────────────────────────────────────────────
  const recentSales: RecentSaleRow[] = [...completed]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((o) => ({
      id: o.id, orderNumber: o.orderNumber, customer: customerName(o.customerId),
      cashier: employeeName(o.cashierId), payment: o.payments.map((p) => p.method).join(", ") || "—",
      amount: o.total, status: o.status, date: o.createdAt,
    }));

  const recentPurchases = [...purchaseOrders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((p) => ({ id: p.id, poNumber: p.poNumber, supplier: supplierName(p.supplierId), warehouse: warehouseName(p.warehouseId), amount: p.total, status: p.status, date: p.createdAt }));

  const recentExpenses = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .map((e) => ({ id: e.id, type: e.category, description: e.description ?? "—", amount: e.amount, enteredBy: "—", date: e.date }));

  const recentStockMovements = [...movements]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12)
    .map((m) => ({
      id: m.id, reference: m.reason ?? m.type, product: products.find((p) => p.id === m.productId)?.name ?? "—",
      quantity: m.quantity, type: m.type, warehouse: "Main", date: m.createdAt, user: "—",
    }));

  // ── Insights (rule-based) ─────────────────────────────────────────────────────────
  const insights = buildInsights({
    todaySales, yesterdaySales, todayProfit, todayExpensesTotal,
    lowStockCount: lowStock.length, categorySales, monthOrders, completed, customers,
  });

  // ── Low stock / out of stock rows ─────────────────────────────────────────────────
  const lowStockRows: LowStockRow[] = lowStock.map((p) => ({
    id: p.id, name: p.name, barcode: p.barcode, image: p.image, stock: p.stock,
    minStock: p.lowStockThreshold ?? 5, supplier: supplierName(undefined),
  }));
  const outOfStockRows: LowStockRow[] = outOfStock.map((p) => ({
    id: p.id, name: p.name, barcode: p.barcode, image: p.image, stock: p.stock,
    minStock: p.lowStockThreshold ?? 5, supplier: supplierName(undefined),
  }));

  // ── Cash flow ─────────────────────────────────────────────────────────────────────
  const creditSalesTotal = completed.reduce((s, o) => s + o.payments.filter((p) => p.method === "CREDIT").reduce((ps, p) => ps + p.amount, 0), 0);
  const allCashSales = completed.reduce((s, o) => s + o.payments.filter((p) => p.method === "CASH").reduce((ps, p) => ps + p.amount, 0), 0);
  const allExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const allPurchases = purchaseOrders.reduce((s, p) => s + p.total, 0);
  const cashFlow: CashFlowSummary = {
    cashSales: allCashSales, creditSales: creditSalesTotal, expenses: allExpenses, purchases: allPurchases,
    netCash: allCashSales + creditSalesTotal - allExpenses - allPurchases,
  };

  // ── Employee performance ──────────────────────────────────────────────────────────
  const empMap = new Map<string, { invoices: number; sales: number; refunds: number }>();
  for (const e of employees) empMap.set(e.id, { invoices: 0, sales: 0, refunds: 0 });
  for (const o of completed) {
    const key = o.cashierId ?? "unassigned";
    const e = empMap.get(key) ?? { invoices: 0, sales: 0, refunds: 0 };
    e.invoices += 1; e.sales += o.total;
    empMap.set(key, e);
  }
  for (const o of orders.filter((x) => x.status === "REFUNDED")) {
    const key = o.cashierId ?? "unassigned";
    const e = empMap.get(key);
    if (e) e.refunds += 1;
  }
  const employeePerformance: EmployeePerfRow[] = Array.from(empMap.entries()).map(([id, v]) => ({
    id, name: employeeName(id), invoices: v.invoices, sales: v.sales,
    avgBill: v.invoices > 0 ? v.sales / v.invoices : 0, refunds: v.refunds,
  })).sort((a, b) => b.sales - a.sales);

  // ── Warehouse summary ─────────────────────────────────────────────────────────────
  const warehouseSummary: WarehouseSummaryRow[] = (warehouses.length ? warehouses : [{ id: "main", name: "Main" }]).map((w) => ({
    id: w.id, name: w.name, products: products.length,
    stockValue: products.reduce((s, p) => s + p.stock * (p.cost ?? 0), 0),
    lowStock: lowStock.length, transfers: 0,
  }));

  // ── Inventory value ───────────────────────────────────────────────────────────────
  const inventoryValue = products.reduce((s, p) => s + p.stock * (p.cost ?? 0), 0);

  // ── Top brands (optional brand field; falls back to "Uncategorized") ────────────
  const brandMap = new Map<string, number>();
  for (const o of completed) for (const it of o.items) {
    const p = products.find((x) => x.id === it.productId);
    const brand = (p as { brand?: string }).brand ?? "Uncategorized";
    brandMap.set(brand, (brandMap.get(brand) ?? 0) + it.total);
  }
  const topBrands = Array.from(brandMap.entries()).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // ── Sales heatmap (by hour, last 30 days) ─────────────────────────────────────────
  const heatmap: HeatmapCell[] = [];
  const hourTotals = new Array(24).fill(0);
  const heatWindowStart = subDays(now, 30);
  for (const o of completed) {
    const d = new Date(o.createdAt);
    if (d >= heatWindowStart) hourTotals[d.getHours()] += o.total;
  }
  const maxHour = Math.max(...hourTotals, 1);
  for (let h = 0; h < 24; h++) {
    heatmap.push({ hour: h, label: format(new Date().setHours(h, 0, 0, 0), "ha").toLowerCase(), total: hourTotals[h], intensity: hourTotals[h] / maxHour });
  }

  // ── Calendar (current month) ──────────────────────────────────────────────────────
  const calendar: CalendarDayData[] = [];
  const calStart = startOfMonth(now);
  const calEnd = endOfMonth(now);
  for (let d = new Date(calStart); d <= calEnd; d.setDate(d.getDate() + 1)) {
    const ds = startOfDay(d), de = endOfDay(d);
    const dayOrders = completed.filter((o) => inDate(o.createdAt, ds, de));
    const dayExp = expenses.filter((e) => inDate(e.date, ds, de)).reduce((s, e) => s + e.amount, 0);
    const dayPurchases = purchaseOrders.filter((p) => inDate(p.createdAt, ds, de)).reduce((s, p) => s + p.total, 0);
    const dayProfit = dayOrders.reduce((s, o) => s + orderProfit(o), 0) - dayExp;
    calendar.push({
      date: format(d, "yyyy-MM-dd"),
      sales: sum(dayOrders, "total"), purchases: dayPurchases, expenses: dayExp,
      profit: dayProfit, events: dayOrders.length,
    });
  }

  // ── Notifications ─────────────────────────────────────────────────────────────────
  const notifications: DashboardAnalytics["notifications"] = [];
  if (lowStock.length) notifications.push({ id: "n-low", type: "Low Stock", text: `${lowStock.length} products are below minimum stock`, tone: "warning" });
  if (outOfStock.length) notifications.push({ id: "n-out", type: "Out of Stock", text: `${outOfStock.length} products are out of stock`, tone: "danger" });
  if (expiringSoon.length) notifications.push({ id: "n-exp", type: "Expiry", text: `${expiringSoon.length} products expiring within 30 days`, tone: "warning" });
  if (pendingCredit > 0) notifications.push({ id: "n-credit", type: "Credit", text: `${fmtMoney(pendingCredit)} outstanding customer credit`, tone: "info" });
  const pendingPOs = purchaseOrders.filter((p) => p.status === "ORDERED").length;
  if (pendingPOs) notifications.push({ id: "n-po", type: "Purchases", text: `${pendingPOs} purchase orders pending`, tone: "info" });

  // ── Backup status ─────────────────────────────────────────────────────────────────
  const lastBackupAudit = auditLogs.find((a) => a.action === "BACKUP");
  const backupStatus = {
    lastBackupDate: lastBackupAudit?.timestamp,
    status: lastBackupAudit ? "OK" : "Never backed up",
    nextRecommended: lastBackupAudit ? format(endOfDay(subDays(now, -7)), "dd MMM yyyy") : format(now, "dd MMM yyyy"),
  };

  // ── System status ─────────────────────────────────────────────────────────────────
  let dbSizeBytes = 0;
  try { if (typeof navigator !== "undefined" && navigator.storage?.estimate) { const est = await navigator.storage.estimate(); dbSizeBytes = est.usage ?? 0; } } catch { /* ignore */ }
  const systemStatus = {
    dbSizeBytes,
    products: products.length, customers: customers.length, invoices: orders.length, suppliers: suppliers.length,
    storageUsed: dbSizeBytes > 0 ? `${(dbSizeBytes / 1024 / 1024).toFixed(2)} MB` : "—",
  };

  const data: DashboardAnalytics = {
    generatedAt: now.toISOString(),
    kpis, salesSeries, profitTrend, categorySales, paymentMethods,
    topProducts, topCustomers, topSuppliers, recentSales, recentPurchases,
    recentExpenses, recentStockMovements, insights, lowStock: lowStockRows, outOfStock: outOfStockRows,
    expiringSoon, cashFlow, employeePerformance, warehouseSummary, inventoryValue,
    topBrands, topCategories, heatmap, calendar, notifications, backupStatus, systemStatus,
    expenseBreakdown, todayCustomers,
  };
  cache.set(db, { ts: Date.now(), data });
  return data;
}

// ─── Insight builder ────────────────────────────────────────────────────────────

function buildInsights(ctx: {
  todaySales: number; yesterdaySales: number; todayProfit: number; todayExpensesTotal: number;
  lowStockCount: number; categorySales: CategorySlice[]; monthOrders: Order[]; completed: Order[]; customers: Customer[];
}): Insight[] {
  const out: Insight[] = [];
  const salesDelta = ctx.yesterdaySales > 0 ? ((ctx.todaySales - ctx.yesterdaySales) / ctx.yesterdaySales) * 100 : 0;
  if (Math.abs(salesDelta) > 0.5) {
    out.push({
      id: "i-sales",
      tone: salesDelta >= 0 ? "success" : "danger",
      text: `Sales ${salesDelta >= 0 ? "increased" : "decreased"} by ${Math.abs(salesDelta).toFixed(1)}% compared to yesterday.`,
    });
  }
  if (ctx.todayExpensesTotal > 0 && ctx.todayProfit < 0) {
    out.push({ id: "i-profit", tone: "danger", text: "Profit is negative today — expenses exceeded gross profit." });
  } else if (ctx.todayExpensesTotal > ctx.todayProfit && ctx.todayProfit > 0) {
    out.push({ id: "i-exp", tone: "warning", text: "Expenses are eating into today's profit margin." });
  }
  if (ctx.categorySales.length) {
    out.push({ id: "i-cat", tone: "info", text: `Top category this period is ${ctx.categorySales[0].name} (${ctx.categorySales[0].pct.toFixed(0)}% of revenue).` });
    if (ctx.categorySales.length > 1) out.push({ id: "i-cat2", tone: "info", text: `Fastest-growing category: ${ctx.categorySales[0].name}.` });
  }
  if (ctx.lowStockCount > 0) {
    out.push({ id: "i-low", tone: "warning", text: `${ctx.lowStockCount} products are close to being out of stock.` });
  }
  // Largest sale today
  const todayCompleted = ctx.completed.filter((o) => isSameDay(new Date(o.createdAt), new Date()));
  if (todayCompleted.length) {
    const largest = todayCompleted.reduce((a, b) => (b.total > a.total ? b : a));
    out.push({ id: "i-largest", tone: "info", text: `Largest sale today was ${fmtMoney(largest.total)} at ${format(new Date(largest.createdAt), "h:mm a")}.` });
  }
  // Most loyal customer this month
  const monthCustMap = new Map<string, number>();
  for (const o of ctx.monthOrders) if (o.customerId) monthCustMap.set(o.customerId, (monthCustMap.get(o.customerId) ?? 0) + 1);
  const topCust = Array.from(monthCustMap.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topCust) {
    const c = ctx.customers.find((x) => x.id === topCust[0]);
    if (c) out.push({ id: "i-loyal", tone: "info", text: `Customer ${c.name} purchased ${topCust[1]} times this month.` });
  }
  return out;
}

// ─── Multi-granularity sales series (for the toggle chart) ──────────────────────

export async function computeSalesSeries(db: PosDatabase, granularity: TrendGranularity): Promise<SalesSeriesPoint[]> {
  const orders = await db.orders.toArray();
  const completed = completedOrders(orders);
  const now = new Date();

  if (granularity === "hourly") {
    // today by hour
    const ts = startOfDay(now);
    const out: SalesSeriesPoint[] = [];
    for (let h = 0; h < 24; h++) {
      const hs = new Date(ts); hs.setHours(h, 0, 0, 0);
      const he = new Date(ts); he.setHours(h, 59, 59, 999);
      const ho = completed.filter((o) => { const d = new Date(o.createdAt); return d >= hs && d <= he; });
      out.push({ label: format(hs, "ha").toLowerCase(), revenue: sum(ho, "total"), profit: ho.reduce((s, o) => s + orderProfit(o), 0), invoices: ho.length });
    }
    return out.filter((p) => p.invoices > 0 || p.revenue > 0 || Number(p.label.replace(/\D/g, "")) % 3 === 0);
  }

  const buckets: SalesSeriesPoint[] = [];
  if (granularity === "daily") {
    for (let i = 13; i >= 0; i--) {
      const d = subDays(now, i); const ds = startOfDay(d), de = endOfDay(d);
      const ho = completed.filter((o) => inDateR(o.createdAt, ds, de));
      buckets.push({ label: format(d, "dd MMM"), revenue: sum(ho, "total"), profit: ho.reduce((s, o) => s + orderProfit(o), 0), invoices: ho.length });
    }
  } else if (granularity === "weekly") {
    for (let i = 9; i >= 0; i--) {
      const ref = subWeeks(now, i);
      const ws = startOfWeek(ref, { weekStartsOn: 1 }), we = endOfWeek(ref, { weekStartsOn: 1 });
      const ho = completed.filter((o) => inDateR(o.createdAt, ws, we));
      buckets.push({ label: `W${format(ref, "w")}`, revenue: sum(ho, "total"), profit: ho.reduce((s, o) => s + orderProfit(o), 0), invoices: ho.length });
    }
  } else if (granularity === "monthly") {
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i); const ms = startOfMonth(d), me = endOfMonth(d);
      const ho = completed.filter((o) => inDateR(o.createdAt, ms, me));
      buckets.push({ label: format(d, "MMM"), revenue: sum(ho, "total"), profit: ho.reduce((s, o) => s + orderProfit(o), 0), invoices: ho.length });
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const d = subYears(now, i); const ys = startOfYear(d), ye = endOfYear(d);
      const ho = completed.filter((o) => inDateR(o.createdAt, ys, ye));
      buckets.push({ label: format(d, "yyyy"), revenue: sum(ho, "total"), profit: ho.reduce((s, o) => s + orderProfit(o), 0), invoices: ho.length });
    }
  }
  return buckets;
}

function inDateR(d: string, from: Date, to: Date) { const x = new Date(d); return x >= from && x <= to; }

// ─── Money helper (default symbol overridden by app formatter) ──────────────────
function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
