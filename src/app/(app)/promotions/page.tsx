"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/form";
import { Modal, PageHeader, Badge, EmptyState, statusTone } from "@/components/ui/primitives";
import { generateId, nowIso } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2, Megaphone } from "lucide-react";
import type { Promotion, PromotionType } from "@/types/pim";

const TYPES: { value: PromotionType; label: string }[] = [
  { value: "PERCENT", label: "Percentage Discount" },
  { value: "FIXED", label: "Fixed Discount" },
  { value: "BUY_X_GET_Y", label: "Buy X Get Y" },
  { value: "BUNDLE", label: "Bundle Discount" },
  { value: "HAPPY_HOUR", label: "Happy Hour" },
  { value: "WEEKEND", label: "Weekend Promotion" },
  { value: "FESTIVAL", label: "Festival Promotion" },
  { value: "LOYALTY", label: "Loyalty Discount" },
];

export default function PromotionsPage() {
  const db = useDb();
  const promos = useLiveQuery(() => (db ? db.promotions.toArray() : []), [db]) ?? [];
  const [open, setOpen] = React.useState(false);

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Promotions" subtitle={`${promos.length} promotions`} actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Promotion</Button>} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promos.length === 0 && <div className="col-span-full rounded-[20px] bg-white border border-slate-100 p-8"><EmptyState icon={Megaphone} title="No promotions yet" description="Create promotions like Buy 1 Get 1, percentage off, happy hour, etc." /></div>}
        {promos.map((p) => {
          const active = p.isActive && p.startDate <= nowIso() && p.endDate >= nowIso();
          return (
            <div key={p.id} className="rounded-[20px] bg-white border border-slate-100 p-5">
              <div className="flex justify-between items-start mb-2">
                <div><p className="font-semibold text-slate-800">{p.name}</p><p className="text-xs text-slate-400">{TYPES.find((t) => t.value === p.type)?.label}</p></div>
                <Badge tone={active ? "success" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="text-sm text-slate-600">
                {p.type === "PERCENT" || p.type === "HAPPY_HOUR" || p.type === "WEEKEND" || p.type === "FESTIVAL" || p.type === "LOYALTY" ? `${p.value}% off`
                  : p.type === "FIXED" ? `${p.value} off`
                  : p.type === "BUY_X_GET_Y" ? `Buy ${p.buyQty ?? 1} Get ${p.freeQty ?? 1} Free` : `${p.value}`}
              </p>
              <p className="text-xs text-slate-400 mt-2">{p.startDate.slice(0, 10)} → {p.endDate.slice(0, 10)}</p>
              <div className="flex justify-end mt-3">
                <button onClick={async () => { if (db && confirm("Delete promotion?")) { await db.promotions.delete(p.id); toast.success("Deleted"); } }} className="text-red-500 hover:underline text-xs inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          );
        })}
      </div>
      {open && db && <PromoForm onClose={() => setOpen(false)} onSave={async (p) => { await db.promotions.add(p); toast.success("Promotion created"); setOpen(false); }} />}
    </div>
  );
}

function PromoForm({ onClose, onSave }: { onClose: () => void; onSave: (p: Promotion) => Promise<void> }) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<PromotionType>("PERCENT");
  const [value, setValue] = React.useState("10");
  const [buyQty, setBuyQty] = React.useState("1");
  const [freeQty, setFreeQty] = React.useState("1");
  const [startDate, setStart] = React.useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEnd] = React.useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  return (
    <Modal open onClose={onClose} title="Add Promotion" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSave({ id: generateId(), name, type, value: Number(value) || 0, buyQty: Number(buyQty) || undefined, freeQty: Number(freeQty) || undefined, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), isActive: true, createdAt: nowIso() })}>Save</Button></>}>
      <div className="space-y-3">
        <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Sale" /></div>
        <div><Label>Type</Label><Select value={type} onChange={(e) => setType(e.target.value as PromotionType)}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></div>
        {type === "BUY_X_GET_Y" ? (
          <div className="grid grid-cols-2 gap-3"><div><Label>Buy Qty</Label><Input type="number" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} /></div><div><Label>Free Qty</Label><Input type="number" value={freeQty} onChange={(e) => setFreeQty(e.target.value)} /></div></div>
        ) : <div><Label>Value {type === "PERCENT" || type === "HAPPY_HOUR" || type === "WEEKEND" || type === "FESTIVAL" || type === "LOYALTY" ? "(%)" : "(amount)"}</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} /></div>}
        <div className="grid grid-cols-2 gap-3"><div><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} /></div><div><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} /></div></div>
      </div>
    </Modal>
  );
}
