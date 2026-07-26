// ============================================================================
// Loyalty Engine — points earn/redeem, tier auto-upgrade, birthday discount.
// Additive; uses the customers table (loyaltyPoints/tier via CRM extension)
// + the loyaltyLedger table for an auditable ledger.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { Customer } from "@/types";
import type { CustomerCrmExtension, LoyaltyTier, LoyaltyLedgerEntry, LoyaltyEntryType } from "@/types/crm";
import { generateId, nowIso } from "@/lib/utils";
import { logAudit } from "./audit";

type CrmCustomer = Customer & Partial<CustomerCrmExtension>;

export const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  BRONZE: 0,
  SILVER: 1000,
  GOLD: 5000,
  PLATINUM: 10000,
  DIAMOND: 100000,
};

export const TIER_BENEFITS: Record<LoyaltyTier, { discountPct: number; freeShipping: boolean; prioritySupport: boolean; label: string }> = {
  BRONZE:   { discountPct: 1, freeShipping: false, prioritySupport: false, label: "Bronze" },
  SILVER:   { discountPct: 2, freeShipping: false, prioritySupport: false, label: "Silver" },
  GOLD:     { discountPct: 3, freeShipping: true,  prioritySupport: false, label: "Gold" },
  PLATINUM: { discountPct: 5, freeShipping: true,  prioritySupport: true,  label: "Platinum" },
  DIAMOND:  { discountPct: 8, freeShipping: true,  prioritySupport: true,  label: "Diamond" },
};

export const DEFAULT_EARN_RATE = 1;   // 1 point per 1 currency unit spent
export const DEFAULT_REDEEM_RATE = 0.5; // 1 point = 0.5 currency unit discount

export function tierForPoints(points: number): LoyaltyTier {
  if (points >= TIER_THRESHOLDS.DIAMOND) return "DIAMOND";
  if (points >= TIER_THRESHOLDS.PLATINUM) return "PLATINUM";
  if (points >= TIER_THRESHOLDS.GOLD) return "GOLD";
  if (points >= TIER_THRESHOLDS.SILVER) return "SILVER";
  return "BRONZE";
}

export function tierDiscountPct(tier: LoyaltyTier | undefined): number {
  return tier ? TIER_BENEFITS[tier].discountPct : 0;
}

/** Birthday discount eligible if birthday falls in the current month. */
export function birthdayDiscountEligible(birthday?: string | null): boolean {
  if (!birthday) return false;
  return new Date(birthday).getMonth() === new Date().getMonth();
}

export const BIRTHDAY_DISCOUNT_PCT = 5;

/** Total POS discount % for a customer: tier + birthday (stackable). */
export function customerLoyaltyDiscount(c: CrmCustomer): { tierPct: number; birthdayPct: number; totalPct: number } {
  const tierPct = tierDiscountPct(c.loyaltyTier);
  const birthdayPct = birthdayDiscountEligible(c.birthday) ? BIRTHDAY_DISCOUNT_PCT : 0;
  return { tierPct, birthdayPct, totalPct: tierPct + birthdayPct };
}

async function ledger(db: PosDatabase, customerId: string, type: LoyaltyEntryType, points: number, balanceAfter: number, reference?: string): Promise<void> {
  const entry: LoyaltyLedgerEntry = { id: generateId(), customerId, type, points, balanceAfter, reference, createdAt: nowIso() };
  await db.loyaltyLedger.add(entry);
}

/** Earn points on a completed sale + auto-upgrade tier. */
export async function earnPoints(db: PosDatabase, customerId: string, amountSpent: number, reference?: string): Promise<void> {
  const c = await db.customers.get(customerId) as CrmCustomer | undefined;
  if (!c) return;
  const earned = Math.floor(amountSpent * DEFAULT_EARN_RATE);
  if (earned <= 0) return;
  const current = c.loyaltyPoints ?? 0;
  const next = current + earned;
  const oldTier = c.loyaltyTier ?? "BRONZE";
  const newTier = tierForPoints(next);
  await db.customers.update(customerId, { loyaltyPoints: next, loyaltyTier: newTier, updatedAt: nowIso() } as Partial<Customer>);
  await ledger(db, customerId, "EARN", earned, next, reference);
  if (newTier !== oldTier) {
    const upgraded = TIER_THRESHOLDS[newTier] > TIER_THRESHOLDS[oldTier];
    await ledger(db, customerId, upgraded ? "TIER_UPGRADE" : "TIER_DOWNGRADE", 0, next, `${oldTier}->${newTier}`);
    await logAudit(db, { action: "EDIT", entity: "customer", entityId: customerId, newValue: { loyaltyTier: newTier, points: next } });
  }
}

/** Redeem points for a discount at POS. Returns the currency discount value. */
export async function redeemPoints(db: PosDatabase, customerId: string, pointsToRedeem: number): Promise<{ discount: number; pointsRedeemed: number }> {
  const c = await db.customers.get(customerId) as CrmCustomer | undefined;
  if (!c) return { discount: 0, pointsRedeemed: 0 };
  const current = c.loyaltyPoints ?? 0;
  const redeem = Math.min(Math.max(0, pointsToRedeem), current);
  if (redeem <= 0) return { discount: 0, pointsRedeemed: 0 };
  const discount = redeem * DEFAULT_REDEEM_RATE;
  const next = current - redeem;
  await db.customers.update(customerId, { loyaltyPoints: next, rewardsRedeemed: (c.rewardsRedeemed ?? 0) + redeem, updatedAt: nowIso() } as Partial<Customer>);
  await ledger(db, customerId, "REDEEM", -redeem, next, `Redeem ${redeem}pts`);
  return { discount, pointsRedeemed: redeem };
}

/** Recompute and persist the tier for all customers (maintenance). */
export async function recomputeAllTiers(db: PosDatabase): Promise<void> {
  const customers = await db.customers.toArray();
  for (const c of customers) {
    const cc = c as CrmCustomer;
    const tier = tierForPoints(cc.loyaltyPoints ?? 0);
    if (tier !== (cc.loyaltyTier ?? "BRONZE")) {
      await db.customers.update(c.id, { loyaltyTier: tier } as Partial<Customer>);
    }
  }
}

export async function getLoyaltyLedger(db: PosDatabase, customerId: string): Promise<LoyaltyLedgerEntry[]> {
  const all = await db.loyaltyLedger.where("customerId").equals(customerId).toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
