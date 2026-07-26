"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Badge, EmptyState, statusTone } from "./primitives";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { exportCSV, exportExcel, exportPDFOrPrint } from "@/services/export";
import { toast } from "sonner";

// ─── Column definition ───────────────────────────────────────────────────────
export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  filterable?: boolean; // column-level filter (distinct values)
  render?: (row: T) => React.ReactNode;
  value?: (row: T) => string | number; // for sorting/filtering/export
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  searchKeys?: (keyof T | string)[]; // global search fields (by row key or column.key)
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  initialPageSize?: number;
  exportFilename?: string;
  exportTitle?: string;
  currencySymbol?: string;
  toolbarActions?: React.ReactNode;
  dateFilterKey?: string; // row key (ISO date string) for date-range filter
  statusFilterKey?: string; // row key for status quick-filter
  statusOptions?: string[];
}

type SortDir = "asc" | "desc";

export function DataTable<T>({
  columns, rows, rowKey, searchKeys, onRowClick,
  emptyTitle = "No records", emptyDescription, emptyIcon,
  initialPageSize = 10, exportFilename = "export", exportTitle = "Data",
  currencySymbol = "$", toolbarActions, dateFilterKey, statusFilterKey, statusOptions,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [columnFilters, setColumnFilters] = React.useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    let out = [...rows];
    // global search
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((r) => {
        const row = r as Record<string, unknown>;
        if (searchKeys && searchKeys.length) {
          return searchKeys.some((k) => String(row[k as string] ?? "").toLowerCase().includes(q));
        }
        return Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q));
      });
    }
    // column filters
    for (const [colKey, val] of Object.entries(columnFilters)) {
      if (!val) continue;
      out = out.filter((r) => String((r as Record<string, unknown>)[colKey] ?? "").toLowerCase().includes(val.toLowerCase()));
    }
    // status quick filter
    if (statusFilter && statusFilterKey) {
      out = out.filter((r) => String((r as Record<string, unknown>)[statusFilterKey] ?? "") === statusFilter);
    }
    // date range
    if (dateFilterKey && (dateFrom || dateTo)) {
      out = out.filter((r) => {
        const dStr = String((r as Record<string, unknown>)[dateFilterKey] ?? "");
        if (!dStr || dStr === "—") return false;
        const d = new Date(dStr);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo) { const to = new Date(dateTo); to.setHours(23, 59, 59, 999); if (d > to) return false; }
        return true;
      });
    }
    return out;
  }, [rows, query, columnFilters, statusFilter, statusFilterKey, dateFilterKey, dateFrom, dateTo, searchKeys]);

  // ── Sorting ─────────────────────────────────────────────────────────────────
  const sorted = React.useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    const getVal = (r: T) => (col?.value ? col.value(r) : ((r as Record<string, unknown>)[sortKey] as string | number));
    return [...filtered].sort((a, b) => {
      const av = getVal(a), bv = getVal(b);
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av ?? "").localeCompare(String(bv ?? ""))
        : String(bv ?? "").localeCompare(String(av ?? ""));
    });
  }, [filtered, sortKey, sortDir, columns]);

  // ── Pagination ───────────────────────────────────────────────────────────────
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  React.useEffect(() => setPage(0), [query, pageSize, columnFilters, statusFilter, dateFrom, dateTo]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const exportRows = sorted.map((r) => {
    const row = r as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const c of columns) out[c.header] = c.value ? c.value(r) : (row[c.key] ?? "");
    return out;
  });
  const headers = columns.map((c) => c.header);
  const doExport = (fmt: "csv" | "excel" | "pdf") => {
    if (sorted.length === 0) { toast.error("No data to export"); return; }
    if (fmt === "csv") exportCSV(exportRows, headers, `${exportFilename}.csv`);
    else if (fmt === "excel") exportExcel(exportRows, headers, `${exportFilename}.xls`, exportTitle);
    else exportPDFOrPrint({
      title: exportTitle, subtitle: `${sorted.length} records`,
      columns: columns.map((c) => ({ key: c.key, label: c.header, align: c.align })),
      rows: exportRows as Record<string, unknown>[],
      currencySymbol,
    });
    toast.success(`${fmt.toUpperCase()} exported`);
  };
  const doPrint = () => {
    if (sorted.length === 0) { toast.error("Nothing to print"); return; }
    exportPDFOrPrint({
      title: exportTitle, subtitle: `${sorted.length} records`,
      columns: columns.map((c) => ({ key: c.key, label: c.header, align: c.align })),
      rows: exportRows as Record<string, unknown>[],
      currencySymbol,
    });
  };

  const alignCls = (a?: "left" | "right" | "center") => a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className="space-y-3">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0070E0]/40"
          />
        </div>

        {statusFilterKey && statusOptions && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0070E0]/40"
          >
            <option value="">All statuses</option>
            {statusOptions.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        )}

        {dateFilterKey && (
          <div className="flex items-center gap-1">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-2 text-sm" />
            <span className="text-slate-400 text-xs">→</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-2 text-sm" />
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => doExport("csv")} title="Export CSV"><Download className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => doExport("excel")} title="Export Excel"><FileSpreadsheet className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => doExport("pdf")} title="Export PDF"><FileText className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={doPrint} title="Print"><Printer className="h-4 w-4" /></Button>
        </div>

        {toolbarActions}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────────── */}
      <div className="rounded-[20px] bg-white border border-slate-100 shadow-[0_2px_20px_rgba(0,48,135,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100 bg-slate-50/50">
                {columns.map((c) => (
                  <th key={c.key} className={cn("p-3 font-medium text-slate-500 text-xs whitespace-nowrap", alignCls(c.align))} style={{ width: c.width }}>
                    <div className={cn("inline-flex items-center gap-1", c.align === "right" && "flex-row-reverse")}>
                      {c.sortable && (
                        <button onClick={() => toggleSort(c.key)} className="hover:text-slate-700">
                          {sortKey === c.key ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                        </button>
                      )}
                      {c.header}
                    </div>
                    {c.filterable && (
                      <input
                        value={columnFilters[c.key] ?? ""}
                        onChange={(e) => setColumnFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                        placeholder="Filter…"
                        className="mt-1 h-7 w-full rounded-md border border-slate-200 px-2 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-[#0070E0]/40"
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr><td colSpan={columns.length} className="p-0"><EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} /></td></tr>
              )}
              {pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn("border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors", onRowClick && "cursor-pointer")}
                >
                  {columns.map((c) => {
                    const content = c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—");
                    // Auto-badge for status-like columns
                    const isStatus = c.key === "status" || c.key === "Status";
                    return (
                      <td key={c.key} className={cn("p-3 text-slate-700", alignCls(c.align), c.className)}>
                        {isStatus && typeof content === "string" ? <Badge tone={statusTone(content)}>{content.replace(/_/g, " ")}</Badge> : content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-2 p-3 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-7 rounded-md border border-slate-200 px-2 text-xs"
            >
              {[10, 25, 50, 100, 250].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="ml-2">{sorted.length === 0 ? "0" : safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} of {sorted.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0} className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2">Page {safePage + 1} / {pageCount}</span>
            <button onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))} disabled={safePage >= pageCount - 1} className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
