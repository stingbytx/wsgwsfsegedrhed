// ============================================================================
// Inventory Engine — the ONLY path through which stock moves.
//
// Sales, purchases/GRNs, returns, damage, transfers, adjustments, and manual
// edits all call `recordMovement()`. This guarantees stock consistency and a
// complete movement history. The legacy `completeSale`/`refundOrder` paths
// in services/orders.ts are NOT modified; new modules use this engine.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { Product, InventoryMovement } from "@/types";
import type { StockTransfer } from "@/types/enterprise";
import { generateId, nowIso } from "@/lib/utils";
import { logAudit } from "./audit";

export type MovementType =
  | "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" | "SALE" | "RETURN"
  | "DAMAGE" | "TRANSFER" | "GRN";

export interface MovementInput {
  productId: string;
  type: MovementType;
  quantity: number; // signed: + increases stock, - decreases
  reason?: string;
  supplierId?: string | null;
  warehouseId?: string | null;
  referenceId?: string; // orderId, poId, grnId, returnId, transferId
  referenceType?: string;
}

/** Core: apply a stock movement atomically and persist the audit trail. */
export async function recordMovement(db: PosDatabase, input: MovementInput): Promise<InventoryMovement> {
  if (!input.productId) throw new Error("productId required");
  if (!Number.isFinite(input.quantity)) throw new Error("quantity must be a number");

  const movement: InventoryMovement = {
    id: generateId(),
    productId: input.productId,
    type: input.type as InventoryMovement["type"],
    quantity: input.quantity,
    reason: input.reason,
    supplierId: input.supplierId ?? null,
    createdAt: nowIso(),
  };

  await db.transaction("rw", db.products, db.inventoryMovements, async () => {
    const product = await db.products.get(input.productId);
    if (!product) throw new Error(`Product ${input.productId} not found`);
    const nextStock = Math.max(0, product.stock + input.quantity);
    await db.products.update(product.id, { stock: nextStock, updatedAt: nowIso() });
    await db.inventoryMovements.add(movement);
  });

  await logAudit(db, {
    action: input.type === "SALE" ? "SALE" : input.type === "GRN" ? "GRN" : input.type === "TRANSFER" ? "TRANSFER" : "STOCK_ADJUSTMENT",
    entity: "inventoryMovement",
    entityId: movement.id,
    newValue: { productId: input.productId, delta: input.quantity, type: input.type, reason: input.reason },
    meta: { referenceId: input.referenceId, referenceType: input.referenceType },
  });

  return movement;
}

/** Bulk apply several movements atomically (e.g. a multi-line GRN). */
export async function recordMovements(db: PosDatabase, inputs: MovementInput[]): Promise<void> {
  await db.transaction("rw", db.products, db.inventoryMovements, async () => {
    for (const input of inputs) {
      const product = await db.products.get(input.productId);
      if (!product) continue;
      await db.products.update(product.id, {
        stock: Math.max(0, product.stock + input.quantity),
        updatedAt: nowIso(),
      });
      await db.inventoryMovements.add({
        id: generateId(),
        productId: input.productId,
        type: input.type as InventoryMovement["type"],
        quantity: input.quantity,
        reason: input.reason,
        supplierId: input.supplierId ?? null,
        createdAt: nowIso(),
      });
    }
  });
}

/** Manual stock adjustment (Inventory Officer). */
export async function adjustStock(
  db: PosDatabase,
  productId: string,
  newStock: number,
  reason: string
): Promise<void> {
  const product = await db.products.get(productId);
  if (!product) throw new Error("Product not found");
  const delta = newStock - product.stock;
  if (delta === 0) return;
  await recordMovement(db, {
    productId,
    type: "ADJUSTMENT",
    quantity: delta,
    reason,
  });
}

/** Mark damaged stock (reduces stock, keeps a DAMAGE movement). */
export async function recordDamage(db: PosDatabase, productId: string, qty: number, reason: string): Promise<void> {
  if (qty <= 0) throw new Error("Damage quantity must be positive");
  await recordMovement(db, { productId, type: "DAMAGE", quantity: -qty, reason });
}

/** Transfer stock between warehouses (records a TRANSFER movement + doc). */
export async function createStockTransfer(
  db: PosDatabase,
  transfer: Omit<StockTransfer, "id" | "transferNumber" | "createdAt" | "updatedAt" | "status"> & { status?: StockTransfer["status"] }
): Promise<StockTransfer> {
  const doc: StockTransfer = {
    id: generateId(),
    transferNumber: `TRF-${Date.now().toString().slice(-8)}`,
    fromWarehouseId: transfer.fromWarehouseId,
    toWarehouseId: transfer.toWarehouseId,
    items: transfer.items,
    status: transfer.status ?? "COMPLETED",
    notes: transfer.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.stockTransfers.add(doc);
  if (doc.status === "COMPLETED") {
    await recordMovements(
      db,
      doc.items.map((i) => ({
        productId: i.productId,
        type: "TRANSFER",
        quantity: -i.quantity,
        reason: `Transfer to ${doc.toWarehouseId ?? "—"}`,
        warehouseId: doc.toWarehouseId ?? undefined,
        referenceId: doc.id,
        referenceType: "transfer",
      }))
    );
  }
  return doc;
}

// ─── Queries ───────────────────────────────────────────────────────────────────

export interface StockStatus {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  isLow: boolean;
  outOfStock: boolean;
  inventoryValue: number; // stock * cost
  retailValue: number; // stock * price
}

export async function getStockStatuses(db: PosDatabase): Promise<StockStatus[]> {
  const products = await db.products.toArray();
  return products.map((p) => ({
    productId: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold ?? 5,
    isLow: p.stock <= (p.lowStockThreshold ?? 5) && p.stock > 0,
    outOfStock: p.stock <= 0,
    inventoryValue: p.stock * (p.cost ?? 0),
    retailValue: p.stock * p.price,
  }));
}

export async function getMovements(db: PosDatabase, productId?: string, limit = 500): Promise<InventoryMovement[]> {
  const all = productId
    ? await db.inventoryMovements.where("productId").equals(productId).toArray()
    : await db.inventoryMovements.toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export async function getLowStockProducts(db: PosDatabase): Promise<Product[]> {
  const products = await db.products.toArray();
  return products.filter((p) => p.stock <= (p.lowStockThreshold ?? 5));
}

export async function getInventoryValue(db: PosDatabase): Promise<{ costValue: number; retailValue: number; units: number }> {
  const products = await db.products.toArray();
  return {
    costValue: products.reduce((s, p) => s + p.stock * (p.cost ?? 0), 0),
    retailValue: products.reduce((s, p) => s + p.stock * p.price, 0),
    units: products.reduce((s, p) => s + p.stock, 0),
  };
}
