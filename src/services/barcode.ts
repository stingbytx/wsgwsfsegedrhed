// ============================================================================
// Barcode Engine — centralized barcode generation + validation.
//
// Supports Code 39, Code 128, EAN-13, EAN-8, UPC, and QR Code. Renders to
// <canvas> via JsBarcode (loaded by the existing BarcodeCanvas component)
// and validates/deduplicates against the products table.
//
// This extends (does not replace) src/utils/barcode.ts which still exports
// the legacy `generateBarcodeValue()` used by the inventory page.
// ============================================================================

import type { PosDatabase } from "@/lib/db";

export type BarcodeFormat = "CODE39" | "CODE128" | "EAN13" | "EAN8" | "UPC" | "QR";

export interface BarcodeFormatInfo {
  id: BarcodeFormat;
  label: string;
  jsbarcode: string; // JsBarcode format id
  length?: number; // required length (numeric formats)
  numericOnly?: boolean;
}

export const BARCODE_FORMATS: BarcodeFormatInfo[] = [
  { id: "CODE39", label: "Code 39", jsbarcode: "CODE39" },
  { id: "CODE128", label: "Code 128", jsbarcode: "CODE128" },
  { id: "EAN13", label: "EAN-13", jsbarcode: "EAN13", length: 13, numericOnly: true },
  { id: "EAN8", label: "EAN-8", jsbarcode: "EAN8", length: 8, numericOnly: true },
  { id: "UPC", label: "UPC-A", jsbarcode: "UPC", length: 12, numericOnly: true },
  { id: "QR", label: "QR Code", jsbarcode: "QR" },
];

export function getFormatInfo(id: BarcodeFormat): BarcodeFormatInfo {
  return BARCODE_FORMATS.find((f) => f.id === id) ?? BARCODE_FORMATS[1];
}

/** EAN-13 check digit (standard mod-10, weights 1 and 3). */
export function ean13CheckDigit(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

/** Generate a valid in-store EAN-13 (prefix '2' marks internal codes). */
export function generateEAN13(): string {
  let d = "2";
  for (let i = 0; i < 11; i++) d += Math.floor(Math.random() * 10);
  return d + ean13CheckDigit(d);
}

/** Validate a barcode for a given format (length + charset + check digit). */
export function validateBarcode(value: string, format: BarcodeFormat): { valid: boolean; reason?: string } {
  const info = getFormatInfo(format);
  if (!value) return { valid: false, reason: "Empty" };
  if (info.numericOnly && !/^\d+$/.test(value)) return { valid: false, reason: "Must be numeric" };
  if (info.length && value.length !== info.length) return { valid: false, reason: `Must be ${info.length} digits` };
  if (format === "EAN13" && value.length === 13) {
    if (ean13CheckDigit(value.slice(0, 12)) !== value[12]) return { valid: false, reason: "Invalid check digit" };
  }
  return { valid: true };
}

/** Detect duplicate barcodes across products (excluding the given product id). */
export async function isDuplicateBarcode(db: PosDatabase, value: string, excludeProductId?: string): Promise<boolean> {
  if (!value) return false;
  const count = await db.products.where("barcode").equals(value).count();
  if (count === 0) return false;
  if (excludeProductId) {
    const existing = await db.products.where("barcode").equals(value).toArray();
    return existing.some((p) => p.id !== excludeProductId);
  }
  return true;
}

/** Auto-generate a unique barcode not already present in the DB. */
export async function generateUniqueBarcode(db: PosDatabase, format: BarcodeFormat = "EAN13"): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const value = format === "EAN13" ? generateEAN13() : `2${Date.now().toString().slice(-10)}`;
    if (!(await isDuplicateBarcode(db, value))) return value;
  }
  return generateEAN13(); // fallback; extremely unlikely collision
}

/** Render a barcode to a canvas using JsBarcode (client-only). */
export async function renderBarcode(
  canvas: HTMLCanvasElement,
  value: string,
  format: BarcodeFormat = "CODE128"
): Promise<void> {
  const JsBarcode = (await import("jsbarcode")).default;
  const info = getFormatInfo(format);
  try {
    if (format === "QR") {
      JsBarcode(canvas, value, { format: "QR", width: 4, height: 80 });
    } else {
      JsBarcode(canvas, value, { format: info.jsbarcode, displayValue: true, fontSize: 14, margin: 6 });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[barcode] render failed", e);
  }
}
