"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/form";
import { Modal, PageHeader, Badge } from "@/components/ui/primitives";
import { generateId, nowIso } from "@/lib/utils";
import { logAudit } from "@/services/audit";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Warehouse } from "lucide-react";
import type { Warehouse as WH } from "@/types/enterprise";

export default function WarehousesPage() {
  const db = useDb();
  const warehouses = useLiveQuery(() => (db ? db.warehouses.toArray() : []), [db]) ?? [];

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<WH | null>(null);

  const columns: Column<WH>[] = [
    { key: "code", header: "Code", sortable: true, filterable: true, render: (w) => <span className="font-mono text-xs text-slate-500">{w.code}</span> },
    { key: "name", header: "Name", sortable: true, filterable: true, render: (w) => <span className="font-medium text-slate-800">{w.name}</span> },
    { key: "address", header: "Address", render: (w) => w.address || "—" },
    { key: "phone", header: "Phone", render: (w) => w.phone || "—" },
    { key: "manager", header: "Manager", render: (w) => w.manager || "—" },
    { key: "isDefault", header: "Default", align: "center", render: (w) => w.isDefault ? <Badge tone="info">Default</Badge> : "—" },
    { key: "isActive", header: "Status", sortable: true, render: (w) => <Badge tone={w.isActive ? "success" : "danger"}>{w.isActive ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", header: "Actions", align: "right",
      render: (w) => (
        <div className="flex justify-end gap-2">
          <button onClick={(e) => { e.stopPropagation(); setEditing(w); }} className="text-[#0070E0] hover:underline text-xs inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</button>
          <button onClick={(e) => { e.stopPropagation(); remove(w.id, w.isDefault); }} className="text-red-500 hover:underline text-xs inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
        </div>
      ),
    },
  ];

  const remove = async (id: string, isDefault?: boolean) => {
    if (!db) return;
    if (isDefault) { toast.error("Cannot delete the default warehouse"); return; }
    if (!confirm("Delete this warehouse?")) return;
    await db.warehouses.delete(id);
    await logAudit(db, { action: "DELETE", entity: "warehouse", entityId: id });
    toast.success("Warehouse deleted");
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Warehouses"
        subtitle={`${warehouses.length} warehouses`}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Warehouse</Button>}
      />
      <DataTable
        columns={columns}
        rows={warehouses}
        rowKey={(w) => w.id}
        searchKeys={["name", "code", "address"]}
        exportFilename="unipos-warehouses"
        exportTitle="Warehouses"
        emptyIcon={Warehouse}
        emptyTitle="No warehouses yet"
      />
      {(open || editing) && db && (
        <WarehouseForm
          warehouse={editing}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSave={async (w) => {
            if (w.isDefault) {
              // ensure only one default
              const all = await db.warehouses.toArray();
              for (const other of all) if (other.id !== w.id && other.isDefault) await db.warehouses.update(other.id, { isDefault: false });
            }
            if (editing) {
              await db.warehouses.update(editing.id, w);
              await logAudit(db, { action: "EDIT", entity: "warehouse", entityId: w.id, oldValue: editing, newValue: w });
              toast.success("Warehouse updated");
            } else {
              await db.warehouses.add(w);
              await logAudit(db, { action: "CREATE", entity: "warehouse", entityId: w.id, newValue: w });
              toast.success("Warehouse added");
            }
            setOpen(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function WarehouseForm({ warehouse, onClose, onSave }: { warehouse: WH | null; onClose: () => void; onSave: (w: WH) => Promise<void> }) {
  const [code, setCode] = React.useState(warehouse?.code ?? "");
  const [name, setName] = React.useState(warehouse?.name ?? "");
  const [address, setAddress] = React.useState(warehouse?.address ?? "");
  const [phone, setPhone] = React.useState(warehouse?.phone ?? "");
  const [manager, setManager] = React.useState(warehouse?.manager ?? "");
  const [isDefault, setIsDefault] = React.useState(warehouse?.isDefault ?? false);
  const [isActive, setIsActive] = React.useState(warehouse?.isActive ?? true);
  const [notes, setNotes] = React.useState(warehouse?.notes ?? "");
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!code.trim()) { toast.error("Code is required"); return; }
    setSaving(true);
    await onSave({
      id: warehouse?.id ?? generateId(),
      code: code.trim(),
      name: name.trim(),
      address: address || undefined,
      phone: phone || undefined,
      manager: manager || undefined,
      isDefault,
      isActive,
      notes: notes || undefined,
      createdAt: warehouse?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={warehouse ? "Edit Warehouse" : "Add Warehouse"}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Save</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Code *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WH-01" /></div>
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Warehouse" /></div>
        </div>
        <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Manager</Label><Input value={manager} onChange={(e) => setManager(e.target.value)} /></div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Default warehouse</label>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label>
        </div>
        <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
      </div>
    </Modal>
  );
}
