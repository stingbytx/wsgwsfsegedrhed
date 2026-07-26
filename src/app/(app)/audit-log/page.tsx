"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { PageHeader, Badge, statusTone } from "@/components/ui/primitives";
import { listAudit } from "@/services/audit";
import { formatDateTime } from "@/lib/format";
import { exportCSV, exportExcel, exportPDFOrPrint } from "@/services/export";
import { toast } from "sonner";
import { ScrollText, Download, FileSpreadsheet, FileText } from "lucide-react";
import type { AuditEntry } from "@/types/enterprise";

const ACTION_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  LOGIN: "success", LOGOUT: "neutral",
  CREATE: "success", EDIT: "info", DELETE: "danger",
  PRINT: "neutral", EXPORT: "neutral",
  REFUND: "warning", RETURN: "warning",
  STOCK_ADJUSTMENT: "warning", TRANSFER: "info",
  PURCHASE: "info", SALE: "success", GRN: "success",
  EXPENSE: "warning", SETTINGS_CHANGE: "info", BACKUP: "neutral",
};

export default function AuditLogPage() {
  const db = useDb();
  const all = useLiveQuery(() => (db ? listAudit(db, 2000) : Promise.resolve([])), [db]) ?? [];
  const [actionFilter, setActionFilter] = React.useState("");

  const rows = actionFilter ? all.filter((a) => a.action === actionFilter) : all;

  const columns: Column<AuditEntry>[] = [
    { key: "timestamp", header: "Timestamp", sortable: true, render: (a) => <span className="text-xs text-slate-600">{formatDateTime(a.timestamp)}</span>, value: (a) => a.timestamp },
    { key: "action", header: "Action", sortable: true, filterable: true, render: (a) => <Badge tone={ACTION_TONE[a.action] ?? "neutral"}>{a.action.replace(/_/g, " ")}</Badge> },
    { key: "entity", header: "Entity", filterable: true, render: (a) => a.entity },
    { key: "entityId", header: "Entity ID", render: (a) => <span className="font-mono text-xs text-slate-400">{a.entityId ? a.entityId.slice(0, 8) : "—"}</span> },
    { key: "userEmail", header: "User", filterable: true, render: (a) => a.userEmail ?? "—" },
    { key: "userRole", header: "Role", render: (a) => a.userRole ?? "—" },
    { key: "browser", header: "Browser", render: (a) => <span className="text-xs text-slate-400 truncate block max-w-[200px]">{a.browser?.slice(0, 60) ?? "—"}</span> },
  ];

  const actions = Array.from(new Set(all.map((a) => a.action))).sort();

  const doExport = (fmt: "csv" | "excel" | "pdf") => {
    if (rows.length === 0) { toast.error("No data to export"); return; }
    const data = rows.map((a) => ({
      Timestamp: formatDateTime(a.timestamp), Action: a.action, Entity: a.entity,
      "Entity ID": a.entityId ?? "", User: a.userEmail ?? "", Role: a.userRole ?? "",
      Browser: a.browser ?? "",
    }));
    const headers = ["Timestamp", "Action", "Entity", "Entity ID", "User", "Role", "Browser"];
    const base = `unipos-audit-log-${new Date().toISOString().split("T")[0]}`;
    if (fmt === "csv") exportCSV(data, headers, `${base}.csv`);
    else if (fmt === "excel") exportExcel(data, headers, `${base}.xls`, "Audit Log");
    else exportPDFOrPrint({ title: "Audit Log", subtitle: `${rows.length} entries`, columns: columns.map((c) => ({ key: c.key, label: c.header, align: c.align })), rows: data as Record<string, unknown>[], currencySymbol: "" });
    toast.success(`${fmt.toUpperCase()} exported`);
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Audit Log"
        subtitle={`${all.length} recorded actions`}
        actions={<>
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="h-9 w-44">
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
          </Select>
          <Button variant="outline" size="sm" onClick={() => doExport("csv")}><Download className="h-4 w-4" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={() => doExport("excel")}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
          <Button variant="outline" size="sm" onClick={() => doExport("pdf")}><FileText className="h-4 w-4" /> PDF</Button>
        </>}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        searchKeys={["action", "entity", "userEmail", "userRole"]}
        dateFilterKey="timestamp"
        initialPageSize={25}
        exportFilename="unipos-audit-log"
        exportTitle="Audit Log"
        emptyIcon={ScrollText}
        emptyTitle="No audit entries yet"
        emptyDescription="Actions like create, edit, delete, sale, and refund will appear here."
      />
    </div>
  );
}
