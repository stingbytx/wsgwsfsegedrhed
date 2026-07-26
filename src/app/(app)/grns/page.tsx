"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal, PageHeader, Badge, statusTone, EmptyState } from "@/components/ui/primitives";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney } from "@/lib/format";
import { listGRNs, createGRN, listPurchaseOrders, getPurchaseOrder } from "@/services/purchases";
import { printGRN } from "@/services/print";
import { toast } from "sonner";
import { Plus, Boxes, Printer, X } from "lucide-react";
import type { GRN, PurchaseOrder } from "@/types/enterprise";

export default function GRNsPage() {
  const db = useDb();
  const { currencySymbol } = useUIStore();
  const grns = useLiveQuery(() => (db ? listGRNs(db) : Promise.resolve([])), [db]) ?? [];
  const pos = useLiveQuery(() => (db ? listPurchaseOrders(db) : Promise.resolve([])), [db]) ?? [];

  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<GRN | null>(null);

  const columns: Column<GRN>[] = [
    { key: "grnNumber", header: "GRN #", sortable: true, filterable: true, render: (g) => <span className="font-mono text-xs text-slate-500">{g.grnNumber}</span> },
    { key: "poNumber", header: "PO #", render: (g) => g.poNumber ?? "—" },
    { key: "supplierName", header: "Supplier", sortable: true, filterable: true, render: (g) => g.supplierName ?? "—" },
    { key: "items", header: "Items", align: "center", value: (g) => g.items.length, render: (g) => g.items.length },
    { key: "total", header: "Total", align: "right", sortable: true, value: (g) => g.total, render: (g) => <span className="font-semibold text-slate-800">{formatMoney(g.total, currencySymbol)}</span> },
    { key: "status", header: "Status", sortable: true, render: (g) => <Badge tone={statusTone(g.status)}>{g.status}</Badge> },
    { key: "receivedAt", header: "Received", sortable: true, render: (g) => new Date(g.receivedAt).toLocaleDateString() },
    {
      key: "actions", header: "Actions", align: "right",
      render: (g) => (
        <div className="flex justify-end gap-2">
          <button onClick={(e) => { e.stopPropagation(); setView(g); }} className="text-[#0070E0] hover:underline text-xs">View</button>
          <button onClick={(e) => { e.stopPropagation(); printGRN(g, g.supplierName ?? "—", { currencySymbol }); }} className="text-slate-600 hover:underline text-xs inline-flex items-center gap-1"><Printer className="h-3 w-3" /> Print</button>
        </div>
      ),
    },
  ];

  const openPOs = pos.filter((p) => p.status === "ORDERED" || p.status === "PARTIAL");

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Goods Received Notes"
        subtitle={`${grns.length} GRNs`}
        actions={<Button onClick={() => setOpen(true)} disabled={openPOs.length === 0}><Plus className="h-4 w-4" /> Receive Goods</Button>}
      />
      {openPOs.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-3">
          No open purchase orders to receive. Create a PO first on the Purchase Orders page.
        </p>
      )}
      <DataTable
        columns={columns}
        rows={grns}
        rowKey={(g) => g.id}
        searchKeys={["grnNumber", "poNumber", "supplierName"]}
        dateFilterKey="receivedAt"
        statusFilterKey="status"
        statusOptions={["OPEN", "COMPLETED", "CANCELLED"]}
        exportFilename="unipos-grns"
        exportTitle="Goods Received Notes"
        emptyIcon={Boxes}
        emptyTitle="No GRNs yet"
        emptyDescription="Receive goods against a purchase order to create a GRN and update stock."
        onRowClick={(g) => setView(g)}
      />

      {open && db && (
        <ReceiveForm
          openPOs={openPOs}
          currencySymbol={currencySymbol}
          onClose={() => setOpen(false)}
          onLoadPO={async (id) => getPurchaseOrder(db, id)}
          onSave={async (input) => {
            const grn = await createGRN(db, input);
            toast.success(`GRN ${grn.grnNumber} created — stock updated`);
            setOpen(false);
            setView(grn);
          }}
        />
      )}

      {view && (
        <Modal open onClose={() => setView(null)} title={`GRN ${view.grnNumber}`} size="xl">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <div><span className="text-slate-400">PO:</span> <strong className="text-slate-700">{view.poNumber}</strong></div>
              <div><span className="text-slate-400">Supplier:</span> <strong className="text-slate-700">{view.supplierName}</strong></div>
              <div><span className="text-slate-400">Received:</span> <strong className="text-slate-700">{new Date(view.receivedAt).toLocaleString()}</strong></div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80"><tr>
                  <th className="p-2 text-left text-xs text-slate-500">Item</th>
                  <th className="p-2 text-left text-xs text-slate-500">SKU</th>
                  <th className="p-2 text-right text-xs text-slate-500">Qty Received</th>
                  <th className="p-2 text-right text-xs text-slate-500">Cost</th>
                  <th className="p-2 text-right text-xs text-slate-500">Total</th>
                </tr></thead>
                <tbody>
                  {view.items.map((i) => (
                    <tr key={i.id} className="border-t border-slate-50">
                      <td className="p-2">{i.name}</td>
                      <td className="p-2 font-mono text-xs text-slate-500">{i.sku}</td>
                      <td className="p-2 text-right">{i.quantityReceived}</td>
                      <td className="p-2 text-right">{formatMoney(i.cost, currencySymbol)}</td>
                      <td className="p-2 text-right font-medium">{formatMoney(i.total, currencySymbol)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right text-lg font-semibold text-slate-800">Total: {formatMoney(view.total, currencySymbol)}</div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => printGRN(view, view.supplierName ?? "—", { currencySymbol })}><Printer className="h-4 w-4" /> Print GRN</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ReceiveForm({ openPOs, currencySymbol, onClose, onLoadPO, onSave }: {
  openPOs: PurchaseOrder[]; currencySymbol: string; onClose: () => void;
  onLoadPO: (id: string) => Promise<PurchaseOrder | undefined>;
  onSave: (input: { purchaseOrderId: string; items: { poItemId: string; productId: string; name: string; sku: string; quantityReceived: number; cost: number }[] }) => Promise<void>;
}) {
  const [poId, setPoId] = React.useState("");
  const [po, setPo] = React.useState<PurchaseOrder | null>(null);
  const [recv, setRecv] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!poId) { setPo(null); return; }
    onLoadPO(poId).then((p) => { setPo(p ?? null); setRecv({}); });
  }, [poId, onLoadPO]);

  const submit = async () => {
    if (!po) return;
    const items = po.items
      .map((i) => ({ poItemId: i.id, productId: i.productId, name: i.name, sku: i.sku, quantityReceived: Number(recv[i.id] ?? 0), cost: i.cost }))
      .filter((i) => i.quantityReceived > 0);
    if (items.length === 0) { toast.error("Enter at least one received quantity"); return; }
    await onSave({ purchaseOrderId: po.id, items });
  };

  const total = po ? po.items.reduce((s, i) => s + (Number(recv[i.id] ?? 0) * i.cost), 0) : 0;

  return (
    <Modal open onClose={onClose} title="Receive Goods (GRN)" size="xl"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Create GRN — {formatMoney(total, currencySymbol)}</Button></>}>
      <div className="space-y-3">
        <div><Label>Purchase Order *</Label>
          <select value={poId} onChange={(e) => setPoId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
            <option value="">— Select PO —</option>
            {openPOs.map((p) => <option key={p.id} value={p.id}>{p.poNumber} — {p.supplierName} ({p.status})</option>)}
          </select>
        </div>
        {po && (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80"><tr>
                <th className="p-2 text-left text-xs text-slate-500">Item</th>
                <th className="p-2 text-right text-xs text-slate-500">Ordered</th>
                <th className="p-2 text-right text-xs text-slate-500">Already Received</th>
                <th className="p-2 text-right text-xs text-slate-500">Receive Now</th>
              </tr></thead>
              <tbody>
                {po.items.map((i) => (
                  <tr key={i.id} className="border-t border-slate-50">
                    <td className="p-2">{i.name}</td>
                    <td className="p-2 text-right">{i.quantityOrdered}</td>
                    <td className="p-2 text-right">{i.quantityReceived}</td>
                    <td className="p-2"><Input type="number" value={recv[i.id] ?? ""} onChange={(e) => setRecv((r) => ({ ...r, [i.id]: e.target.value }))} placeholder="0" className="h-8 w-24 ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!po && <EmptyState title="Select a purchase order to receive" />}
      </div>
    </Modal>
  );
}
