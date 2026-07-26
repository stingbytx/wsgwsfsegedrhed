// ============================================================================
// Sequence Engine — generates prefix-based, monotonically-incrementing
// document numbers (invoices, POs, GRNs, returns, transfers) using the
// configurable prefixes from settings. Uses a counter table-less approach:
// counts existing docs of the same type and pads. Safe under single-user
// offline use; for multi-user a SQL sequence would replace this.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import { getPrefixes } from "./settings";

const PAD = (n: number, len = 5) => String(n).padStart(len, "0");

function dateStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${PAD(d.getMonth() + 1, 2)}${PAD(d.getDate(), 2)}`;
}

async function nextSeq(db: PosDatabase, collection: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const count = await (db as any)[collection].count();
  return count + 1;
}

export async function nextInvoiceNumber(db: PosDatabase): Promise<string> {
  const p = await getPrefixes(db);
  const seq = await nextSeq(db, "orders");
  return `${p.invoice}-${dateStamp()}-${PAD(seq)}`;
}

export async function nextPurchaseNumber(db: PosDatabase): Promise<string> {
  const p = await getPrefixes(db);
  const seq = await nextSeq(db, "purchaseOrders");
  return `${p.purchase}-${dateStamp()}-${PAD(seq)}`;
}

export async function nextGRNNumber(db: PosDatabase): Promise<string> {
  const p = await getPrefixes(db);
  const seq = await nextSeq(db, "grns");
  return `${p.grn}-${dateStamp()}-${PAD(seq)}`;
}

export async function nextReturnNumber(db: PosDatabase): Promise<string> {
  const p = await getPrefixes(db);
  const seq = await nextSeq(db, "salesReturns");
  return `${p.return}-${dateStamp()}-${PAD(seq)}`;
}

export async function nextTransferNumber(db: PosDatabase): Promise<string> {
  const p = await getPrefixes(db);
  const seq = await nextSeq(db, "stockTransfers");
  return `${p.transfer}-${dateStamp()}-${PAD(seq)}`;
}
