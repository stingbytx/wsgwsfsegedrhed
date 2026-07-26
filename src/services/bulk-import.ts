// ============================================================================
// Bulk Import service — CSV/Excel product import with validation + preview.
// Additive; existing products table is appended to (never overwritten).
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { Product } from "@/types";
import type { ProductPimExtension } from "@/types/pim";
import { generateId, nowIso } from "@/lib/utils";

export interface ImportRow {
  rowIndex: number;
  raw: Record<string, string>;
  product?: Partial<Product & ProductPimExtension>;
  errors: string[];
}

export interface ImportPreview {
  total: number;
  valid: number;
  invalid: number;
  rows: ImportRow[];
}

const FIELD_ALIASES: Record<string, string> = {
  name: "name", product: "name", "product name": "name",
  sku: "sku", code: "sku",
  barcode: "barcode",
  price: "price", "selling price": "price", "sale price": "price",
  cost: "cost", "cost price": "cost",
  stock: "stock", quantity: "stock", qty: "stock",
  category: "category", "category name": "category",
  brand: "brand",
  unit: "unit",
  "low stock": "lowStockThreshold", "min stock": "lowStockThreshold",
  description: "description",
  tax: "taxPercent", "tax percent": "taxPercent",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

/** Parse CSV text into rows (handles quoted fields). */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return [];
  const headers = splitLine(lines[0]).map(normalizeHeader);
  const out: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (cells[idx] ?? "").trim(); });
    out.push(row);
  }
  return out;
}

function splitLine(line: string): string[] {
  const cells: string[] = [];
  let cur = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { cells.push(cur); cur = ""; continue; }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

/** Build a preview with per-row validation against existing data. */
export async function buildImportPreview(db: PosDatabase, rows: Record<string, string>[]): Promise<ImportPreview> {
  const existingSkus = new Set((await db.products.toArray()).map((p) => p.sku));
  const existingBarcodes = new Set((await db.products.toArray()).map((p) => p.barcode).filter(Boolean) as string[]);
  const categories = await db.categories.toArray();
  const brands = await db.brands.toArray();

  const importRows: ImportRow[] = rows.map((raw, idx) => {
    const mapped: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      const field = FIELD_ALIASES[k] ?? k;
      mapped[field] = v;
    }
    const errors: string[] = [];
    if (!mapped.name) errors.push("Missing name");
    if (mapped.sku && existingSkus.has(mapped.sku)) errors.push("Duplicate SKU");
    if (mapped.barcode && existingBarcodes.has(mapped.barcode)) errors.push("Duplicate barcode");
    const price = Number(mapped.price);
    const cost = Number(mapped.cost);
    const stock = Number(mapped.stock);
    if (mapped.price && (Number.isNaN(price) || price < 0)) errors.push("Invalid price");
    if (mapped.cost && (Number.isNaN(cost) || cost < 0)) errors.push("Invalid cost");
    if (mapped.stock && (Number.isNaN(stock) || stock < 0)) errors.push("Invalid stock");
    if (mapped.category) {
      const cat = categories.find((c) => c.name.toLowerCase() === mapped.category.toLowerCase());
      if (!cat) errors.push("Category not found");
    }
    if (mapped.brand) {
      const br = brands.find((b) => b.name.toLowerCase() === mapped.brand.toLowerCase());
      if (!br) errors.push("Brand not found");
    }
    const product: Partial<Product & ProductPimExtension> = {
      name: mapped.name,
      sku: mapped.sku || generateId().slice(0, 8).toUpperCase(),
      barcode: mapped.barcode || undefined,
      price: price || 0,
      cost: cost || 0,
      stock: stock || 0,
      lowStockThreshold: Number(mapped.lowStockThreshold) || 5,
      description: mapped.description || undefined,
      taxPercent: mapped.taxPercent ? Number(mapped.taxPercent) : undefined,
    };
    return { rowIndex: idx + 1, raw, product, errors };
  });

  return {
    total: importRows.length,
    valid: importRows.filter((r) => r.errors.length === 0).length,
    invalid: importRows.filter((r) => r.errors.length > 0).length,
    rows: importRows,
  };
}

/** Commit valid rows from a preview. */
export async function commitImport(db: PosDatabase, preview: ImportPreview): Promise<{ imported: number; skipped: number }> {
  let imported = 0, skipped = 0;
  const categories = await db.categories.toArray();
  const brands = await db.brands.toArray();
  for (const row of preview.rows) {
    if (row.errors.length || !row.product?.name) { skipped++; continue; }
    const p = row.product;
    const cat = p ? categories.find((c) => c.name.toLowerCase() === String((row.raw as Record<string, string>)[normalizeHeader(Object.keys(row.raw).find((k) => FIELD_ALIASES[normalizeHeader(k)] === "category") ?? "")])?.toLowerCase()) : undefined;
    const product: Product = {
      id: generateId(),
      name: p.name!,
      sku: p.sku!,
      barcode: p.barcode,
      categoryId: cat?.id ?? null,
      price: p.price ?? 0,
      cost: p.cost,
      stock: p.stock ?? 0,
      lowStockThreshold: p.lowStockThreshold ?? 5,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    } as Product;
    (product as Product & ProductPimExtension).description = p.description;
    (product as Product & ProductPimExtension).taxPercent = p.taxPercent;
    await db.products.add(product);
    imported++;
  }
  return { imported, skipped };
}

/** Build a CSV template for download. */
export function importTemplate(): string {
  return ["name,sku,barcode,price,cost,stock,category,brand,unit,low stock,description,tax percent",
    "Sample Product,SKU001,1234567890123,100.00,75.00,50,Beverages,Coca-Cola,Piece,5,Sample description,0"].join("\n");
}
