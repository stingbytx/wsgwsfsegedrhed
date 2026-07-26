// ============================================================================
// Print Engine — one service for printing invoices, receipts, reports,
// purchase orders, GRNs, barcodes, and QR labels. Renders a print-ready
// window with a consistent template; the browser handles the actual print.
// ============================================================================

import type { Order, BusinessSettings } from "@/types";
import type { PurchaseOrder, GRN } from "@/types/enterprise";
import { formatMoney, formatDateTime } from "@/lib/format";

export type PrintFormat = "THERMAL" | "A4";

export interface PrintContext {
  settings?: Partial<BusinessSettings> | null;
  format?: PrintFormat;
  currencySymbol?: string;
}

function openPrintWindow(html: string, title = "Print") {
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return;
  w.document.write(html);
  w.document.title = title;
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

function header(settings?: Partial<BusinessSettings> | null): string {
  const name = settings?.storeName ?? "UniPOS";
  const phone = settings?.storePhone ? `<div>${settings.storePhone}</div>` : "";
  const head = (settings as { receiptHeader?: string } | null)?.receiptHeader
    ? `<div class="rh">${(settings as { receiptHeader: string }).receiptHeader}</div>` : "";
  return `<div class="store"><h2>${name}</h2>${head}${phone}</div>`;
}

function footer(settings?: Partial<BusinessSettings> | null): string {
  const f = (settings as { receiptFooter?: string } | null)?.receiptFooter ?? "Thank you for your business!";
  return `<div class="foot">${f}</div>`;
}

const THERMAL_CSS = `
  *{font-family:'Courier New',monospace;box-sizing:border-box}
  body{width:280px;margin:0 auto;padding:8px;color:#000;font-size:12px}
  .store{text-align:center;margin-bottom:6px}.store h2{margin:0;font-size:15px}
  .rh{font-size:11px;color:#333}.foot{text-align:center;margin-top:8px;font-size:11px;border-top:1px dashed #000;padding-top:6px}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{padding:2px 0;font-size:11px;text-align:left}
  .right{text-align:right}.tot{border-top:1px dashed #000;margin-top:6px;padding-top:6px;font-weight:bold;font-size:13px}
  .meta{font-size:11px;color:#333;margin-top:4px}
`;

const A4_CSS = `
  *{font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}
  body{padding:32px;color:#1e293b;font-size:13px;max-width:800px;margin:0 auto}
  .store h2{margin:0;color:#0070E0;font-size:24px}
  .foot{margin-top:28px;text-align:center;color:#94a3b8;font-size:11px}
  table{width:100%;border-collapse:collapse;margin-top:14px}
  th{background:#f1f5f9;padding:8px 10px;border:1px solid #e2e8f0;text-align:left}
  td{padding:7px 10px;border:1px solid #e2e8f0}
  .right{text-align:right}.tot{margin-top:14px;font-size:16px;font-weight:bold}
  .meta{color:#64748b;font-size:12px}
`;

export function printReceipt(order: Order, ctx: PrintContext = {}) {
  const isThermal = (ctx.format ?? "THERMAL") === "THERMAL";
  const sym = ctx.currencySymbol ?? "$";
  const css = isThermal ? THERMAL_CSS : A4_CSS;
  const items = order.items
    .map((i) => `<tr><td>${i.name}<div class="meta">${i.quantity} × ${formatMoney(i.price, sym)}</div></td><td class="right">${formatMoney(i.total, sym)}</td></tr>`)
    .join("");
  const pays = order.payments.map((p) => `<div>${p.method}: ${formatMoney(p.amount, sym)}</div>`).join("");
  const html = `<!DOCTYPE html><html><head><title>Receipt ${order.orderNumber}</title><style>${css}</style></head><body>
    ${header(ctx.settings)}
    <div class="meta">Receipt #: ${order.orderNumber}<br>Date: ${formatDateTime(order.createdAt)}</div>
    <table><thead><tr><th>Item</th><th class="right">Amount</th></tr></thead><tbody>${items}</tbody></table>
    <div class="tot">Subtotal: ${formatMoney(order.subtotal, sym)}</div>
    ${order.taxTotal ? `<div>Tax: ${formatMoney(order.taxTotal, sym)}</div>` : ""}
    <div class="tot">TOTAL: ${formatMoney(order.total, sym)}</div>
    <div class="meta">Paid: ${formatMoney(order.amountPaid, sym)} ${order.balanceDue > 0 ? `| Balance: ${formatMoney(order.balanceDue, sym)}` : ""}</div>
    <div class="meta">${pays}</div>
    ${footer(ctx.settings)}
  </body></html>`;
  openPrintWindow(html, `Receipt-${order.orderNumber}`);
}

export function printInvoice(order: Order, ctx: PrintContext = {}) {
  const sym = ctx.currencySymbol ?? "$";
  const customerLine = order.customerId ? `<div class="meta">Customer ID: ${order.customerId}</div>` : "";
  const items = order.items
    .map((i) => `<tr><td>${i.name}</td><td class="right">${i.quantity}</td><td class="right">${formatMoney(i.price, sym)}</td><td class="right">${formatMoney(i.total, sym)}</td></tr>`)
    .join("");
  const html = `<!DOCTYPE html><html><head><title>Invoice ${order.orderNumber}</title><style>${A4_CSS}</style></head><body>
    ${header(ctx.settings)}
    <div style="display:flex;justify-content:space-between;align-items:start;margin-top:18px">
      <div><h1 style="margin:0;font-size:20px">INVOICE</h1><div class="meta">${order.orderNumber}</div></div>
      <div class="meta" style="text-align:right">Date: ${formatDateTime(order.createdAt)}<br>Status: ${order.status}</div>
    </div>
    ${customerLine}
    <table><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Total</th></tr></thead><tbody>${items}</tbody></table>
    <div class="tot right">Subtotal: ${formatMoney(order.subtotal, sym)}</div>
    ${order.taxTotal ? `<div class="right">Tax: ${formatMoney(order.taxTotal, sym)}</div>` : ""}
    <div class="tot right">TOTAL DUE: ${formatMoney(order.total, sym)}</div>
    ${footer(ctx.settings)}
  </body></html>`;
  openPrintWindow(html, `Invoice-${order.orderNumber}`);
}

export function printPurchaseOrder(po: PurchaseOrder, supplierName: string, ctx: PrintContext = {}) {
  const sym = ctx.currencySymbol ?? "$";
  const items = po.items
    .map((i) => `<tr><td>${i.name}</td><td>${i.sku}</td><td class="right">${i.quantityOrdered}</td><td class="right">${formatMoney(i.cost, sym)}</td><td class="right">${formatMoney(i.total, sym)}</td></tr>`)
    .join("");
  const html = `<!DOCTYPE html><html><head><title>PO ${po.poNumber}</title><style>${A4_CSS}</style></head><body>
    ${header(ctx.settings)}
    <div style="display:flex;justify-content:space-between;margin-top:18px">
      <div><h1 style="margin:0;font-size:20px">PURCHASE ORDER</h1><div class="meta">${po.poNumber}</div></div>
      <div class="meta" style="text-align:right">Supplier: ${supplierName}<br>Date: ${formatDateTime(po.createdAt)}<br>Status: ${po.status}</div>
    </div>
    <table><thead><tr><th>Item</th><th>SKU</th><th class="right">Qty</th><th class="right">Cost</th><th class="right">Total</th></tr></thead><tbody>${items}</tbody></table>
    <div class="tot right">TOTAL: ${formatMoney(po.total, sym)}</div>
    ${footer(ctx.settings)}
  </body></html>`;
  openPrintWindow(html, `PO-${po.poNumber}`);
}

export function printGRN(grn: GRN, supplierName: string, ctx: PrintContext = {}) {
  const sym = ctx.currencySymbol ?? "$";
  const items = grn.items
    .map((i) => `<tr><td>${i.name}</td><td>${i.sku}</td><td class="right">${i.quantityReceived}</td><td class="right">${formatMoney(i.cost, sym)}</td><td class="right">${formatMoney(i.total, sym)}</td></tr>`)
    .join("");
  const html = `<!DOCTYPE html><html><head><title>GRN ${grn.grnNumber}</title><style>${A4_CSS}</style></head><body>
    ${header(ctx.settings)}
    <div style="display:flex;justify-content:space-between;margin-top:18px">
      <div><h1 style="margin:0;font-size:20px">GOODS RECEIVED NOTE</h1><div class="meta">${grn.grnNumber}</div></div>
      <div class="meta" style="text-align:right">Supplier: ${supplierName}<br>Received: ${formatDateTime(grn.receivedAt)}<br>PO: ${grn.poNumber ?? "—"}</div>
    </div>
    <table><thead><tr><th>Item</th><th>SKU</th><th class="right">Qty Received</th><th class="right">Cost</th><th class="right">Total</th></tr></thead><tbody>${items}</tbody></table>
    <div class="tot right">TOTAL: ${formatMoney(grn.total, sym)}</div>
    ${footer(ctx.settings)}
  </body></html>`;
  openPrintWindow(html, `GRN-${grn.grnNumber}`);
}

/** Print barcode/QR label sheets — accepts pre-rendered SVG/HTML strings. */
export function printLabels(labelHtml: string, title = "Barcode Labels") {
  const html = `<!DOCTYPE html><html><head><title>${title}</title><style>
    *{box-sizing:border-box}body{padding:12px;font-family:Arial}
    .label{display:inline-block;margin:6px;padding:6px;border:1px dashed #ccc;text-align:center;vertical-align:top}
    @media print{@page{margin:8mm}.label{border:1px solid #eee}}
  </style></head><body>${labelHtml}</body></html>`;
  openPrintWindow(html, title);
}
