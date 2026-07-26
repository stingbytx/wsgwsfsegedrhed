"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/form";
import { Modal, PageHeader, EmptyState } from "@/components/ui/primitives";
import { generateId, nowIso } from "@/lib/utils";
import { logAudit } from "@/services/audit";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import type { Supplier } from "@/types";

export default function SuppliersPage() {
  const db = useDb();
  const suppliers = useLiveQuery(() => (db ? db.suppliers.toArray() : []), [db]) ?? [];

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Supplier | null>(null);

  const columns: Column<Supplier>[] = [
    { key: "name", header: "Name", sortable: true, filterable: true, render: (s) => <span className="font-medium text-slate-800">{s.name}</span> },
    { key: "phone", header: "Phone", filterable: true, render: (s) => s.phone || "—" },
    { key: "email", header: "Email", filterable: true, render: (s) => s.email || "—" },
    { key: "address", header: "Address", render: (s) => s.address || "—" },
    { key: "createdAt", header: "Created", sortable: true, render: (s) => new Date(s.createdAt).toLocaleDateString() },
    {
      key: "actions", header: "Actions", align: "right",
      render: (s) => (
        <div className="flex justify-end gap-2">
          <button onClick={(e) => { e.stopPropagation(); setEditing(s); }} className="text-[#0070E0] hover:underline text-xs inline-flex items-center gap-1">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); removeSupplier(s.id); }}
            className="text-red-500 hover:underline text-xs inline-flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      ),
    },
  ];

  const removeSupplier = async (id: string) => {
    if (!db) return;
    if (!confirm("Delete this supplier?")) return;
    await db.suppliers.delete(id);
    await logAudit(db, { action: "DELETE", entity: "supplier", entityId: id });
    toast.success("Supplier deleted");
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} suppliers`}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Supplier</Button>}
      />
      <DataTable
        columns={columns}
        rows={suppliers}
        rowKey={(s) => s.id}
        searchKeys={["name", "phone", "email"]}
        dateFilterKey="createdAt"
        exportFilename="unipos-suppliers"
        exportTitle="Suppliers"
        emptyIcon={Truck}
        emptyTitle="No suppliers yet"
        emptyDescription="Add your first supplier to start creating purchase orders."
      />
      {(open || editing) && db && (
        <SupplierForm
          supplier={editing}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSave={async (s) => {
            if (editing) {
              await db.suppliers.update(editing.id, s);
              await logAudit(db, { action: "EDIT", entity: "supplier", entityId: s.id, oldValue: editing, newValue: s });
              toast.success("Supplier updated");
            } else {
              await db.suppliers.add(s);
              await logAudit(db, { action: "CREATE", entity: "supplier", entityId: s.id, newValue: s });
              toast.success("Supplier added");
            }
            setOpen(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function SupplierForm({ supplier, onClose, onSave }: { supplier: Supplier | null; onClose: () => void; onSave: (s: Supplier) => Promise<void> }) {
  const [name, setName] = React.useState(supplier?.name ?? "");
  const [phone, setPhone] = React.useState(supplier?.phone ?? "");
  const [email, setEmail] = React.useState(supplier?.email ?? "");
  const [address, setAddress] = React.useState(supplier?.address ?? "");
  const [notes, setNotes] = React.useState(supplier?.notes ?? "");
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    await onSave({
      id: supplier?.id ?? generateId(),
      name: name.trim(),
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      notes: notes || undefined,
      createdAt: supplier?.createdAt ?? nowIso(),
    });
    setSaving(false);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={supplier ? "Edit Supplier" : "Add Supplier"}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Save</Button></>}
    >
      <div className="space-y-3">
        <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supplier name" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 77 123 4567" /></div>
          <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="supplier@example.com" /></div>
        </div>
        <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" /></div>
        <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" rows={3} /></div>
      </div>
    </Modal>
  );
}
