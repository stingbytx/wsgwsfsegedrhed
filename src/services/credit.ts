// ============================================================================
// Credit Engine — customer credit accounts. Records payments, checks limits,
// computes alerts, and auto-updates the outstanding balance on the customer.
// Additive; uses the customers table (creditBalance/limit via CRM extension)
// + the creditPayments table.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { Customer } from "@/types";
import type { CustomerCrmExtension, CreditPayment, CreditStatus } from "@/types/crm";
import { generateId, nowIso } from "@/lib/utils";
import { logAudit } from "./audit";

type CrmCustomer = Customer & Partial<CustomerCrmExtension>;

export function availableCredit(c: CrmCustomer): number {
  if (c.creditStatus !== "CREDIT") return 0;
  const limit = c.creditLimit ?? 0;
  const balance = c.creditBalance ?? 0;
  return Math.max(0, limit - balance);
}

export type CreditAlert = "OK" | "APPROACHING" | "REACHED" | "OVER_LIMIT" | "BLACKLISTED";

export function creditAlert(c: CrmCustomer): { level: CreditAlert; pct: number } {
  if (c.creditStatus === "BLACKLISTED") return { level: "BLACKLISTED", pct: 100 };
  if (c.creditStatus !== "CREDIT" || !(c.creditLimit ?? 0)) return { level: "OK", pct: 0 };
  const pct = ((c.creditBalance ?? 0) / (c.creditLimit ?? 1)) * 100;
  if (pct > 100) return { level: "OVER_LIMIT", pct };
  if (pct >= 100) return { level: "REACHED", pct };
  if (pct >= 80) return { level: "APPROACHING", pct };
  return { level: "OK", pct };
}

/** Increase a customer's outstanding balance after a credit sale. */
export async function addCreditSale(db: PosDatabase, customerId: string, amount: number, orderId?: string): Promise<void> {
  const c = await db.customers.get(customerId);
  if (!c) return;
  const cc = c as CrmCustomer;
  if (cc.creditStatus === "BLACKLISTED") throw new Error("Customer is blacklisted");
  const next = (c.creditBalance ?? 0) + amount;
  await db.customers.update(customerId, { creditBalance: next, updatedAt: nowIso() } as Partial<Customer>);
  await logAudit(db, { action: "SALE", entity: "customer", entityId: customerId, newValue: { creditBalance: next, orderId } });
}

/** Record a payment against outstanding balance (full or partial). */
export async function recordCreditPayment(
  db: PosDatabase,
  input: { customerId: string; amount: number; method: string; orderId?: string | null; note?: string; date?: string }
): Promise<CreditPayment> {
  const c = await db.customers.get(input.customerId);
  if (!c) throw new Error("Customer not found");
  if (!(input.amount > 0)) throw new Error("Payment amount must be positive");
  const nextBalance = Math.max(0, (c.creditBalance ?? 0) - input.amount);
  const payment: CreditPayment = {
    id: generateId(),
    customerId: input.customerId,
    orderId: input.orderId ?? null,
    amount: input.amount,
    method: input.method,
    note: input.note,
    date: input.date ?? new Date().toISOString().slice(0, 10),
    createdAt: nowIso(),
  };
  await db.transaction("rw", db.customers, db.creditPayments, async () => {
    await db.creditPayments.add(payment);
    await db.customers.update(input.customerId, { creditBalance: nextBalance, lastCreditPayment: nowIso(), updatedAt: nowIso() } as Partial<Customer>);
  });
  await logAudit(db, { action: "EDIT", entity: "creditPayment", entityId: payment.id, newValue: { amount: input.amount, balanceAfter: nextBalance } });
  return payment;
}

export async function listCreditPayments(db: PosDatabase, customerId: string): Promise<CreditPayment[]> {
  const all = await db.creditPayments.where("customerId").equals(customerId).toArray();
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export function setCreditStatus(c: CrmCustomer, status: CreditStatus): CrmCustomer {
  return { ...c, creditStatus: status };
}
