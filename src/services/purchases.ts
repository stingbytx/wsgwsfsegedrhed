// ============================================================================
// Purchases & GRN Engine — creates purchase orders and goods-received notes,
// and wires GRN receipts through the Inventory Engine so stock is updated
// consistently. All writes are atomic.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { PurchaseOrder, GRN, PurchaseOrderItem, GRNItem } from "@/types/enterprise";
import { generateId, nowIso } from "@/lib/utils";
import { nextPurchaseNumber, nextGRNNumber } from "./sequence";
import { recordMovements } from "./inventory";
import { logAudit } from "./audit";

export interface CreatePOInput {
  supplierId: string;
  supplierName?: string;
  warehouseId?: string | null;
  items: { productId: string; name: string; sku: string; cost: number; quantityOrdered: number }[];
  expectedDate?: string | null;
  notes?: string;
}

function poTotals(items: PurchaseOrderItem[]) {
  const subtotal = items.reduce((s, i) => s + i.cost * i.quantityOrdered, 0);
  return { subtotal, taxTotal: 0, total: subtotal };
}

export async function createPurchaseOrder(db: PosDatabase, input: CreatePOInput): Promise<PurchaseOrder> {
  const poNumber = await nextPurchaseNumber(db);
  const items: PurchaseOrderItem[] = input.items.map((i) => ({
    id: generateId(),
    productId: i.productId,
    name: i.name,
    sku: i.sku,
    cost: i.cost,
    quantityOrdered: i.quantityOrdered,
    quantityReceived: 0,
    total: i.cost * i.quantityOrdered,
  }));
  const { subtotal, taxTotal, total } = poTotals(items);
  const po: PurchaseOrder = {
    id: generateId(),
    poNumber,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    warehouseId: input.warehouseId ?? null,
    items,
    subtotal, taxTotal, total,
    status: "ORDERED",
    expectedDate: input.expectedDate ?? null,
    notes: input.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.purchaseOrders.add(po);
  await logAudit(db, { action: "PURCHASE", entity: "purchaseOrder", entityId: po.id, newValue: { poNumber, total } });
  return po;
}

export async function listPurchaseOrders(db: PosDatabase): Promise<PurchaseOrder[]> {
  const all = await db.purchaseOrders.toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPurchaseOrder(db: PosDatabase, id: string): Promise<PurchaseOrder | undefined> {
  return db.purchaseOrders.get(id);
}

export async function cancelPurchaseOrder(db: PosDatabase, id: string): Promise<void> {
  const po = await db.purchaseOrders.get(id);
  if (!po) return;
  if (po.status === "RECEIVED") throw new Error("Cannot cancel a received PO");
  await db.purchaseOrders.update(id, { status: "CANCELLED", updatedAt: nowIso() });
}

export interface CreateGRNInput {
  purchaseOrderId: string;
  items: { poItemId: string; productId: string; name: string; sku: string; quantityReceived: number; cost: number }[];
  warehouseId?: string | null;
  notes?: string;
}

/** Receive goods: creates a GRN, increments product stock via the inventory
 *  engine, and updates the PO's received quantities + status. */
export async function createGRN(db: PosDatabase, input: CreateGRNInput): Promise<GRN> {
  const po = await db.purchaseOrders.get(input.purchaseOrderId);
  if (!po) throw new Error("Purchase order not found");

  const grnNumber = await nextGRNNumber(db);
  const grnItems: GRNItem[] = input.items.map((i) => ({
    id: generateId(),
    poItemId: i.poItemId,
    productId: i.productId,
    name: i.name,
    sku: i.sku,
    quantityReceived: i.quantityReceived,
    cost: i.cost,
    total: i.cost * i.quantityReceived,
  }));
  const total = grnItems.reduce((s, i) => s + i.total, 0);
  const grn: GRN = {
    id: generateId(),
    grnNumber,
    purchaseOrderId: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    warehouseId: input.warehouseId ?? po.warehouseId ?? null,
    items: grnItems,
    total,
    status: "COMPLETED",
    notes: input.notes,
    receivedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await db.transaction("rw", db.grns, db.purchaseOrders, db.products, db.inventoryMovements, async () => {
    await db.grns.add(grn);
    // Update PO received quantities
    const updatedItems = po.items.map((it) => {
      const recv = input.items.find((x) => x.poItemId === it.id);
      if (recv) it.quantityReceived += recv.quantityReceived;
      return it;
    });
    const allReceived = updatedItems.every((it) => it.quantityReceived >= it.quantityOrdered);
    await db.purchaseOrders.update(po.id, {
      items: updatedItems,
      status: allReceived ? "RECEIVED" : "PARTIAL",
      updatedAt: nowIso(),
    });
    // Stock in via inventory engine (bulk)
    await recordMovements(
      db,
      grnItems.map((i) => ({
        productId: i.productId,
        type: "GRN",
        quantity: i.quantityReceived,
        reason: `GRN ${grnNumber}`,
        supplierId: po.supplierId,
        warehouseId: input.warehouseId ?? undefined,
        referenceId: grn.id,
        referenceType: "grn",
      }))
    );
  });

  await logAudit(db, { action: "GRN", entity: "grn", entityId: grn.id, newValue: { grnNumber, total } });
  return grn;
}

export async function listGRNs(db: PosDatabase): Promise<GRN[]> {
  const all = await db.grns.toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
