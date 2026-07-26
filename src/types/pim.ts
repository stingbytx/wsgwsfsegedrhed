// ============================================================================
// PIM (Product Information Management) + POS enterprise types — ADDITIVE.
// These extend the core Product type without modifying src/types/index.ts.
// New entities: variants, batches, brands, units, unit conversions, product
// suppliers, warehouse stock, product images, tags, price levels, promotions,
// shifts, cash drawer, product history.
// ============================================================================

import type { ID } from "@/types";

// ─── Brands ───────────────────────────────────────────────────────────────────
export interface Brand {
  id: ID;
  name: string;
  logo?: string | null;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

// ─── Units & Conversions ────────────────────────────────────────────────────────
export interface Unit {
  id: ID;
  name: string; // e.g. "Box"
  symbol: string; // e.g. "box"
  baseUnitId?: ID | null; // if this is a derived unit, points to base (Piece)
  factor: number; // 1 unit = factor base units
  isCustom?: boolean;
  createdAt: string;
}

// ─── Product Variants ────────────────────────────────────────────────────────────
export type VariantAxis = "SIZE" | "COLOR" | "MODEL" | "STORAGE" | "RAM" | "FLAVOR" | "CAPACITY" | "OTHER";

export interface ProductVariant {
  id: ID;
  productId: ID;
  axis: VariantAxis;
  value: string; // e.g. "Red", "XL"
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  stock: number;
  image?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Batches ───────────────────────────────────────────────────────────────────
export type ExpiryStatus = "NORMAL" | "EXPIRING_SOON" | "EXPIRED";

export interface Batch {
  id: ID;
  productId: ID;
  batchNumber: string;
  supplierId?: ID | null;
  purchaseDate: string;
  expiryDate?: string | null;
  cost: number;
  quantity: number; // remaining
  warehouseId?: ID | null;
  createdAt: string;
}

// ─── Product Suppliers ─────────────────────────────────────────────────────────
export interface ProductSupplier {
  id: ID;
  productId: ID;
  supplierId: ID;
  lastPurchasePrice: number;
  deliveryTimeDays?: number;
  minimumOrderQuantity?: number;
  isPreferred: boolean;
  createdAt: string;
}

// ─── Warehouse Stock ────────────────────────────────────────────────────────────
export interface WarehouseStock {
  id: ID;
  productId: ID;
  warehouseId: ID;
  stock: number;
  reservedStock: number;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  updatedAt: string;
}

// ─── Product Images ────────────────────────────────────────────────────────────
export interface ProductImage {
  id: ID;
  productId: ID;
  url: string; // data URL
  isMain: boolean;
  order: number;
  createdAt: string;
}

// ─── Tags ──────────────────────────────────────────────────────────────────────
export type ProductTag =
  | "NEW" | "BEST_SELLER" | "SEASONAL" | "FEATURED" | "PROMOTION"
  | "CLEARANCE" | "DISCONTINUED";

// ─── Reorder settings (stored on product via extension) ──────────────────────────
export interface ReorderSettings {
  minStock: number;
  maxStock: number;
  safetyStock: number;
  economicOrderQuantity: number;
  preferredReorderQuantity: number;
}

// ─── Price Levels ────────────────────────────────────────────────────────────────
export type PriceLevelKind = "RETAIL" | "WHOLESALE" | "DEALER" | "VIP" | "EMPLOYEE" | "SPECIAL";

export interface PriceLevel {
  id: ID;
  productId: ID;
  kind: PriceLevelKind;
  price: number;
  isActive: boolean;
  createdAt: string;
}

// ─── Promotions ──────────────────────────────────────────────────────────────────
export type PromotionType =
  | "BUY_X_GET_Y" | "PERCENT" | "FIXED" | "BUNDLE"
  | "HAPPY_HOUR" | "WEEKEND" | "FESTIVAL" | "LOYALTY";

export interface Promotion {
  id: ID;
  name: string;
  type: PromotionType;
  value: number; // percent or amount
  buyQty?: number; // for BOGO
  freeQty?: number; // for BOGO
  productIds?: ID[]; // applicable products (empty = all)
  categoryIds?: ID[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Related Products ────────────────────────────────────────────────────────────
export interface RelatedProduct {
  id: ID;
  productId: ID;
  relatedProductId: ID;
  relation: "CROSS_SELL" | "UP_SELL" | "ACCESSORY" | "ALTERNATIVE";
}

// ─── Product History / Timeline ──────────────────────────────────────────────────
export type ProductHistoryAction =
  | "CREATED" | "EDITED" | "PRICE_CHANGE" | "STOCK_CHANGE" | "SUPPLIER_CHANGE"
  | "CATEGORY_CHANGE" | "RETURN" | "SALE" | "PURCHASE" | "ADJUSTMENT"
  | "TRANSFER" | "ARCHIVED" | "ACTIVATED" | "DEACTIVATED";

export interface ProductHistoryEntry {
  id: ID;
  productId: ID;
  action: ProductHistoryAction;
  user?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  meta?: Record<string, unknown>;
  createdAt: string;
}

// ─── Shifts ──────────────────────────────────────────────────────────────────────
export interface Shift {
  id: ID;
  cashierId?: ID | null;
  cashierName?: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  difference?: number;
  salesTotal: number;
  refundsTotal: number;
  expensesTotal: number;
  invoiceCount: number;
  status: "OPEN" | "CLOSED";
  startedAt: string;
  closedAt?: string | null;
  notes?: string;
}

// ─── Cash Drawer ─────────────────────────────────────────────────────────────────
export interface CashDrawerEntry {
  id: ID;
  type: "OPEN" | "CASH_IN" | "CASH_OUT" | "SALE" | "REFUND" | "EXPENSE" | "CLOSE";
  amount: number;
  note?: string;
  shiftId?: ID | null;
  user?: string | null;
  createdAt: string;
}

// ─── Product extension (optional fields the PIM reads/writes; kept on the
//     existing Product record via cast so the core type is unchanged) ────────────
export interface ProductPimExtension {
  brandId?: ID | null;
  description?: string;
  wholesalePrice?: number;
  dealerPrice?: number;
  specialPrice?: number;
  discountPercent?: number;
  unitId?: ID | null;
  baseUnitId?: ID | null;
  unitFactor?: number;
  taxInclusive?: boolean;
  taxPercent?: number;
  tags?: ProductTag[];
  status?: "ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED" | "DISCONTINUED";
  reorder?: ReorderSettings;
  gallery?: string[]; // image data URLs (lightweight; full images in ProductImage)
  thumbnail?: string | null;
}
