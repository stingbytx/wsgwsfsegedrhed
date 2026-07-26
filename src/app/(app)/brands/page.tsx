"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/form";
import { Modal, PageHeader, Badge, EmptyState } from "@/components/ui/primitives";
import { generateId, nowIso } from "@/lib/utils";
import { saveBrand, deleteBrand, listBrands } from "@/services/pim";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import type { Brand } from "@/types/pim";

export default function BrandsPage() {
  const db = useDb();
  const brands = useLiveQuery(() => (db ? listBrands(db) : Promise.resolve([])), [db]) ?? [];
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Brand | null>(null);

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Brands" subtitle={`${brands.length} brands`} actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Brand</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.length === 0 && <div className="col-span-full rounded-[20px] bg-white border border-slate-100 p-8"><EmptyState icon={Tag} title="No brands yet" /></div>}
        {brands.map((b) => (
          <div key={b.id} className="rounded-[20px] bg-white border border-slate-100 p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
              {b.logo ? <img src={b.logo} alt={b.name} className="h-full w-full object-cover" /> : <Tag className="h-5 w-5 text-slate-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate">{b.name}</p>
              <p className="text-xs text-slate-400 truncate">{b.description ?? "—"}</p>
              <Badge tone={b.status === "ACTIVE" ? "success" : "danger"}>{b.status}</Badge>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => { setEditing(b); setOpen(true); }} className="text-[#0070E0]"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={async () => { if (db && confirm("Delete brand?")) { await deleteBrand(db, b.id); toast.success("Deleted"); } }} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      {open && db && <BrandForm brand={editing} onClose={() => setOpen(false)} onSave={async (b) => { await saveBrand(db, b); toast.success("Brand saved"); setOpen(false); }} />}
    </div>
  );
}

function BrandForm({ brand, onClose, onSave }: { brand: Brand | null; onClose: () => void; onSave: (b: Brand) => Promise<void> }) {
  const [name, setName] = React.useState(brand?.name ?? "");
  const [description, setDescription] = React.useState(brand?.description ?? "");
  const [logo, setLogo] = React.useState<string | null>(brand?.logo ?? null);
  const [status, setStatus] = React.useState<Brand["status"]>(brand?.status ?? "ACTIVE");
  const handleLogo = (f: File) => { const r = new FileReader(); r.onload = () => setLogo(r.result as string); r.readAsDataURL(f); };
  return (
    <Modal open onClose={onClose} title={brand ? "Edit Brand" : "Add Brand"} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSave({ id: brand?.id ?? generateId(), name, description: description || undefined, logo, status, createdAt: brand?.createdAt ?? nowIso(), updatedAt: nowIso() })}>Save</Button></>}>
      <div className="space-y-3">
        <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Logo</Label><div className="flex items-center gap-3">{logo && <img src={logo} className="h-12 w-12 rounded-lg object-cover" alt="" />}<label className="cursor-pointer text-sm text-[#0070E0]">Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0])} /></label></div></div>
        <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        <div><Label>Status</Label><select value={status} onChange={(e) => setStatus(e.target.value as Brand["status"])} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
      </div>
    </Modal>
  );
}
