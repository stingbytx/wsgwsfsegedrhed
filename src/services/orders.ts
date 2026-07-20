import type { PosDatabase } from "@/lib/db";
import type { Order, OrderItem, Payment, DiscountType, CreditSale } from "@/types";
import { generateId, generateOrderNumber, nowIso } from "@/lib/utils";

interface CompleteSaleInput {
  items: OrderItem[];
  customerId: string | null;
  orderDiscount: { type: DiscountType; value: number } | null;
  payments: Payment[];
  notes?: string;
  dueDate?: string | null;
}

export function computeOrderTotals(items: OrderItem[], orderDiscount: { type: DiscountType; value: number } | null) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxTotal = items.reduce((s, i) => {
    const base = i.price * i.quantity - (i.discount ? (i.discount.type === "PERCENT" ? (i.price * i.quantity * i.discount.value) / 100 : i.discount.value) : 0);
    return s + (i.taxRate ? (base * i.taxRate) / 100 : 0);
  }, 0);
  let total = items.reduce((s, i) => s + i.total, 0);
  if (orderDiscount) {
    total -= orderDiscount.type === "PERCENT" ? total * (orderDiscount.value / 100) : orderDiscount.value;
  }
  total = Math.max(0, total);
  return { subtotal, taxTotal, total };
}

/** Completes a sale: writes the order, decrements stock, logs inventory movements,
 *  and creates a credit-sale record if the customer owes a balance. All local. */
export async function completeSale(db: PosDatabase, input: CompleteSaleInput): Promise<Order> {
  const { subtotal, taxTotal, total } = computeOrderTotals(input.items, input.orderDiscount);
  const amountPaid = input.payments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = Math.max(0, total - amountPaid);

  const order: Order = {
    id: generateId(),
    orderNumber: generateOrderNumber(),
    customerId: input.customerId,
    items: input.items,
    subtotal,
    discount: input.orderDiscount ?? undefined,
    taxTotal,
    total,
    payments: input.payments,
    amountPaid,
    balanceDue,
    status: "COMPLETED",
    notes: input.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await db.transaction("rw", db.orders, db.products, db.inventoryMovements, db.creditSales, db.customers, async () => {
    await db.orders.add(order);

    for (const item of order.items) {
      const product = await db.products.get(item.productId);
      if (product) {
        await db.products.update(product.id, { stock: Math.max(0, product.stock - item.quantity), updatedAt: nowIso() });
      }
      await db.inventoryMovements.add({
        id: generateId(),
        productId: item.productId,
        type: "SALE",
        quantity: -item.quantity,
        createdAt: nowIso(),
      });
    }

    if (balanceDue > 0 && input.customerId) {
      const creditSale: CreditSale = {
        id: generateId(),
        orderId: order.id,
        customerId: input.customerId,
        totalAmount: total,
        amountPaid,
        remainingBalance: balanceDue,
        dueDate: input.dueDate ?? null,
        paymentHistory: amountPaid > 0 ? [{ amount: amountPaid, date: nowIso() }] : [],
        status: amountPaid > 0 ? "PARTIAL" : "OPEN",
        createdAt: nowIso(),
      };
      await db.creditSales.add(creditSale);

      const customer = await db.customers.get(input.customerId);
      if (customer) {
        await db.customers.update(customer.id, {
          creditBalance: customer.creditBalance + balanceDue,
          updatedAt: nowIso(),
        });
      }
    }
  });

  return order;
}

export async function holdOrder(db: PosDatabase, items: OrderItem[], customerId: string | null, label?: string) {
  await db.heldOrders.add({
    id: generateId(),
    label,
    items,
    customerId,
    createdAt: nowIso(),
  });
}

export async function refundOrder(db: PosDatabase, orderId: string, restock = true) {
  const order = await db.orders.get(orderId);
  if (!order) return;

  await db.transaction("rw", db.orders, db.products, db.inventoryMovements, async () => {
    await db.orders.update(orderId, { status: "REFUNDED", updatedAt: nowIso() });
    if (restock) {
      for (const item of order.items) {
        const product = await db.products.get(item.productId);
        if (product) {
          await db.products.update(product.id, { stock: product.stock + item.quantity, updatedAt: nowIso() });
        }
        await db.inventoryMovements.add({
          id: generateId(),
          productId: item.productId,
          type: "RETURN",
          quantity: item.quantity,
          createdAt: nowIso(),
        });
      }
    }
  });
}
