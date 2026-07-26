"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/form";
import { Modal, PageHeader, StatCard } from "@/components/ui/primitives";
import { createExpense, deleteExpense } from "@/services/finance";
import { logAudit } from "@/services/audit";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney, toDateInput } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, Wallet, TrendingDown } from "lucide-react";
import type { Expense } from "@/types";
import type { ExpenseCategory as EC } from "@/types/enterprise";
import { generateId, nowIso } from "@/lib/utils";

export default function ExpensesPage() {
  const db = useDb();
  const { currencySymbol } = useUIStore();
  const expenses = useLiveQuery(() => (db ? db.expenses.toArray() : []), [db]) ?? [];
  const categories = useLiveQuery(() => (db ? db.expenseCategories.toArray() : []), [db]) ?? [];

  const [open, setOpen] = React.useState(false);
  const [catOpen, setCatOpen] = React.useState(false);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const columns: Column<Expense>[] = [
    { key: "category", header: "Category", sortable: true, filterable: true, render: (e) => <span className="font-medium text-slate-800">{e.category}</span> },
    { key: "description", header: "Description", filterable: true, render: (e) => e.description || "—" },
    { key: "amount", header: "Amount", align: "right", sortable: true, render: (e) => <span className="font-semibold text-slate-800">{formatMoney(e.amount, currencySymbol)}</span>, value: (e) => e.amount },
    { key: "date", header: "Date", sortable: true, render: (e) => e.date },
    {
      key: "actions", header: "Actions", align: "right",
      render: (e) => (
        <button onClick={(ev) => { ev.stopPropagation(); remove(e.id); }} className="text-red-500 hover:underline text-xs inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
      ),
    },
  ];

  const remove = async (id: string) => {
    if (!db) return;
    if (!confirm("Delete this expense?")) return;
    await deleteExpense(db, id);
    await logAudit(db, { action: "DELETE", entity: "expense", entityId: id });
    toast.success("Expense deleted");
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Expenses"
        subtitle={`${expenses.length} expense entries`}
        actions={<>
          <Button variant="outline" onClick={() => setCatOpen(true)}>Categories</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Expense</Button>
        </>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Expenses" value={formatMoney(total, currencySymbol)} icon={TrendingDown} tone="danger" />
        <StatCard label="Entries" value={String(expenses.length)} icon={Wallet} tone="info" />
        <StatCard label="Categories" value={String(categories.length)} icon={Wallet} tone="purple" />
      </div>

      <DataTable
        columns={columns}
        rows={expenses}
        rowKey={(e) => e.id}
        searchKeys={["category", "description"]}
        dateFilterKey="date"
        exportFilename="unipos-expenses"
        exportTitle="Expenses"
        emptyIcon={Wallet}
        emptyTitle="No expenses yet"
      />

      {open && db && (
        <ExpenseForm
          categories={categories}
          onClose={() => setOpen(false)}
          onSave={async (e) => {
            await createExpense(db, e);
            await logAudit(db, { action: "EXPENSE", entity: "expense", newValue: e });
            toast.success("Expense added");
            setOpen(false);
          }}
        />
      )}

      {catOpen && db && (
        <CategoryManager
          categories={categories}
          onClose={() => setCatOpen(false)}
          onSave={async (c) => {
            await db.expenseCategories.add(c);
            await logAudit(db, { action: "CREATE", entity: "expenseCategory", entityId: c.id, newValue: c });
            toast.success("Category added");
          }}
          onDelete={async (id) => {
            await db.expenseCategories.delete(id);
            toast.success("Category deleted");
          }}
        />
      )}
    </div>
  );
}

function ExpenseForm({ categories, onClose, onSave }: { categories: EC[]; onClose: () => void; onSave: (e: { category: string; description?: string; amount: number; date: string }) => Promise<void> }) {
  const [category, setCategory] = React.useState(categories[0]?.name ?? "");
  const [newCat, setNewCat] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(toDateInput());
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    const cat = (newCat.trim() || category).trim();
    if (!cat) { toast.error("Category is required"); return; }
    const amt = Number(amount);
    if (!(amt > 0)) { toast.error("Amount must be positive"); return; }
    setSaving(true);
    await onSave({ category: cat, description: description || undefined, amount: amt, date });
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Add Expense"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Save</Button></>}>
      <div className="space-y-3">
        <div><Label>Category *</Label>
          {categories.length > 0 ? (
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
          ) : (
            <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Rent, Utilities" />
          )}
        </div>
        {categories.length > 0 && (
          <div><Label>Or new category</Label><Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Leave blank to use selected" /></div>
        )}
        <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Amount *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
          <div><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
      </div>
    </Modal>
  );
}

function CategoryManager({ categories, onClose, onSave, onDelete }: {
  categories: EC[]; onClose: () => void;
  onSave: (c: EC) => Promise<void>; onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = React.useState("");
  return (
    <Modal open onClose={onClose} title="Expense Categories" size="md">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
          <Button onClick={async () => {
            if (!name.trim()) { toast.error("Name required"); return; }
            await onSave({ id: generateId(), name: name.trim(), createdAt: nowIso() });
            setName("");
          }}>Add</Button>
        </div>
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
          {categories.length === 0 && <p className="p-4 text-sm text-slate-400 text-center">No categories yet.</p>}
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3">
              <span className="text-sm text-slate-700">{c.name}</span>
              <button onClick={() => onDelete(c.id)} className="text-red-500 hover:underline text-xs">Delete</button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
