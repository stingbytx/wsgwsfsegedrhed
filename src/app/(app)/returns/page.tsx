"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/form";
import { Modal, PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney } from "@/lib/format";
import { createSalesReturn, listReturns } from "@/services/returns";
import { toast } from "sonner";
import { Plus, Undo2 } from "lucide-react";
import type { SalesReturn, ReturnReason } from "@/types/enterprise";
import type { Order } from "@/types";

const REASONS: ReturnReason[] = ["DEFECTIVE", "WRONG_ITEM", "CUSTOMER_CHANGE", "DAMAGED", "OTHER"];

export default function ReturnsPage() {
  const db = useDb();
  const { currencySymbol } = useUIStore();
  const returns = useLiveQuery(() => (db ? listReturns(db) : Promise.resolve([])), [db]) ?? [];
  const orders = useLiveQuery(() => (db ? db.orders.toArray() : []), [db]) ?? [];

  const [open, setOpen] = React.useState(false);

  const columns: Column<SalesReturn>[] = [
    { key: "returnNumber", header: "Return #", sortable: true, filterable: true, render: (r) => <span className="font-mono text-xs text-slate-500">{r.returnNumber}</span> },
    { key: "orderNumber", header: "Order #", render: (r) => r.orderNumber ?? "—" },
    { key: "items", header: "Items", align: "center", value: (r) => r.items.length, render: (r) => r.items.length },
    { key: "total", header: "Refund Total", align: "right", sortable: true, value: (r) => r.total, render: (r) => <span className="font-semibold text-amber-600">{formatMoney(r.total, currencySymbol)}</span> },
    { key: "restock", header: "Restocked", align: "center", render: (r) => r.restock ? <Badge tone="success">Yes</Badge> : <Badge tone="neutral">No</Badge> },
    { key: "createdAt", header: "Date", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  const totalRefunded = returns.reduce((s, r) => s + r.total, 0);

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Sales Returns"
        subtitle={`${returns.length} returns • ${formatMoney(totalRefunded, currencySymbol)} refunded`}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Return</Button>}
      />
      <DataTable
        columns={columns}
        rows={returns}
        rowKey={(r) => r.id}
        searchKeys={["returnNumber", "orderNumber"]}
        dateFilterKey="createdAt"
        exportFilename="unipos-returns"
        exportTitle="Sales Returns"
        emptyIcon={Undo2}
        emptyTitle="No returns yet"
      />

      {open && db && (
        <ReturnForm
          orders={orders}
          currencySymbol={currencySymbol}
          onClose={() => setOpen(false)}
          onSave={async (input) => {
            const ret = await createSalesReturn(db, input);
            toast.success(`Return ${ret.returnNumber} created`);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ReturnForm({ orders, currencySymbol, onClose, onSave }: {
  orders: Order[]; currencySymbol: string; onClose: () => void;
  onSave: (input: { orderId: string; orderNumber?: string; customerId?: string | null; items: { orderItemId: string; productId: string; name: string; sku: string; quantity: number; price: number; reason: ReturnReason }[]; restock: boolean; notes?: string }) => Promise<void>;
}) {
  const [orderId, setOrderId] = React.useState("");
  const order = orders.find((o) => o.id === orderId);
  const [qty, setQty] = React.useState<Record<string, string>>({});
  const [reasons, setReasons] = React.useState<Record<string, ReturnReason>>({});
  const [restock, setRestock] = React.useState(true);
  const [notes, setNotes] = React.useState("");

  const submit = async () => {
    if (!order) { toast.error("Select an order"); return; }
    const items = order.items
      .filter((i) => Number(qty[i.id] ?? 0) > 0)
      .map((i) => ({
        orderItemId: i.id, productId: i.productId, name: i.name, sku: i.sku,
        quantity: Number(qty[i.id]), price: i.price, reason: reasons[i.id] ?? "OTHER",
      }));
    if (items.length === 0) { toast.error("Enter a return quantity for at least one item"); return; }
    await onSave({ orderId: order.id, orderNumber: order.orderNumber, customerId: order.customerId, items, restock, notes: notes || undefined });
  };

  const total = order ? order.items.reduce((s, i) => s + (Number(qty[i.id] ?? 0) * i.price), 0) : 0;

  return (
    <Modal open onClose={onClose} title="New Sales Return" size="xl"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Create Return — {formatMoney(total, currencySymbol)}</Button></>}>
      <div className="space-y-3">
        <div><Label>Order *</Label>
          <Select value={orderId} onChange={(e) => { setOrderId(e.target.value); setQty({}); setReasons({}); }}>
            <option value="">— Select order —</option>
            {orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((o) => (
              <option key={o.id} value={o.id}>{o.orderNumber} — {new Date(o.createdAt).toLocaleDateString()} — {formatMoney(o.total, currencySymbol)}</option>
            ))}
          </Select>
        </div>
        {order && (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80"><tr>
                <th className="p-2 text-left text-xs text-slate-500">Item</th>
                <th className="p-2 text-right text-xs text-slate-500">Sold Qty</th>
                <th className="p-2 text-right text-xs text-slate-500">Return Qty</th>
                <th className="p-2 text-left text-xs text-slate-500">Reason</th>
                <th className="p-2 text-right text-xs text-slate-500">Refund</th>
              </tr></thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id} className="border-t border-slate-50">
                    <td className="p-2">{i.name}</td>
                    <td className="p-2 text-right">{i.quantity}</td>
                    <td className="p-2"><Input type="number" value={qty[i.id] ?? ""} onChange={(e) => setQty((q) => ({ ...q, [i.id]: e.target.value }))} placeholder="0" className="h-8 w-20 ml-auto" max={i.quantity} /></td>
                    <td className="p-2">
                      <Select value={reasons[i.id] ?? "OTHER"} onChange={(e) => setReasons((r) => ({ ...r, [i.id]: e.target.value as ReturnReason }))} className="h-8 text-xs">
                        {REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                      </Select>
                    </td>
                    <td className="p-2 text-right">{formatMoney(Number(qty[i.id] ?? 0) * i.price, currencySymbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!order && <EmptyState title="Select an order to process a return" />}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Restock returned items</label>
        </div>
        <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
      </div>
    </Modal>
  );
}
