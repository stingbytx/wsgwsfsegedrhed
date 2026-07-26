"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/form";
import { Modal, PageHeader, Badge, statusTone, EmptyState } from "@/components/ui/primitives";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney } from "@/lib/format";
import { createPurchaseOrder, cancelPurchaseOrder, listPurchaseOrders } from "@/services/purchases";
import { printPurchaseOrder } from "@/services/print";
import { logAudit } from "@/services/audit";
import { toast } from "sonner";
import { Plus, FileText, Printer, Ban, X, Trash2 } from "lucide-react";
import type { PurchaseOrder } from "@/types/enterprise";
import type { Product, Supplier } from "@/types";
import { generateId } from "@/lib/utils";

export default function PurchasesPage() {
  const db = useDb();
  const { currencySymbol } = useUIStore();
  const orders = useLiveQuery(() => (db ? listPurchaseOrders(db) : Promise.resolve([])), [db]) ?? [];
  const suppliers = useLiveQuery(() => (db ? db.suppliers.toArray() : []), [db]) ?? [];
  const products = useLiveQuery(() => (db ? db.products.toArray() : []), [db]) ?? [];

  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<PurchaseOrder | null>(null);

  const columns: Column<PurchaseOrder>[] = [
    { key: "poNumber", header: "PO #", sortable: true, filterable: true, render: (p) => <span className="font-mono text-xs text-slate-500">{p.poNumber}</span> },
    { key: "supplierName", header: "Supplier", sortable: true, filterable: true, render: (p) => p.supplierName ?? "—" },
    { key: "items", header: "Items", align: "center", value: (p) => p.items.length, render: (p) => p.items.length },
    { key: "total", header: "Total", align: "right", sortable: true, value: (p) => p.total, render: (p) => <span className="font-semibold text-slate-800">{formatMoney(p.total, currencySymbol)}</span> },
    { key: "status", header: "Status", sortable: true, render: (p) => <Badge tone={statusTone(p.status)}>{p.status.replace(/_/g, " ")}</Badge> },
    { key: "createdAt", header: "Date", sortable: true, render: (p) => new Date(p.createdAt).toLocaleDateString() },
    {
      key: "actions", header: "Actions", align: "right",
      render: (p) => (
        <div className="flex justify-end gap-2">
          <button onClick={(e) => { e.stopPropagation(); setView(p); }} className="text-[#0070E0] hover:underline text-xs">View</button>
          <button onClick={(e) => { e.stopPropagation(); print(p); }} className="text-slate-600 hover:underline text-xs inline-flex items-center gap-1"><Printer className="h-3 w-3" /> Print</button>
          {p.status !== "RECEIVED" && p.status !== "CANCELLED" && (
            <button onClick={(e) => { e.stopPropagation(); cancel(p.id); }} className="text-red-500 hover:underline text-xs inline-flex items-center gap-1"><Ban className="h-3 w-3" /> Cancel</button>
          )}
        </div>
      ),
    },
  ];

  const print = (p: PurchaseOrder) => printPurchaseOrder(p, p.supplierName ?? "—", { currencySymbol });
  const cancel = async (id: string) => {
    if (!db) return;
    if (!confirm("Cancel this purchase order?")) return;
    await cancelPurchaseOrder(db, id);
    await logAudit(db, { action: "EDIT", entity: "purchaseOrder", entityId: id, newValue: { status: "CANCELLED" } });
    toast.success("Purchase order cancelled");
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Purchase Orders"
        subtitle={`${orders.length} purchase orders`}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Purchase Order</Button>}
      />
      <DataTable
        columns={columns}
        rows={orders}
        rowKey={(p) => p.id}
        searchKeys={["poNumber", "supplierName"]}
        dateFilterKey="createdAt"
        statusFilterKey="status"
        statusOptions={["DRAFT", "ORDERED", "PARTIAL", "RECEIVED", "CANCELLED"]}
        exportFilename="unipos-purchase-orders"
        exportTitle="Purchase Orders"
        emptyIcon={FileText}
        emptyTitle="No purchase orders yet"
        emptyDescription="Create a PO to order stock from a supplier."
        onRowClick={(p) => setView(p)}
      />

      {open && db && (
        <POForm
          suppliers={suppliers}
          products={products}
          currencySymbol={currencySymbol}
          onClose={() => setOpen(false)}
          onSave={async (input) => {
            const po = await createPurchaseOrder(db, input);
            await logAudit(db, { action: "PURCHASE", entity: "purchaseOrder", entityId: po.id, newValue: { poNumber: po.poNumber } });
            toast.success(`Purchase order ${po.poNumber} created`);
            setOpen(false);
            setView(po);
          }}
        />
      )}

      {view && (
        <Modal open onClose={() => setView(null)} title={`Purchase Order ${view.poNumber}`} size="xl">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <div><span className="text-slate-400">Supplier:</span> <strong className="text-slate-700">{view.supplierName}</strong></div>
              <div><span className="text-slate-400">Status:</span> <Badge tone={statusTone(view.status)}>{view.status.replace(/_/g, " ")}</Badge></div>
              <div><span className="text-slate-400">Date:</span> <strong className="text-slate-700">{new Date(view.createdAt).toLocaleDateString()}</strong></div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80"><tr>
                  <th className="p-2 text-left text-xs text-slate-500">Item</th>
                  <th className="p-2 text-left text-xs text-slate-500">SKU</th>
                  <th className="p-2 text-right text-xs text-slate-500">Ordered</th>
                  <th className="p-2 text-right text-xs text-slate-500">Received</th>
                  <th className="p-2 text-right text-xs text-slate-500">Cost</th>
                  <th className="p-2 text-right text-xs text-slate-500">Total</th>
                </tr></thead>
                <tbody>
                  {view.items.map((i) => (
                    <tr key={i.id} className="border-t border-slate-50">
                      <td className="p-2">{i.name}</td>
                      <td className="p-2 font-mono text-xs text-slate-500">{i.sku}</td>
                      <td className="p-2 text-right">{i.quantityOrdered}</td>
                      <td className="p-2 text-right">{i.quantityReceived}</td>
                      <td className="p-2 text-right">{formatMoney(i.cost, currencySymbol)}</td>
                      <td className="p-2 text-right font-medium">{formatMoney(i.total, currencySymbol)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right text-lg font-semibold text-slate-800">Total: {formatMoney(view.total, currencySymbol)}</div>
            {view.notes && <p className="text-sm text-slate-500">{view.notes}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => print(view)}><Printer className="h-4 w-4" /> Print PO</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function POForm({ suppliers, products, currencySymbol, onClose, onSave }: {
  suppliers: Supplier[]; products: Product[]; currencySymbol: string;
  onClose: () => void; onSave: (input: { supplierId: string; supplierName?: string; items: { productId: string; name: string; sku: string; cost: number; quantityOrdered: number }[] }) => Promise<void>;
}) {
  const [supplierId, setSupplierId] = React.useState("");
  const [lines, setLines] = React.useState<{ id: string; productId: string; cost: string; qty: string }[]>([{ id: generateId(), productId: "", cost: "", qty: "1" }]);

  const addLine = () => setLines((l) => [...l, { id: generateId(), productId: "", cost: "", qty: "1" }]);
  const removeLine = (id: string) => setLines((l) => l.filter((x) => x.id !== id));
  const updateLine = (id: string, patch: Partial<{ productId: string; cost: string; qty: string }>) =>
    setLines((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const total = lines.reduce((s, l) => s + (Number(l.cost) || 0) * (Number(l.qty) || 0), 0);

  const submit = async () => {
    if (!supplierId) { toast.error("Select a supplier"); return; }
    const items = lines
      .filter((l) => l.productId && Number(l.qty) > 0)
      .map((l) => {
        const p = products.find((pr) => pr.id === l.productId)!;
        return { productId: p.id, name: p.name, sku: p.sku, cost: Number(l.cost) || p.cost || 0, quantityOrdered: Number(l.qty) };
      });
    if (items.length === 0) { toast.error("Add at least one line item"); return; }
    const supplier = suppliers.find((s) => s.id === supplierId);
    await onSave({ supplierId, supplierName: supplier?.name, items });
  };

  return (
    <Modal open onClose={onClose} title="New Purchase Order" size="xl"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Create PO — {formatMoney(total, currencySymbol)}</Button></>}>
      <div className="space-y-3">
        <div><Label>Supplier *</Label>
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— Select supplier —</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Line Items</Label>
            <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3" /> Add Line</Button>
          </div>
          {lines.map((l) => {
            const p = products.find((pr) => pr.id === l.productId);
            return (
              <div key={l.id} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select value={l.productId} onChange={(e) => {
                    const np = products.find((pr) => pr.id === e.target.value);
                    updateLine(l.id, { productId: e.target.value, cost: np ? String(np.cost ?? 0) : l.cost });
                  }}>
                    <option value="">— Select product —</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </Select>
                </div>
                <div className="w-28"><Input type="number" value={l.cost} onChange={(e) => updateLine(l.id, { cost: e.target.value })} placeholder="Cost" /></div>
                <div className="w-20"><Input type="number" value={l.qty} onChange={(e) => updateLine(l.id, { qty: e.target.value })} placeholder="Qty" /></div>
                <div className="w-28 text-right text-sm text-slate-600 pb-3">{formatMoney((Number(l.cost) || 0) * (Number(l.qty) || 0), currencySymbol)}</div>
                <button onClick={() => removeLine(l.id)} className="text-slate-400 hover:text-red-500 pb-3"><Trash2 className="h-4 w-4" /></button>
              </div>
            );
          })}
          {lines.length === 0 && <EmptyState title="No line items" />}
        </div>
        <div className="text-right text-lg font-semibold text-slate-800 border-t border-slate-100 pt-3">Total: {formatMoney(total, currencySymbol)}</div>
      </div>
    </Modal>
  );
}
