"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "./use-db";
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from "date-fns";

export function useDashboardStats() {
  const db = useDb();

  return useLiveQuery(async () => {
    if (!db) return null;

    const [orders, products, customers, expenses] = await Promise.all([
      db.orders.toArray(),
      db.products.toArray(),
      db.customers.toArray(),
      db.expenses.toArray(),
    ]);

    const today = startOfDay(new Date());
    const completed = orders.filter((o) => o.status === "COMPLETED" || o.status === "PARTIALLY_REFUNDED");

    const todayOrders = completed.filter((o) => new Date(o.createdAt) >= today);
    const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);

    const revenue = completed.reduce((s, o) => s + o.total, 0);
    const cost = completed.reduce(
      (s, o) => s + o.items.reduce((is, it) => is + (it.cost ?? 0) * it.quantity, 0),
      0
    );
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const profit = revenue - cost - totalExpenses;

    const inventoryValue = products.reduce((s, p) => s + p.price * p.stock, 0);
    const lowStock = products.filter((p) => p.stock <= (p.lowStockThreshold ?? 5));

    // Last 7 days sales trend
    const last7Days = Array.from({ length: 7 }).map((_, idx) => {
      const day = subDays(new Date(), 6 - idx);
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const daySales = completed
        .filter((o) => new Date(o.createdAt) >= dayStart && new Date(o.createdAt) < dayEnd)
        .reduce((s, o) => s + o.total, 0);
      return { label: format(day, "EEE"), sales: Number(daySales.toFixed(2)) };
    });

    const weekStart = startOfWeek(new Date());
    const weekSales = completed.filter((o) => new Date(o.createdAt) >= weekStart).reduce((s, o) => s + o.total, 0);
    const monthStart = startOfMonth(new Date());
    const monthSales = completed.filter((o) => new Date(o.createdAt) >= monthStart).reduce((s, o) => s + o.total, 0);

    const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const order of completed) {
      for (const item of order.items) {
        const entry = productSales.get(item.productId) ?? { name: item.name, qty: 0, revenue: 0 };
        entry.qty += item.quantity;
        entry.revenue += item.total;
        productSales.set(item.productId, entry);
      }
    }
    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const recentOrders = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
    const recentCustomers = [...customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
    const recentProducts = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

    return {
      todaySales,
      todayOrdersCount: todayOrders.length,
      revenue,
      profit,
      expenses: totalExpenses,
      inventoryValue,
      productsCount: products.length,
      customersCount: customers.length,
      lowStock,
      weekSales,
      monthSales,
      last7Days,
      topProducts,
      recentOrders,
      recentCustomers,
      recentProducts,
    };
  }, [db]);
}
