// ============================================================================
// Dashboard Engine — one analytics service every dashboard widget queries.
// Replaces per-widget computation with a single cached calculation so the
// dashboard, reports, and finance views never disagree.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import { computeFinanceSummary, cashFlowSeries, type DateRange } from "./finance";
import { getInventoryValue, getLowStockProducts } from "./inventory";

export interface DashboardData {
  finance: Awaited<ReturnType<typeof computeFinanceSummary>>;
  cashFlow: Awaited<ReturnType<typeof cashFlowSeries>>;
  inventory: { costValue: number; retailValue: number; units: number };
  lowStockCount: number;
  productsCount: number;
  customersCount: number;
  suppliersCount: number;
  employeesCount: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  salesTrend: { label: string; sales: number }[];
  recentOrders: import("@/types").Order[];
  recentCustomers: import("@/types").Customer[];
}

// Tiny in-memory cache keyed by db instance + minute — avoids recompute
// on every live-query tick when data hasn't changed.
const cache = new WeakMap<object, { ts: number; data: DashboardData }>();
const TTL = 30_000;

export async function computeDashboard(db: PosDatabase, range?: DateRange): Promise<DashboardData> {
  const cached = cache.get(db);
  if (cached && Date.now() - cached.ts < TTL && !range) return cached.data;

  const [finance, cashFlow, inventory, lowStock, products, customers, suppliers, employees, orders] = await Promise.all([
    computeFinanceSummary(db, range),
    cashFlowSeries(db, 14),
    getInventoryValue(db),
    getLowStockProducts(db),
    db.products.count(),
    db.customers.count(),
    db.suppliers.count(),
    db.employees.count(),
    db.orders.toArray(),
  ]);

  const completed = orders.filter((o) => o.status === "COMPLETED" || o.status === "PARTIALLY_REFUNDED");

  // Top products by revenue
  const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of completed) {
    for (const it of o.items) {
      const e = productSales.get(it.productId) ?? { name: it.name, qty: 0, revenue: 0 };
      e.qty += it.quantity;
      e.revenue += it.total;
      productSales.set(it.productId, e);
    }
  }
  const topProducts = Array.from(productSales.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Sales trend (last 7 days)
  const salesTrend: { label: string; sales: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const sales = completed
      .filter((o) => new Date(o.createdAt) >= day && new Date(o.createdAt) < next)
      .reduce((s, o) => s + o.total, 0);
    salesTrend.push({ label: day.toLocaleDateString(undefined, { weekday: "short" }), sales: Number(sales.toFixed(2)) });
  }

  const recentOrders = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const allCustomers = await db.customers.toArray();
  const recentCustomers = [...allCustomers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const data: DashboardData = {
    finance, cashFlow, inventory,
    lowStockCount: lowStock.length,
    productsCount: products,
    customersCount: customers,
    suppliersCount: suppliers,
    employeesCount: employees,
    topProducts, salesTrend, recentOrders, recentCustomers,
  };

  if (!range) cache.set(db, { ts: Date.now(), data });
  return data;
}
