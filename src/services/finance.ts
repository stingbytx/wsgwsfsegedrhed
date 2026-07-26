// ============================================================================
// Finance Engine — the ONLY path through which income and expense flow.
//
// Automatically derives: revenue, expenses, profit, gross profit, net
// profit, and cash flow from orders + expenses. One canonical calculation
// consumed by the dashboard engine, report engine, and finance pages.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { Order, Expense } from "@/types";

export interface DateRange {
  from: Date;
  to: Date;
}

export function inRange(dateStr: string, range?: DateRange): boolean {
  if (!range) return true;
  const d = new Date(dateStr);
  return d >= range.from && d <= range.to;
}

export interface FinanceSummary {
  revenue: number; // total of completed/partial sales
  costOfGoods: number; // sum of item.cost * qty
  grossProfit: number; // revenue - COGS
  expenses: number; // total expenses
  netProfit: number; // grossProfit - expenses
  refunds: number; // total refunded
  outstandingCredit: number;
  cashIn: number; // cash payments received
  cashOut: number; // expenses paid
  netCashFlow: number; // cashIn - cashOut
  orderCount: number;
  avgOrderValue: number;
  grossMarginPct: number;
  netMarginPct: number;
}

/** Compute the canonical finance summary for a date range (or all time). */
export async function computeFinanceSummary(db: PosDatabase, range?: DateRange): Promise<FinanceSummary> {
  const [orders, expenses, creditSales] = await Promise.all([
    db.orders.toArray(),
    db.expenses.toArray(),
    db.creditSales.toArray(),
  ]);

  const completed = orders.filter(
    (o) => (o.status === "COMPLETED" || o.status === "PARTIALLY_REFUNDED") && inRange(o.createdAt, range)
  );
  const refunded = orders.filter((o) => o.status === "REFUNDED" && inRange(o.createdAt, range));
  const rangedExpenses = expenses.filter((e) => inRange(e.date, range));

  const revenue = completed.reduce((s, o) => s + o.total, 0);
  const costOfGoods = completed.reduce(
    (s, o) => s + o.items.reduce((is, it) => is + (it.cost ?? 0) * it.quantity, 0),
    0
  );
  const grossProfit = revenue - costOfGoods;
  const expensesTotal = rangedExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - expensesTotal;
  const refunds = refunded.reduce((s, o) => s + o.total, 0);
  const outstandingCredit = creditSales.reduce((s, c) => s + c.remainingBalance, 0);

  const cashIn = completed.reduce(
    (s, o) => s + o.payments.filter((p) => p.method === "CASH").reduce((ps, p) => ps + p.amount, 0),
    0
  );
  const cashOut = expensesTotal; // assume expenses paid in cash
  const netCashFlow = cashIn - cashOut;

  const orderCount = completed.length;
  const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    revenue, costOfGoods, grossProfit, expenses: expensesTotal, netProfit,
    refunds, outstandingCredit, cashIn, cashOut, netCashFlow,
    orderCount, avgOrderValue, grossMarginPct, netMarginPct,
  };
}

export interface ExpenseByCategory {
  category: string;
  total: number;
  count: number;
}

export async function expensesByCategory(db: PosDatabase, range?: DateRange): Promise<ExpenseByCategory[]> {
  const expenses = await db.expenses.toArray();
  const map = new Map<string, ExpenseByCategory>();
  for (const e of expenses) {
    if (!inRange(e.date, range)) continue;
    const entry = map.get(e.category) ?? { category: e.category, total: 0, count: 0 };
    entry.total += e.amount;
    entry.count += 1;
    map.set(e.category, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/** Create an expense through the finance engine (ensures audit + consistent shape). */
export async function createExpense(
  db: PosDatabase,
  expense: { category: string; description?: string; amount: number; date: string }
): Promise<Expense> {
  if (!expense.category) throw new Error("Expense category required");
  if (!(expense.amount > 0)) throw new Error("Expense amount must be positive");
  const row: Expense = {
    id: crypto.randomUUID(),
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    date: expense.date,
    createdAt: new Date().toISOString(),
  };
  await db.expenses.add(row);
  return row;
}

export async function deleteExpense(db: PosDatabase, id: string): Promise<void> {
  await db.expenses.delete(id);
}

// ─── Cash flow series (for charts) ─────────────────────────────────────────────

export interface CashFlowPoint {
  label: string;
  inflow: number;
  outflow: number;
  net: number;
}

export async function cashFlowSeries(db: PosDatabase, days = 14): Promise<CashFlowPoint[]> {
  const [orders, expenses] = await Promise.all([db.orders.toArray(), db.expenses.toArray()]);
  const points: CashFlowPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);

    const inflow = orders
      .filter((o) => (o.status === "COMPLETED" || o.status === "PARTIALLY_REFUNDED") && new Date(o.createdAt) >= day && new Date(o.createdAt) < next)
      .reduce((s, o) => s + o.total, 0);
    const outflow = expenses
      .filter((e) => { const d = new Date(e.date); return d >= day && d < next; })
      .reduce((s, e) => s + e.amount, 0);

    points.push({
      label: day.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
      inflow,
      outflow,
      net: inflow - outflow,
    });
  }
  return points;
}
