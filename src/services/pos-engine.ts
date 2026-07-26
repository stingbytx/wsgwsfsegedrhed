// ============================================================================
// POS Engine — enterprise billing calculations. Extends (does NOT modify)
// the legacy services/orders.ts `completeSale`/`computeOrderTotals`.
//
// Provides: promotion application, price-level switching, tax inclusive/
// exclusive breakdown, split bill, multi-payment + change calculation, and
// validation. The existing cart-store + orders.ts continue to work; this
// engine is used by new POS features and the enhanced checkout flow.
// ============================================================================

import type { Promotion } from "@/types/pim";
import type { PriceLevelKind } from "@/types/pim";
import type { OrderItem, DiscountType, Payment } from "@/types";

// ─── Price level resolution ────────────────────────────────────────────────────────

export function customerPriceLevel(customerType?: string): PriceLevelKind | null {
  switch ((customerType ?? "").toUpperCase()) {
    case "WHOLESALE": return "WHOLESALE";
    case "DEALER": return "DEALER";
    case "VIP": return "VIP";
    case "EMPLOYEE": return "EMPLOYEE";
    default: return null;
  }
}

// ─── Tax breakdown (inclusive / exclusive) ──────────────────────────────────────────

export interface TaxBreakdown {
  taxPerItem: number;
  totalTax: number;
  taxableAmount: number;
  netAmount: number;
}

export function computeTaxForItem(item: { price: number; quantity: number; taxPercent?: number; taxInclusive?: boolean }): TaxBreakdown {
  const gross = item.price * item.quantity;
  const rate = item.taxPercent ?? 0;
  if (rate <= 0) return { taxPerItem: 0, totalTax: 0, taxableAmount: gross, netAmount: gross };
  if (item.taxInclusive) {
    const net = gross / (1 + rate / 100);
    const tax = gross - net;
    return { taxPerItem: tax / item.quantity, totalTax: tax, taxableAmount: net, netAmount: net };
  }
  const tax = gross * (rate / 100);
  return { taxPerItem: tax / item.quantity, totalTax: tax, taxableAmount: gross, netAmount: gross };
}

// ─── Promotions ───────────────────────────────────────────────────────────────────────

export interface AppliedPromotion {
  promotionId: string;
  name: string;
  discount: number;
  freeItems: number;
}

/** Evaluate applicable promotions against a cart. Returns discounts + free items. */
export function evaluatePromotions(items: OrderItem[], promotions: Promotion[]): { totalDiscount: number; applied: AppliedPromotion[]; freeItems: number } {
  const now = new Date().toISOString();
  const active = promotions.filter((p) => p.isActive && p.startDate <= now && p.endDate >= now);
  const applied: AppliedPromotion[] = [];
  let totalDiscount = 0;
  let freeItems = 0;

  for (const promo of active) {
    const applicable = items.filter((i) => !promo.productIds?.length || promo.productIds?.includes(i.productId));
    if (promo.type === "PERCENT") {
      const sub = applicable.reduce((s, i) => s + i.price * i.quantity, 0);
      const d = sub * (promo.value / 100);
      if (d > 0) { totalDiscount += d; applied.push({ promotionId: promo.id, name: promo.name, discount: d, freeItems: 0 }); }
    } else if (promo.type === "FIXED") {
      totalDiscount += promo.value;
      applied.push({ promotionId: promo.id, name: promo.name, discount: promo.value, freeItems: 0 });
    } else if (promo.type === "BUY_X_GET_Y") {
      const totalQty = applicable.reduce((s, i) => s + i.quantity, 0);
      const buy = promo.buyQty ?? 1;
      const free = promo.freeQty ?? 1;
      const sets = Math.floor(totalQty / buy);
      const freeCount = sets * free;
      const avgPrice = applicable.length ? applicable.reduce((s, i) => s + i.price, 0) / applicable.length : 0;
      const d = freeCount * avgPrice;
      if (d > 0) { totalDiscount += d; freeItems += freeCount; applied.push({ promotionId: promo.id, name: promo.name, discount: d, freeItems: freeCount }); }
    } else if (promo.type === "HAPPY_HOUR" || promo.type === "WEEKEND" || promo.type === "FESTIVAL" || promo.type === "LOYALTY") {
      const sub = applicable.reduce((s, i) => s + i.price * i.quantity, 0);
      const d = sub * (promo.value / 100);
      if (d > 0) { totalDiscount += d; applied.push({ promotionId: promo.id, name: promo.name, discount: d, freeItems: 0 }); }
    }
  }
  return { totalDiscount, applied, freeItems };
}

// ─── Cart totals (enterprise) ────────────────────────────────────────────────────────

export interface CartTotals {
  subtotal: number;
  itemDiscounts: number;
  orderDiscount: number;
  promotionDiscount: number;
  taxableAmount: number;
  taxTotal: number;
  grandTotal: number;
}

export function computeCartTotals(
  items: OrderItem[],
  orderDiscount: { type: DiscountType; value: number } | null,
  promotions: Promotion[] = []
): CartTotals {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemDiscounts = items.reduce((s, i) => s + (i.discount ? (i.discount.type === "PERCENT" ? i.price * i.quantity * (i.discount.value / 100) : i.discount.value) : 0), 0);
  const promo = evaluatePromotions(items, promotions);
  let total = subtotal - itemDiscounts - promo.totalDiscount;
  if (orderDiscount) total -= orderDiscount.type === "PERCENT" ? total * (orderDiscount.value / 100) : orderDiscount.value;
  total = Math.max(0, total);
  const taxTotal = items.reduce((s, i) => s + computeTaxForItem({ price: i.price, quantity: i.quantity, taxPercent: i.taxRate, taxInclusive: false }).totalTax, 0);
  return {
    subtotal, itemDiscounts, orderDiscount: orderDiscount ? (orderDiscount.type === "PERCENT" ? subtotal * (orderDiscount.value / 100) : orderDiscount.value) : 0,
    promotionDiscount: promo.totalDiscount, taxableAmount: total, taxTotal, grandTotal: total + taxTotal,
  };
}

// ─── Split bill ────────────────────────────────────────────────────────────────────────

export interface SplitShare {
  items: OrderItem[];
  total: number;
  label: string;
}

/** Split a cart evenly by N shares. */
export function splitEvenly(items: OrderItem[], shares: number): SplitShare[] {
  const total = items.reduce((s, i) => s + i.total, 0);
  const perShare = total / shares;
  return Array.from({ length: shares }, (_, i) => ({ items: [], total: perShare, label: `Share ${i + 1}` }));
}

/** Split by assigning specific items to each share. */
export function splitByItems(assignments: { items: OrderItem[]; label: string }[]): SplitShare[] {
  return assignments.map((a) => ({ items: a.items, total: a.items.reduce((s, i) => s + i.total, 0), label: a.label }));
}

// ─── Payment & change ─────────────────────────────────────────────────────────────────

export interface PaymentResult {
  paid: number;
  balanceDue: number;
  change: number;
  isFullyPaid: boolean;
}

export function applyPayments(total: number, payments: Payment[]): PaymentResult {
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = Math.max(0, total - paid);
  const change = Math.max(0, paid - total);
  return { paid, balanceDue, change, isFullyPaid: paid >= total };
}

// ─── Validation ───────────────────────────────────────────────────────────────────────

export interface PosValidationIssue {
  field: string;
  message: string;
}

export function validateSale(input: {
  items: OrderItem[];
  payments: Payment[];
  allowNegativeStock?: boolean;
  allowCredit?: boolean;
  total: number;
}): PosValidationIssue[] {
  const issues: PosValidationIssue[] = [];
  if (input.items.length === 0) issues.push({ field: "items", message: "Cart is empty" });
  for (const i of input.items) {
    if (i.quantity <= 0) issues.push({ field: "quantity", message: `Negative/zero quantity for ${i.name}` });
    if (i.price < 0) issues.push({ field: "price", message: `Negative price for ${i.name}` });
  }
  const paid = input.payments.reduce((s, p) => s + p.amount, 0);
  const hasCredit = input.payments.some((p) => p.method === "CREDIT");
  if (paid < input.total && !input.allowCredit && !hasCredit) {
    issues.push({ field: "payment", message: "Payment is less than the total" });
  }
  for (const p of input.payments) {
    if (p.amount < 0) issues.push({ field: "payment", message: "Negative payment amount" });
  }
  return issues;
}

// ─── Invoice numbering ──────────────────────────────────────────────────────────────────

/** Generate a sequential-style invoice number: INV-YYYYMMDD-NNNNNN.
 *  Collision-free in single-user offline use; for multi-user, the sequence
 *  service + a unique constraint (on migration) handles it. */
export function generateInvoiceNumber(seq = 1): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `INV-${stamp}-${String(seq).padStart(6, "0")}`;
}
