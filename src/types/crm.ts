// ============================================================================
// CRM types — Customer Relationship Management extension. ADDITIVE: the
// existing Customer type in src/types/index.ts is unchanged. Extended fields
// live on the customer record via the CustomerCrmExtension cast; new entities
// get their own tables.
// ============================================================================

import type { ID } from "@/types";

// ─── Customer extension fields (written onto the existing customers table) ────
export type CustomerType = "RETAIL" | "WHOLESALE" | "B2B" | "B2C";
export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";
export type CreditStatus = "CREDIT" | "NO_CREDIT" | "BLACKLISTED";
export type CreditDays = 7 | 15 | 30 | 45 | 60 | 90;
export type CustomerTag =
  | "NEW" | "VIP" | "WHOLESALE" | "LOYAL" | "AT_RISK" | "CHURNED"
  | "FREQUENT_BUYER" | "SEASONAL" | "BIRTHDAY_MONTH";

export interface CustomerCrmExtension {
  code?: string;              // customer code
  type?: CustomerType;
  taxId?: string;
  vatNumber?: string;
  birthday?: string | null;   // ISO date
  companyName?: string;
  companyLogo?: string | null;
  city?: string;
  country?: string;
  website?: string;
  // VIP & loyalty
  isVip?: boolean;
  vipSince?: string | null;
  loyaltyCardNumber?: string;
  loyaltyTier?: LoyaltyTier;
  loyaltyPoints?: number;
  memberSince?: string | null;
  rewardsRedeemed?: number;
  // credit account
  creditStatus?: CreditStatus;
  creditLimit?: number;
  creditDays?: CreditDays;
  lastCreditPayment?: string | null;
  tags?: CustomerTag[];
}

// ─── Communication log ─────────────────────────────────────────────────────────
export type CommunicationType = "CALL" | "EMAIL" | "WHATSAPP" | "MEETING" | "NOTE";

export interface CommunicationLog {
  id: ID;
  customerId: ID;
  type: CommunicationType;
  subject?: string;
  notes?: string;
  outcome?: string;
  nextFollowUp?: string | null;
  createdAt: string;
}

// ─── Document vault ────────────────────────────────────────────────────────────
export type CustomerDocumentType =
  | "QUOTATION" | "INVOICE" | "CONTRACT" | "AGREEMENT" | "ID_PROOF" | "OTHER";

export interface CustomerDocument {
  id: ID;
  customerId: ID;
  name: string;
  type: CustomerDocumentType;
  date: string;
  file?: string | null; // data URL
  notes?: string;
  createdAt: string;
}

// ─── Groups & dynamic segments ─────────────────────────────────────────────────
export type SegmentRule =
  | "VIP" | "WHOLESALE" | "RETAIL" | "BIRTHDAY_MONTH" | "BLACKLISTED"
  | "HAS_OUTSTANDING" | "NEW_THIS_MONTH" | "TOP_CUSTOMERS" | "AT_RISK" | "CHURNED";

export interface CustomerGroup {
  id: ID;
  name: string;
  description?: string;
  isDynamic: boolean;
  rule?: SegmentRule;        // for dynamic segments
  memberIds?: ID[];          // for static groups
  createdAt: string;
}

// ─── Credit payments ───────────────────────────────────────────────────────────
export interface CreditPayment {
  id: ID;
  customerId: ID;
  orderId?: ID | null;
  amount: number;
  method: string;
  note?: string;
  date: string;
  createdAt: string;
}

// ─── Loyalty ledger ────────────────────────────────────────────────────────────
export type LoyaltyEntryType = "EARN" | "REDEEM" | "ADJUST" | "TIER_UPGRADE" | "TIER_DOWNGRADE";

export interface LoyaltyLedgerEntry {
  id: ID;
  customerId: ID;
  type: LoyaltyEntryType;
  points: number;            // signed: + earn, - redeem
  balanceAfter: number;
  reference?: string;
  createdAt: string;
}

// ─── RFM analytics ─────────────────────────────────────────────────────────────
export interface RfmScore {
  recency: number;       // days since last purchase
  frequency: number;     // number of orders
  monetary: number;      // total spent
  recencyScore: number;  // 1-5
  frequencyScore: number;
  monetaryScore: number;
  rfmScore: string;      // e.g. "545"
  segment: string;       // e.g. "Champions", "Loyal", "At Risk"
}

export interface CustomerAnalytics {
  totalPurchases: number;
  totalPaid: number;
  averageOrderValue: number;
  totalVisits: number;
  productsBought: number;
  categoriesBought: number;
  returnRate: number;
  lifetimeValue: number;  // CLV
  lastPurchaseDate?: string | null;
  favoriteCategory?: string;
  favoriteProducts: { name: string; qty: number }[];
  rfm: RfmScore;
}
