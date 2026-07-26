// ============================================================================
// PIM Service — Product Information Management engine. Extends the existing
// Product module WITHOUT modifying services/orders.ts or the inventory page.
//
// Reads/writes the legacy `products` table (so the existing inventory page,
// POS, and orders keep working) plus the new PIM tables (variants, batches,
// brands, units, productSuppliers, warehouseStock, productImages, priceLevels,
// relatedProducts, productHistory). The optional PIM fields live on the
// Product record via the ProductPimExtension cast (no core type change).
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { Product } from "@/types";
import type {
  Brand, Unit, ProductVariant, Batch, ProductSupplier, WarehouseStock,
  ProductImage, PriceLevel, Promotion, RelatedProduct, ProductHistoryEntry,
  ProductPimExtension, ExpiryStatus,
} from "@/types/pim";
import { generateId, nowIso } from "@/lib/utils";
import { logAudit } from "./audit";

// Merge helper: treat a Product as carrying the optional PIM extension.
type PimProduct = Product & Partial<ProductPimExtension>;

// ─── Product CRUD (additive — uses the same products table) ──────────────────────

export async function createProduct(db: PosDatabase, p: PimProduct): Promise<Product> {
  await db.products.add(p as Product);
  await logProductHistory(db, p.id, "CREATED", null, p);
  await logAudit(db, { action: "CREATE", entity: "product", entityId: p.id, newValue: p });
  return p;
}

export async function updateProduct(db: PosDatabase, id: string, patch: Partial<PimProduct>, ctx?: { user?: string }): Promise<void> {
  const existing = await db.products.get(id);
  if (!existing) throw new Error("Product not found");
  const next = { ...existing, ...patch, updatedAt: nowIso() };
  await db.products.put(next);
  // Detect price/stock/supplier/category changes for history
  if (patch.price !== undefined && patch.price !== existing.price) await logProductHistory(db, id, "PRICE_CHANGE", existing.price, patch.price, ctx);
  if (patch.stock !== undefined && patch.stock !== existing.stock) await logProductHistory(db, id, "STOCK_CHANGE", existing.stock, patch.stock, ctx);
  if (patch.categoryId !== undefined && patch.categoryId !== existing.categoryId) await logProductHistory(db, id, "CATEGORY_CHANGE", existing.categoryId, patch.categoryId, ctx);
  await logProductHistory(db, id, "EDITED", existing, next, ctx);
  await logAudit(db, { action: "EDIT", entity: "product", entityId: id, oldValue: existing, newValue: next });
}

export async function duplicateProduct(db: PosDatabase, id: string): Promise<Product | null> {
  const src = await db.products.get(id);
  if (!src) return null;
  const copy: PimProduct = {
    ...src,
    id: generateId(),
    name: `${src.name} (Copy)`,
    sku: `${src.sku}-COPY`,
    barcode: undefined,
    stock: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.products.add(copy as Product);
  await logProductHistory(db, copy.id, "CREATED", null, copy);
  return copy as Product;
}

export async function archiveProduct(db: PosDatabase, id: string, ctx?: { user?: string }): Promise<void> {
  await updateProduct(db, id, { status: "ARCHIVED", isActive: false } as Partial<PimProduct>, ctx);
  await logProductHistory(db, id, "ARCHIVED", null, null, ctx);
}

export async function setProductStatus(db: PosDatabase, id: string, status: ProductPimExtension["status"], ctx?: { user?: string }): Promise<void> {
  const isActive = status === "ACTIVE";
  await updateProduct(db, id, { status, isActive } as Partial<PimProduct>, ctx);
  await logProductHistory(db, id, isActive ? "ACTIVATED" : "DEACTIVATED", null, status, ctx);
}

// ─── Validation ────────────────────────────────────────────────────────────────────

export async function validateProduct(db: PosDatabase, p: Partial<PimProduct>, excludeId?: string): Promise<string[]> {
  const errs: string[] = [];
  if (!p.name?.trim()) errs.push("Product name is required");
  if (p.price !== undefined && p.price < 0) errs.push("Selling price cannot be negative");
  if (p.cost !== undefined && p.cost < 0) errs.push("Cost price cannot be negative");
  if (p.stock !== undefined && p.stock < 0) errs.push("Stock cannot be negative");
  if (p.sku) {
    const dup = await db.products.where("sku").equals(p.sku).toArray();
    if (dup.some((x) => x.id !== excludeId)) errs.push("Duplicate SKU");
  }
  if (p.barcode) {
    const dup = await db.products.where("barcode").equals(p.barcode).toArray();
    if (dup.some((x) => x.id !== excludeId)) errs.push("Duplicate barcode");
  }
  return errs;
}

// ─── Pricing calculations ────────────────────────────────────────────────────────

export function profitMargin(selling: number, cost: number): number {
  if (selling <= 0) return 0;
  return ((selling - cost) / selling) * 100;
}

export function productProfit(p: Pick<Product, "price" | "cost">): number {
  return (p.price ?? 0) - (p.cost ?? 0);
}

// ─── Stock valuation ────────────────────────────────────────────────────────────────

export interface StockValuation {
  inventoryValue: number; // stock × cost
  sellingValue: number; // stock × price
  potentialProfit: number; // sellingValue − inventoryValue
}

export async function getStockValuation(db: PosDatabase): Promise<StockValuation> {
  const products = await db.products.toArray();
  const inventoryValue = products.reduce((s, p) => s + p.stock * (p.cost ?? 0), 0);
  const sellingValue = products.reduce((s, p) => s + p.stock * p.price, 0);
  return { inventoryValue, sellingValue, potentialProfit: sellingValue - inventoryValue };
}

export async function getProductValuation(db: PosDatabase, id: string): Promise<StockValuation> {
  const p = await db.products.get(id);
  if (!p) return { inventoryValue: 0, sellingValue: 0, potentialProfit: 0 };
  return {
    inventoryValue: p.stock * (p.cost ?? 0),
    sellingValue: p.stock * p.price,
    potentialProfit: p.stock * (p.price - (p.cost ?? 0)),
  };
}

// ─── Reorder recommendations ─────────────────────────────────────────────────────

export interface ReorderRecommendation {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  reorderLevel: number;
  preferredReorderQuantity: number;
  supplierName?: string;
}

export async function getReorderRecommendations(db: PosDatabase): Promise<ReorderRecommendation[]> {
  const [products, productSuppliers, suppliers] = await Promise.all([
    db.products.toArray(), db.productSuppliers.toArray(), db.suppliers.toArray(),
  ]);
  const recs: ReorderRecommendation[] = [];
  for (const p of products) {
    const ext = p as PimProduct;
    const reorder = ext.reorder;
    const min = reorder?.minStock ?? p.lowStockThreshold ?? 5;
    const reorderLevel = reorder ? reorder.safetyStock : min;
    if (p.stock <= reorderLevel) {
      const pref = productSuppliers.find((ps) => ps.productId === p.id && ps.isPreferred) ?? productSuppliers.find((ps) => ps.productId === p.id);
      const supplierName = pref ? suppliers.find((s) => s.id === pref.supplierId)?.name : undefined;
      recs.push({
        productId: p.id, name: p.name, sku: p.sku, stock: p.stock,
        reorderLevel, preferredReorderQuantity: reorder?.preferredReorderQuantity ?? Math.max(10, reorderLevel * 2),
        supplierName,
      });
    }
  }
  return recs.sort((a, b) => a.stock - b.stock);
}

// ─── Expiry management ─────────────────────────────────────────────────────────────

export function expiryStatus(dateStr?: string | null): ExpiryStatus {
  if (!dateStr) return "NORMAL";
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return "EXPIRED";
  if (days <= 30) return "EXPIRING_SOON";
  return "NORMAL";
}

export function expiryDays(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export async function getExpiryAlerts(db: PosDatabase, withinDays = 30): Promise<{ product: Product; batch?: Batch; days: number; status: ExpiryStatus }[]> {
  const out: { product: Product; batch?: Batch; days: number; status: ExpiryStatus }[] = [];
  const products = await db.products.toArray();
  for (const p of products) {
    if (p.expirationDate) {
      const days = expiryDays(p.expirationDate);
      if (days !== null && days <= withinDays) {
        out.push({ product: p, days, status: expiryStatus(p.expirationDate) });
      }
    }
  }
  const batches = await db.batches.toArray();
  for (const b of batches) {
    if (b.expiryDate) {
      const days = expiryDays(b.expiryDate);
      if (days !== null && days <= withinDays) {
        const product = products.find((p) => p.id === b.productId);
        if (product) out.push({ product, batch: b, days, status: expiryStatus(b.expiryDate) });
      }
    }
  }
  return out.sort((a, b) => a.days - b.days);
}

// ─── Variants ────────────────────────────────────────────────────────────────────────

export async function listVariants(db: PosDatabase, productId: string): Promise<ProductVariant[]> {
  return db.variants.where("productId").equals(productId).toArray();
}

export async function saveVariant(db: PosDatabase, v: ProductVariant): Promise<void> {
  await db.variants.put(v);
  await logProductHistory(db, v.productId, "EDITED", null, { variant: v });
}

export async function deleteVariant(db: PosDatabase, id: string): Promise<void> {
  await db.variants.delete(id);
}

// ─── Batches (FIFO) ─────────────────────────────────────────────────────────────────

export async function listBatches(db: PosDatabase, productId: string): Promise<Batch[]> {
  const all = await db.batches.where("productId").equals(productId).toArray();
  return all.sort((a, b) => (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999"));
}

/** Reduce stock from oldest-expiring batches first (FIFO). Returns qty consumed. */
export async function consumeBatchesFifo(db: PosDatabase, productId: string, qty: number): Promise<number> {
  const batches = await listBatches(db, productId);
  let remaining = qty;
  await db.transaction("rw", db.batches, async () => {
    for (const b of batches) {
      if (remaining <= 0) break;
      if (b.quantity <= 0) continue;
      const take = Math.min(b.quantity, remaining);
      await db.batches.update(b.id, { quantity: b.quantity - take });
      remaining -= take;
    }
  });
  return qty - remaining;
}

export async function addBatch(db: PosDatabase, b: Omit<Batch, "id" | "createdAt">): Promise<Batch> {
  const batch: Batch = { ...b, id: generateId(), createdAt: nowIso() };
  await db.batches.add(batch);
  await logProductHistory(db, b.productId, "PURCHASE", null, { batch });
  return batch;
}

// ─── Brands ───────────────────────────────────────────────────────────────────────────

export async function listBrands(db: PosDatabase): Promise<Brand[]> {
  return db.brands.toArray();
}

export async function saveBrand(db: PosDatabase, b: Brand): Promise<void> {
  await db.brands.put(b);
}

export async function deleteBrand(db: PosDatabase, id: string): Promise<void> {
  await db.brands.delete(id);
}

// ─── Units ───────────────────────────────────────────────────────────────────────────

export async function listUnits(db: PosDatabase): Promise<Unit[]> {
  return db.units.toArray();
}

export async function saveUnit(db: PosDatabase, u: Unit): Promise<void> {
  await db.units.put(u);
}

/** Convert a quantity in `fromUnit` to `toUnit` using each unit's factor to base. */
export function convertUnits(qty: number, fromUnit: Unit, toUnit: Unit): number {
  const fromBase = qty * fromUnit.factor;
  return fromBase / toUnit.factor;
}

// ─── Product suppliers ───────────────────────────────────────────────────────────────

export async function listProductSuppliers(db: PosDatabase, productId: string): Promise<ProductSupplier[]> {
  return db.productSuppliers.where("productId").equals(productId).toArray();
}

export async function saveProductSupplier(db: PosDatabase, ps: ProductSupplier): Promise<void> {
  // enforce single preferred
  if (ps.isPreferred) {
    const existing = await db.productSuppliers.where("productId").equals(ps.productId).toArray();
    for (const e of existing) if (e.id !== ps.id && e.isPreferred) await db.productSuppliers.update(e.id, { isPreferred: false });
  }
  await db.productSuppliers.put(ps);
}

// ─── Warehouse stock ───────────────────────────────────────────────────────────────

export async function getWarehouseStock(db: PosDatabase, productId: string): Promise<WarehouseStock[]> {
  return db.warehouseStock.where("productId").equals(productId).toArray();
}

export async function saveWarehouseStock(db: PosDatabase, ws: WarehouseStock): Promise<void> {
  await db.warehouseStock.put({ ...ws, updatedAt: nowIso() });
}

// ─── Product images ─────────────────────────────────────────────────────────────────

export async function listProductImages(db: PosDatabase, productId: string): Promise<ProductImage[]> {
  const all = await db.productImages.where("productId").equals(productId).toArray();
  return all.sort((a, b) => a.order - b.order);
}

export async function addProductImage(db: PosDatabase, img: Omit<ProductImage, "id" | "createdAt">): Promise<ProductImage> {
  const row: ProductImage = { ...img, id: generateId(), createdAt: nowIso() };
  if (row.isMain) {
    const existing = await db.productImages.where("productId").equals(img.productId).toArray();
    for (const e of existing) if (e.isMain) await db.productImages.update(e.id, { isMain: false });
  }
  await db.productImages.add(row);
  return row;
}

export async function deleteProductImage(db: PosDatabase, id: string): Promise<void> {
  await db.productImages.delete(id);
}

/** Downscale an image data URL to a max dimension (performance). Returns a JPEG data URL. */
export async function resizeImage(dataUrl: string, maxSize = 600): Promise<string> {
  if (typeof document === "undefined") return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
      else if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ─── Price levels ───────────────────────────────────────────────────────────────────

export async function listPriceLevels(db: PosDatabase, productId: string): Promise<PriceLevel[]> {
  return db.priceLevels.where("productId").equals(productId).toArray();
}

export async function savePriceLevel(db: PosDatabase, pl: PriceLevel): Promise<void> {
  await db.priceLevels.put(pl);
}

export async function getPriceForLevel(db: PosDatabase, productId: string, kind: PriceLevel["kind"]): Promise<number | undefined> {
  const pl = await db.priceLevels.where("productId").equals(productId).toArray();
  const match = pl.find((p) => p.kind === kind && p.isActive);
  return match?.price;
}

// ─── Related products ───────────────────────────────────────────────────────────────

export async function listRelatedProducts(db: PosDatabase, productId: string): Promise<RelatedProduct[]> {
  return db.relatedProducts.where("productId").equals(productId).toArray();
}

export async function saveRelatedProduct(db: PosDatabase, rp: RelatedProduct): Promise<void> {
  await db.relatedProducts.put(rp);
}

// ─── Promotions (read; management in promotions service) ───────────────────────────

export async function listPromotions(db: PosDatabase): Promise<Promotion[]> {
  return db.promotions.toArray();
}

export async function getActivePromotions(db: PosDatabase): Promise<Promotion[]> {
  const now = nowIso();
  const all = await db.promotions.toArray();
  return all.filter((p) => p.isActive && p.startDate <= now && p.endDate >= now);
}

// ─── Product history / timeline ─────────────────────────────────────────────────────

export async function logProductHistory(
  db: PosDatabase,
  productId: string,
  action: ProductHistoryEntry["action"],
  oldValue: unknown,
  newValue: unknown,
  ctx?: { user?: string }
): Promise<void> {
  try {
    await db.productHistory.add({
      id: generateId(), productId, action, user: ctx?.user ?? null,
      oldValue, newValue, createdAt: nowIso(),
    });
  } catch {
    // history must never break the calling op
  }
}

export async function getProductHistory(db: PosDatabase, productId: string, limit = 200): Promise<ProductHistoryEntry[]> {
  const all = await db.productHistory.where("productId").equals(productId).toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

// ─── Bulk actions ───────────────────────────────────────────────────────────────────

export async function bulkUpdate(
  db: PosDatabase,
  ids: string[],
  patch: Partial<PimProduct>,
  ctx?: { user?: string }
): Promise<void> {
  for (const id of ids) await updateProduct(db, id, patch, ctx);
}

export async function bulkDelete(db: PosDatabase, ids: string[]): Promise<void> {
  for (const id of ids) {
    await db.products.delete(id);
    await logAudit(db, { action: "DELETE", entity: "product", entityId: id });
  }
}

// ─── Stock movement summary for a product ───────────────────────────────────────────

export interface StockMovementSummary {
  purchased: number;
  sold: number;
  returned: number;
  damaged: number;
  adjusted: number;
  transferred: number;
  available: number;
}

export async function getStockMovementSummary(db: PosDatabase, productId: string): Promise<StockMovementSummary> {
  const movements = await db.inventoryMovements.where("productId").equals(productId).toArray();
  const sum = (type: string) => movements.filter((m) => m.type === type).reduce((s, m) => s + m.quantity, 0);
  const product = await db.products.get(productId);
  return {
    purchased: sum("STOCK_IN") + sum("GRN"),
    sold: Math.abs(sum("SALE")),
    returned: sum("RETURN"),
    damaged: Math.abs(sum("DAMAGE")),
    adjusted: sum("ADJUSTMENT"),
    transferred: Math.abs(sum("TRANSFER")),
    available: product?.stock ?? 0,
  };
}

// ─── Favorites (uses existing isFavorite field) ─────────────────────────────────────

export async function toggleFavorite(db: PosDatabase, id: string): Promise<void> {
  const p = await db.products.get(id);
  if (!p) return;
  await db.products.update(id, { isFavorite: !p.isFavorite });
}

export async function listFavorites(db: PosDatabase): Promise<Product[]> {
  const all = await db.products.toArray();
  return all.filter((p) => p.isFavorite);
}
