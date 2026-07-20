"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { generateId, formatCurrency, nowIso } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { isOverLimit } from "@/lib/plan-limits";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const db = useDb();
  const plan = useAuthStore((s) => s.plan);
  const { currencySymbol } = useUIStore();
  const customers = useLiveQuery(() => (db ? db.customers.toArray() : []), [db]) ?? [];
  const [showForm, setShowForm] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleAddClick = () => {
    if (isOverLimit(plan, "customers", customers.length)) {
      setUpgradeOpen(true);
      return;
    }
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Customers</h1>
          <p className="text-sm text-slate-500">{customers.length} customers</p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Credit Balance</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No customers yet.
                  </td>
                </tr>
              )}
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0">
                  <td className="p-3 font-medium text-slate-700">{c.name}</td>
                  <td className="p-3 text-slate-500">{c.phone || "—"}</td>
                  <td className="p-3 text-slate-500">{c.email || "—"}</td>
                  <td className={`p-3 ${c.creditBalance > 0 ? "text-amber-600 font-medium" : "text-slate-500"}`}>
                    {formatCurrency(c.creditBalance, currencySymbol)}
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

      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} featureLabel="Unlimited Customers" />
    </div>
  );
}

function CustomerFormDialog({ onClose, onSave }: { onClose: () => void; onSave: (c: Customer) => Promise<void> }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    await onSave({
      id: generateId(),
      name,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      creditBalance: 0,
      createdAt: nowIso(),
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
        <h3 className="font-semibold text-slate-800 mb-4">Add Customer</h3>
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
        </div>
        <Button className="w-full mt-5" onClick={submit} loading={saving}>
          Save Customer
        </Button>
      </Card>
    </div>
  );
}
