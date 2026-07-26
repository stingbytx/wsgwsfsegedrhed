// ============================================================================
// Shift & Cash Drawer service — cashier shift management + cash drawer log.
// Additive; does not touch existing orders/finance logic.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { Shift, CashDrawerEntry } from "@/types/pim";
import { generateId, nowIso } from "@/lib/utils";
import { logAudit } from "./audit";

export async function startShift(db: PosDatabase, input: { cashierId?: string | null; cashierName?: string; openingCash: number }): Promise<Shift> {
  // close any already-open shift for this cashier first
  const open = await db.shifts.where("status").equals("OPEN").toArray();
  for (const s of open) if (s.cashierId === (input.cashierId ?? null)) await closeShift(db, s.id, input.openingCash);
  const shift: Shift = {
    id: generateId(),
    cashierId: input.cashierId ?? null,
    cashierName: input.cashierName,
    openingCash: input.openingCash,
    salesTotal: 0, refundsTotal: 0, expensesTotal: 0, invoiceCount: 0,
    status: "OPEN",
    startedAt: nowIso(),
  };
  await db.shifts.add(shift);
  await db.cashDrawer.add({ id: generateId(), type: "OPEN", amount: input.openingCash, shiftId: shift.id, createdAt: nowIso() });
  await logAudit(db, { action: "CREATE", entity: "shift", entityId: shift.id, newValue: shift });
  return shift;
}

export async function getOpenShift(db: PosDatabase): Promise<Shift | null> {
  const open = await db.shifts.where("status").equals("OPEN").toArray();
  return open[open.length - 1] ?? null;
}

export async function closeShift(db: PosDatabase, id: string, closingCash: number): Promise<Shift | null> {
  const shift = await db.shifts.get(id);
  if (!shift || shift.status === "CLOSED") return null;
  const expectedCash = shift.openingCash + shift.salesTotal - shift.refundsTotal - shift.expensesTotal;
  const updated: Shift = {
    ...shift, closingCash, expectedCash, difference: closingCash - expectedCash,
    status: "CLOSED", closedAt: nowIso(),
  };
  await db.shifts.put(updated);
  await db.cashDrawer.add({ id: generateId(), type: "CLOSE", amount: closingCash, shiftId: id, createdAt: nowIso() });
  await logAudit(db, { action: "EDIT", entity: "shift", entityId: id, newValue: { status: "CLOSED", difference: updated.difference } });
  return updated;
}

export async function listShifts(db: PosDatabase): Promise<Shift[]> {
  const all = await db.shifts.toArray();
  return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/** Record a sale/refund/expense against the current open shift (called by POS checkout). */
export async function recordShiftActivity(db: PosDatabase, kind: "SALE" | "REFUND" | "EXPENSE", amount: number): Promise<void> {
  const open = await getOpenShift(db);
  if (!open) return;
  const patch: Partial<Shift> = {};
  if (kind === "SALE") { patch.salesTotal = open.salesTotal + amount; patch.invoiceCount = open.invoiceCount + 1; }
  else if (kind === "REFUND") patch.refundsTotal = open.refundsTotal + amount;
  else patch.expensesTotal = open.expensesTotal + amount;
  await db.shifts.update(open.id, patch);
  await db.cashDrawer.add({
    id: generateId(),
    type: kind === "SALE" ? "SALE" : kind === "REFUND" ? "REFUND" : "EXPENSE",
    amount, shiftId: open.id, createdAt: nowIso(),
  });
}

// ─── Cash drawer ───────────────────────────────────────────────────────────────────

export async function listCashDrawer(db: PosDatabase, shiftId?: string): Promise<CashDrawerEntry[]> {
  const all = shiftId ? await db.cashDrawer.where("shiftId").equals(shiftId).toArray() : await db.cashDrawer.toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function cashInOut(db: PosDatabase, type: "CASH_IN" | "CASH_OUT", amount: number, note?: string): Promise<void> {
  await db.cashDrawer.add({ id: generateId(), type, amount, note, createdAt: nowIso() });
  await logAudit(db, { action: "CREATE", entity: "cashDrawer", newValue: { type, amount, note } });
}

export async function getCashDrawerBalance(db: PosDatabase): Promise<number> {
  const entries = await db.cashDrawer.toArray();
  return entries.reduce((s, e) => {
    if (e.type === "OPEN" || e.type === "CASH_IN" || e.type === "SALE") return s + e.amount;
    if (e.type === "CASH_OUT" || e.type === "REFUND" || e.type === "EXPENSE" || e.type === "CLOSE") return s - e.amount;
    return s;
  }, 0);
}
