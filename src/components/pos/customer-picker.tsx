"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { UserPlus, X, Search, User } from "lucide-react";
import { useDb } from "@/hooks/use-db";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateId, nowIso } from "@/lib/utils";
import { toast } from "sonner";
import type { Customer } from "@/types";

interface CustomerPickerProps {
  selectedCustomerId: string | null;
  onSelect: (customerId: string | null) => void;
}

/** Top-right customer search: type a name, pick a match, or register a new
 *  customer inline (typed name is prefilled) and select them immediately. */
export function CustomerPicker({ selectedCustomerId, onSelect }: CustomerPickerProps) {
  const db = useDb();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const customers = useLiveQuery(() => (db ? db.customers.toArray() : []), [db]) ?? [];
  const selected = customers.find((c) => c.id === selectedCustomerId) ?? null;

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 6);
  }, [customers, query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center gap-2 bg-[#0070E0]/10 text-[#0070E0] rounded-xl px-3 py-1.5 text-sm font-medium">
        <User className="h-3.5 w-3.5" />
        {selected.name}
        <button onClick={() => onSelect(null)} className="hover:text-[#003087]">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search customer by name…"
          className="pl-9 h-9"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>
      {open && query.trim() && (
        <Card className="absolute right-0 mt-1 w-72 z-20 p-2 max-h-72 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onSelect(c.id);
                setQuery("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-slate-700">{c.name}</p>
                {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
              </div>
            </button>
          ))}
          {results.length === 0 && (
            <p className="text-sm text-slate-400 px-3 py-2">No registered customer named &quot;{query}&quot;.</p>
          )}
          <button
            onClick={() => setRegisterOpen(true)}
            className="w-full mt-1 text-left px-3 py-2 rounded-lg hover:bg-[#0070E0]/5 flex items-center gap-2 text-sm font-medium text-[#0070E0] border-t border-slate-100"
          >
            <UserPlus className="h-4 w-4" /> Register &quot;{query}&quot; as new customer
          </button>
        </Card>
      )}

      {registerOpen && db && (
        <QuickRegisterDialog
          initialName={query}
          onClose={() => setRegisterOpen(false)}
          onSave={async (customer) => {
            await db.customers.add(customer);
            onSelect(customer.id);
            setQuery("");
            setOpen(false);
            setRegisterOpen(false);
            toast.success("Customer registered");
          }}
        />
      )}
    </div>
  );
}

function QuickRegisterDialog({
  initialName,
  onClose,
  onSave,
}: {
  initialName: string;
  onClose: () => void;
  onSave: (c: Customer) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    await onSave({
      id: generateId(),
      name: name.trim(),
      phone: phone || undefined,
      email: email || undefined,
      creditBalance: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-semibold text-slate-800 mb-4">Register New Customer</h3>
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
        </div>
        <Button className="w-full mt-5" onClick={submit} loading={saving}>
          Register &amp; Select
        </Button>
      </Card>
    </div>
  );
}
