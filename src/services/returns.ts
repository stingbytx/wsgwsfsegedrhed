// ============================================================================
// Returns Engine — creates sales returns. Optionally restocks inventory via
// the Inventory Engine and records a RETURN movement. Does NOT mutate the
// legacy order/refund path in services/orders.ts; returns are a parallel
// record for tracking + reporting.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { SalesReturn, SalesReturnItem, ReturnReason } from "@/types/enterprise";
import { generateId, nowIso } from "@/lib/utils";
import { nextReturnNumber } from "./sequence";
import { recordMovements } from "./inventory";
import { logAudit } from "./audit";

export interface CreateReturnInput {
  orderId: string;
  orderNumber?: string;
  customerId?: string | null;
  items: { orderItemId: string; productId: string; name: string; sku: string; quantity: number; price: number; reason: ReturnReason }[];
  restock: boolean;
  notes?: string;
}

export async function createSalesReturn(db: PosDatabase, input: CreateReturnInput): Promise<SalesReturn> {
  const returnNumber = await nextReturnNumber(db);
  const items: SalesReturnItem[] = input.items.map((i) => ({
    id: generateId(),
    orderItemId: i.orderItemId,
    productId: i.productId,
    name: i.name,
    sku: i.sku,
    quantity: i.quantity,
    price: i.price,
    total: i.price * i.quantity,
    reason: i.reason,
  }));
  const total = items.reduce((s, i) => s + i.total, 0);
  const ret: SalesReturn = {
    id: generateId(),
    returnNumber,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    customerId: input.customerId ?? null,
    items,
    total,
    restock: input.restock,
    notes: input.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await db.transaction("rw", db.salesReturns, db.products, db.inventoryMovements, async () => {
    await db.salesReturns.add(ret);
    if (input.restock) {
      await recordMovements(
        db,
        items.map((i) => ({
          productId: i.productId,
          type: "RETURN",
          quantity: i.quantity,
          reason: `Return ${returnNumber}`,
          referenceId: ret.id,
          referenceType: "return",
        }))
      );
    }
  });

  await logAudit(db, { action: "RETURN", entity: "salesReturn", entityId: ret.id, newValue: { returnNumber, total } });
  return ret;
}

export async function listReturns(db: PosDatabase): Promise<SalesReturn[]> {
  const all = await db.salesReturns.toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
