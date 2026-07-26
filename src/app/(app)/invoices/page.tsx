"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal, PageHeader, Badge, statusTone, EmptyState } from "@/components/ui/primitives";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney, formatDateTime } from "@/lib/format";
import { printReceipt, printInvoice } from "@/services/print";
import { toast } from "sonner";
import { FileText, Printer, RotateCcw, Mail } from "lucide-react";
import type { Order } from "@/types";

export default function InvoicesPage() {
  const db = useDb();
  const { currencySymbol } = useUIStore();
  const orders = useLiveQuery(() => (db ? db.orders.toArray() : []), [db]) ?? [];
  const customers = useLiveQuery(() => (db ? db.customers.toArray() : []), [db]) ?? [];
  const [view, setView] = React.useState<Order | null>(null);

  const customerName = (id?: string | null) => (id ? customers.find((c) => c.id === id)?.name ?? "—" : "Walk-in");

  const columns: Column<Order>[] = [
    { key: "orderNumber", header: "Invoice #", sortable: true, filterable: true, render: (o) => <span className="font-mono text-xs text-slate-500">{o.orderNumber}</span> },
    { key: "createdAt", header: "Date & Time", sortable: true, render: (o) => <span className="text-xs text-slate-600">{formatDateTime(o.createdAt)}</span>, value: (o) => o.createdAt },
    { key: "customerId", header: "Customer", filterable: true, render: (o) => customerName(o.customerId) },
    { key: "items", header: "Items", align: "center", value: (o) => o.items.length, render: (o) => o.items.length },
    { key: "total", header: "Total", align: "right", sortable: true, value: (o) => o.total, render: (o) => <span className="font-semibold text-slate-800">{formatMoney(o.total, currencySymbol)}</span> },
    { key: "payments", header: "Payment", render: (o) => <span className="text-xs text-slate-500">{o.payments.map((p) => p.method).join(", ")}</span> },
    { key: "status", header: "Status", sortable: true, render: (o) => <Badge tone={statusTone(o.status)}>{o.status.replace(/_/g, " ")}</Badge> },
    {
      key: "actions", header: "Actions", align: "right",
      render: (o) => (
        <div className="flex justify-end gap-1.5">
          <button title="View" onClick={(e) => { e.stopPropagation(); setView(o); }} className="text-[#0070E0] hover:scale-110"><FileText className="h-3.5 w-3.5" /></button>
          <button title="Print Receipt" onClick={(e) => { e.stopPropagation(); printReceipt(o, { currencySymbol }); }} className="text-slate-500 hover:text-[#0070E0]"><Printer className="h-3.5 w-3.5" /></button>
          <button title="Print Invoice" onClick={(e) => { e.stopPropagation(); printInvoice(o, { currencySymbol }); }} className="text-slate-500 hover:text-[#0070E0]"><FileText className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Bill History / Invoices" subtitle={`${orders.length} invoices`} />
      <DataTable
        columns={columns}
        rows={orders}
        rowKey={(o) => o.id}
        searchKeys={["orderNumber", "customerId"]}
        dateFilterKey="createdAt"
        statusFilterKey="status"
        statusOptions={["COMPLETED", "HELD", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"]}
        initialPageSize={25}
        exportFilename="unipos-invoices"
        exportTitle="Invoices"
        emptyIcon={FileText}
        emptyTitle="No invoices yet"
        onRowClick={(o) => setView(o)}
      />

      {view && (
        <Modal open onClose={() => setView(null)} title={`Invoice ${view.orderNumber}`} size="xl"
          footer={<>
            <Button variant="outline" onClick={() => printReceipt(view, { currencySymbol })}><Printer className="h-4 w-4" /> Receipt</Button>
            <Button variant="outline" onClick={() => printInvoice(view, { currencySymbol })}><FileText className="h-4 w-4" /> Invoice</Button>
          </>}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <div><span className="text-slate-400">Customer:</span> <strong className="text-slate-700">{customerName(view.customerId)}</strong></div>
              <div><span className="text-slate-400">Date:</span> <strong className="text-slate-700">{formatDateTime(view.createdAt)}</strong></div>
              <div><span className="text-slate-400">Status:</span> <Badge tone={statusTone(view.status)}>{view.status.replace(/_/g, " ")}</Badge></div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80"><tr><th className="p-2 text-left text-xs text-slate-500">Item</th><th className="p-2 text-right text-xs text-slate-500">Qty</th><th className="p-2 text-right text-xs text-slate-500">Price</th><th className="p-2 text-right text-xs text-slate-500">Total</th></tr></thead>
                <tbody>
                  {view.items.map((i) => <tr key={i.id} className="border-t border-slate-50"><td className="p-2">{i.name}</td><td className="p-2 text-right">{i.quantity}</td><td className="p-2 text-right">{formatMoney(i.price, currencySymbol)}</td><td className="p-2 text-right font-medium">{formatMoney(i.total, currencySymbol)}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="text-right space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatMoney(view.subtotal, currencySymbol)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{formatMoney(view.taxTotal, currencySymbol)}</span></div>
              <div className="flex justify-between text-lg font-semibold"><span>Total</span><span className="text-[#0070E0]">{formatMoney(view.total, currencySymbol)}</span></div>
              <div className="flex justify-between text-xs text-slate-400"><span>Paid</span><span>{formatMoney(view.amountPaid, currencySymbol)}</span></div>
              {view.balanceDue > 0 && <div className="flex justify-between text-xs text-amber-600"><span>Balance Due</span><span>{formatMoney(view.balanceDue, currencySymbol)}</span></div>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
