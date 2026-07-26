// ============================================================================
// Barcode Print Service — generates print-ready label sheets for products.
// Supports 1/10/20/50/100/custom quantities and A4 / 58mm / 80mm paper.
// Renders barcodes + QR codes via JsBarcode (client) into a print window.
// ============================================================================

import type { Product } from "@/types";
import { generateEAN13 } from "./barcode";

export type LabelPaperSize = "A4" | "58mm" | "80mm";
export type LabelQuantity = 1 | 10 | 20 | 50 | 100 | "custom";

export interface PrintLabelInput {
  product: Pick<Product, "name" | "sku" | "barcode" | "price">;
  quantity: number;
  paperSize: LabelPaperSize;
  showLogo?: boolean;
  showPrice?: boolean;
  showSku?: boolean;
  currencySymbol?: string;
  logoDataUrl?: string;
}

const PAPER_CSS: Record<LabelPaperSize, string> = {
  A4: "body{padding:12mm} .label{width:63mm;height:30mm;margin:2mm;display:inline-block;vertical-align:top}",
  "58mm": "body{width:58mm;margin:0 auto} .label{width:54mm;height:24mm;margin:2mm auto;text-align:center}",
  "80mm": "body{width:80mm;margin:0 auto} .label{width:74mm;height:28mm;margin:2mm auto;text-align:center}",
};

const COMMON_CSS = `
  *{font-family:Arial,sans-serif;box-sizing:border-box}
  body{color:#000}
  .label{border:1px solid #ddd;padding:2mm;text-align:center;page-break-inside:avoid}
  .name{font-size:10px;font-weight:600;line-height:1.1;height:8mm;overflow:hidden}
  .bc{display:flex;justify-content:center;align-items:center;height:14mm}
  .bc svg, .bc canvas{max-height:12mm;max-width:100%}
  .meta{font-size:9px;color:#333}
  .price{font-size:12px;font-weight:700}
  .logo{max-height:6mm;margin-bottom:1mm}
  @media print{@page{margin:4mm}}
`;

export async function buildLabelsHtml(input: PrintLabelInput): Promise<string> {
  const JsBarcode = (await import("jsbarcode")).default;
  const value = input.product.barcode || generateEAN13();
  const sym = input.currencySymbol ?? "";

  const labelHtml = await Promise.all(Array.from({ length: input.quantity }).map(async (_, i) => {
    const canvas = `<canvas id="bc-${i}"></canvas>`;
    return `<div class="label">
      ${input.showLogo && input.logoDataUrl ? `<img class="logo" src="${input.logoDataUrl}" alt="logo"/>` : ""}
      <div class="name">${escapeHtml(input.product.name)}</div>
      <div class="bc">${canvas}</div>
      ${input.showPrice ? `<div class="price">${sym}${Number(input.product.price).toFixed(2)}</div>` : ""}
      ${input.showSku ? `<div class="meta">${escapeHtml(input.product.sku)}</div>` : ""}
    </div>`;
  }));

  const html = `<!DOCTYPE html><html><head><title>Labels - ${escapeHtml(input.product.name)}</title>
    <style>${COMMON_CSS}${PAPER_CSS[input.paperSize]}</style></head><body>
    ${labelHtml.join("")}
    <script>
      (async function(){
        const JsBarcode = (await import("https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.min.js")).default;
        ${Array.from({ length: input.quantity }).map((_, i) => `try{JsBarcode(document.getElementById("bc-${i}"),"${value}",{format:"CODE128",displayValue:true,fontSize:11,margin:2,height:40,width:1.6})}catch(e){}`).join("\n")}
        setTimeout(function(){window.print()},300);
      })();
    <\/script>
    </body></html>`;
  return html;
}

export async function printLabels(input: PrintLabelInput): Promise<void> {
  const html = await buildLabelsHtml(input);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
