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
import { PremiumLock } from "@/components/billing/premium-lock";
import { toast } from "sonner";
import { Plus, Barcode, X } from "lucide-react";
import type { Product } from "@/types";

export default function InventoryPage() {
  const db = useDb();
  const plan = useAuthStore((s) => s.plan);
  const { currencySymbol } = useUIStore();
  const products = useLiveQuery(() => (db ? db.products.toArray() : []), [db]) ?? [];
  const [showForm, setShowForm] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleAddClick = () => {
    if (isOverLimit(plan, "products", products.length)) {
      setUpgradeOpen(true);
      return;
    }
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Inventory</h1>
          <p className="text-sm text-slate-500">{products.length} products</p>
        </div>
        <div className="flex gap-2">
          <PremiumLock label="Barcode Labels">
            <Button variant="outline" size="sm">
              <Barcode className="h-4 w-4" /> Barcode Labels
            </Button>
          </PremiumLock>
          <Button onClick={handleAddClick}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Stock</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No products yet. Add your first product to get started.
                  </td>
                </tr>
              )}
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="p-3 font-medium text-slate-700">{p.name}</td>
                  <td className="p-3 text-slate-500">{p.sku}</td>
                  <td className="p-3">{formatCurrency(p.price, currencySymbol)}</td>
                  <td className={`p-3 ${p.stock <= (p.lowStockThreshold ?? 5) ? "text-amber-600 font-medium" : ""}`}>{p.stock}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {showForm && db && <ProductFormDialog onClose={() => setShowForm(false)} onSave={async (p) => {
        await db.products.add(p);
        toast.success("Product added");
        setShowForm(false);
      }} />}

      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} featureLabel="Unlimited Products" />
    </div>
  );
}

function ProductFormDialog({ onClose, onSave }: { onClose: () => void; onSave: (p: Product) => Promise<void> }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name || !price) {
      toast.error("Name and price are required");
      return;
    }
    setSaving(true);
    await onSave({
      id: generateId(),
      name,
      sku: sku || generateId().slice(0, 8).toUpperCase(),
      barcode: barcode || undefined,
      price: Number(price),
      cost: cost ? Number(cost) : undefined,
      stock: stock ? Number(stock) : 0,
      lowStockThreshold: 5,
      isActive: true,
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
        <h3 className="font-semibold text-slate-800 mb-4">Add Product</h3>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>SKU</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Auto-generated" />
            </div>
            <div>
              <Label>Barcode</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Price</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Cost</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Stock</Label>
              <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>
        <Button className="w-full mt-5" onClick={submit} loading={saving}>
          Save Product
        </Button>
      </Card>
    </div>
  );
}
