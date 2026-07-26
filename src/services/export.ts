// ============================================================================
// Global Export Engine — one service for CSV, Excel (SpreadsheetML), PDF
// (print window), and direct Print. Every table/report/list calls these
// helpers so export logic is never duplicated.
// ============================================================================

import type { ReportDataset } from "./reporting";
import { formatMoney, formatDateTime } from "@/lib/format";

export type ExportFormat = "csv" | "excel" | "pdf" | "print";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

export function rowsToCSV(rows: Record<string, unknown>[], headers: string[]): string {
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ].join("\n");
}

export function exportCSV(rows: Record<string, unknown>[], headers: string[], filename: string) {
  const csv = rowsToCSV(rows, headers);
  triggerDownload(new Blob([csv], { type: "text/csv" }), filename);
}

// Excel via SpreadsheetML 2003 (.xls) — no external dependency, opens in Excel/Sheets.
export function exportExcel(rows: Record<string, unknown>[], headers: string[], filename: string, sheetName = "Sheet1") {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const cell = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
    return `<Cell><Data ss:Type="String">${esc(String(v ?? ""))}</Data></Cell>`;
  };
  const headerRow = `<Row>${headers.map((h) => `<Cell><Data ss:Type="String">${esc(h)}</Data></Cell>`).join("")}</Row>`;
  const dataRows = rows.map((r) => `<Row>${headers.map((h) => cell(r[h])).join("")}</Row>`).join("");
  const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${esc(sheetName)}"><Table>${headerRow}${dataRows}</Table></Worksheet>
</Workbook>`;
  triggerDownload(new Blob([xml], { type: "application/vnd.ms-excel" }), filename);
}

export interface PrintTableOptions {
  title: string;
  subtitle?: string;
  columns: { key: string; label: string; align?: "left" | "right" | "center" }[];
  rows: Record<string, unknown>[];
  summaryRows?: { label: string; value: string }[];
  currencySymbol?: string;
}

/** Open a print-ready window (also used for PDF via the browser's print-to-PDF). */
export function exportPDFOrPrint(opts: PrintTableOptions, print = true) {
  const w = window.open("", "_blank");
  if (!w) {
    // eslint-disable-next-line no-console
    console.warn("Pop-up blocked — cannot open print window.");
    return;
  }
  const sym = opts.currencySymbol ?? "";
  const fmt = (v: unknown) => (typeof v === "number" ? formatMoney(v, sym) : String(v ?? "—"));
  const align = (a?: "left" | "right" | "center") => (a === "right" ? "text-align:right" : a === "center" ? "text-align:center" : "text-align:left");
  const head = opts.columns.map((c) => `<th style="${align(c.align)}">${c.label}</th>`).join("");
  const body = opts.rows.map((r) => `<tr>${opts.columns.map((c) => `<td style="${align(c.align)}">${c.key === "date" ? formatDateTime(r[c.key] as string) : fmt(r[c.key])}</td>`).join("")}</tr>`).join("");
  const summary = opts.summaryRows?.map((s) => `<div class="sum"><span>${s.label}</span><strong>${s.value}</strong></div>`).join("") ?? "";

  w.document.write(`<!DOCTYPE html><html><head><title>${opts.title}</title>
  <style>
    *{font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}
    body{padding:28px;color:#1e293b;font-size:13px}
    h1{font-size:22px;margin:0 0 4px;color:#0070E0}
    .meta{color:#64748b;font-size:12px;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
    th{background:#f1f5f9;padding:8px 10px;border:1px solid #e2e8f0;font-weight:600;color:#475569}
    td{padding:7px 10px;border:1px solid #e2e8f0}
    tr:nth-child(even){background:#f8fafc}
    .summary{margin-top:16px;display:flex;gap:24px;flex-wrap:wrap}
    .sum{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;min-width:160px}
    .sum span{display:block;font-size:11px;color:#64748b}
    .sum strong{font-size:16px;color:#0f172a}
    .foot{margin-top:22px;color:#94a3b8;font-size:11px;text-align:center}
    @media print{@page{margin:12mm}.no-print{display:none}}
  </style></head><body>
  <h1>${opts.title}</h1>
  <div class="meta">${opts.subtitle ?? ""} &nbsp;|&nbsp; Generated: ${formatDateTime(new Date())}</div>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  ${summary ? `<div class="summary">${summary}</div>` : ""}
  <div class="foot">Generated by UniPOS</div>
  <script>window.onload=function(){${print ? "setTimeout(function(){window.print()},300);" : ""}}<\/script>
  </body></html>`);
  w.document.close();
}

/** Export a ReportDataset in any format. */
export function exportReport(dataset: ReportDataset, format: ExportFormat, currencySymbol = "$", filename?: string) {
  const headers = dataset.columns.map((c) => c.label);
  const base = filename ?? `unipos-${dataset.kind}-${new Date().toISOString().split("T")[0]}`;
  const summaryRows = Object.values(dataset.summary).map((s) => ({ label: s.label, value: s.currency ? formatMoney(s.value, currencySymbol) : String(s.value) }));

  if (format === "csv") exportCSV(dataset.rows, headers, `${base}.csv`);
  else if (format === "excel") exportExcel(dataset.rows, headers, `${base}.xls`, dataset.title);
  else if (format === "pdf" || format === "print") exportPDFOrPrint({
    title: dataset.title,
    subtitle: `${dataset.rows.length} records`,
    columns: dataset.columns.map((c) => ({ key: c.key, label: c.label, align: c.align })),
    rows: dataset.rows,
    summaryRows,
    currencySymbol,
  });
}
