"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { generateId, formatCurrency, nowIso } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { toast } from "sonner";
import { Plus, X, Pencil } from "lucide-react";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const db = useDb();
  const { currencySymbol } = useUIStore();
  const customers = useLiveQuery(() => (db ? db.customers.toArray() : []), [db]) ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Customers</h1>
          <p className="text-sm text-slate-500">{customers.length} customers</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Credit Balance</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No customers yet.
                  </td>
                </tr>
              )}
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="p-3 font-medium text-slate-800">{c.name}</td>
                  <td className="p-3 text-slate-600">{c.phone || "—"}</td>
                  <td className="p-3 text-slate-600">{c.email || "—"}</td>
                  <td className={`p-3 font-medium ${c.creditBalance > 0 ? "text-amber-600" : "text-slate-700"}`}>
                    {formatCurrency(c.creditBalance, currencySymbol)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setEditing(c)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#0070E0] hover:underline"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {showForm && db && (
        <CustomerFormDialog
          onClose={() => setShowForm(false)}
          onSave={async (c) => {
            await db.customers.add(c);
            toast.success("Customer added");
            setShowForm(false);
          }}
        />
      )}

      {editing && db && (
        <CustomerFormDialog
          customer={editing}
          onClose={() => setEditing(null)}
          onSave={async (c) => {
            await db.customers.update(editing.id, c);
            toast.success("Customer updated");
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function CustomerFormDialog({
  customer,
  onClose,
  onSave,
}: {
  customer?: Customer;
  onClose: () => void;
  onSave: (c: Customer) => Promise<void>;
}) {
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [creditBalance, setCreditBalance] = useState(customer ? String(customer.creditBalance) : "0");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    await onSave({
      id: customer?.id ?? generateId(),
      name,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      creditBalance: Number(creditBalance) || 0,
      notes: notes || undefined,
      createdAt: customer?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-semibold text-slate-800 mb-4">{customer ? "Edit Customer" : "Add Customer"}</h3>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" />
          </div>
          <div>
            <Label>Credit Balance</Label>
            <Input type="number" value={creditBalance} onChange={(e) => setCreditBalance(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>
        <Button className="w-full mt-5" onClick={submit} loading={saving}>
          {customer ? "Save Changes" : "Save Customer"}
        </Button>
      </Card>
    </div>
  );
}
