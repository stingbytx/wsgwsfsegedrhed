import type { SubscriptionPlan } from "@/types";

export const FREE_LIMITS = {
  products: 100,
  orders: 500,
  customers: 200,
  categories: 20,
  businessProfiles: 1,
};

export const PREMIUM_FEATURES = [
  "receipt_printing",
  "backup_restore",
  "unlimited_products",
  "unlimited_orders",
  "unlimited_customers",
  "unlimited_categories",
  "advanced_reports",
  "profit_analytics",
  "barcode_generation",
  "report_printing",
] as const;

export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

export function isPremiumPlan(plan: SubscriptionPlan): boolean {
  return plan === "ACTIVE" || plan === "TRIAL";
}

export function canUseFeature(plan: SubscriptionPlan): boolean {
  return isPremiumPlan(plan);
}

export function isOverLimit(plan: SubscriptionPlan, kind: keyof typeof FREE_LIMITS, count: number): boolean {
  if (isPremiumPlan(plan)) return false;
  return count >= FREE_LIMITS[kind];
}
