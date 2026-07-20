"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { generateId, formatCurrency, nowIso } from "@/lib/utils";
import { generateBarcodeValue } from "@/utils/barcode";
import { useUIStore } from "@/stores/ui-store";
import { BarcodeLabelsDialog } from "@/components/inventory/barcode-labels-dialog";
import { BarcodeCanvas } from "@/components/inventory/barcode-canvas";
import { toast } from "sonner";
import { Plus, Barcode, X, ImagePlus, Pencil } from "lucide-react";
import type { Product } from "@/types";

export default function InventoryPage() {
  const db = useDb();
  const { currencySymbol } = useUIStore();
  const products = useLiveQuery(() => (db ? db.products.toArray() : []), [db]) ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showLabels, setShowLabels] = useState(false);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Inventory</h1>
          <p className="text-sm text-slate-500">{products.length} products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowLabels(true)}>
            <Barcode className="h-4 w-4" /> Barcode Labels
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Stock</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No products yet. Add your first product to get started.
                  </td>
                </tr>
              )}
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="p-3 font-medium text-slate-800 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5 text-slate-300" />
                      )}
                    </div>
                    {p.name}
                  </td>
                  <td className="p-3 text-slate-600">{p.sku}</td>
                  <td className="p-3 text-slate-800">{formatCurrency(p.price, currencySymbol)}</td>
                  <td className={`p-3 font-medium ${p.stock <= (p.lowStockThreshold ?? 5) ? "text-amber-600" : "text-slate-800"}`}>{p.stock}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setEditing(p)}
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
        <ProductFormDialog
          onClose={() => setShowForm(false)}
          onSave={async (p) => {
            await db.products.add(p);
            toast.success("Product added");
            setShowForm(false);
          }}
        />
      )}

      {editing && db && (
        <ProductFormDialog
          product={editing}
          onClose={() => setEditing(null)}
          onSave={async (p) => {
            await db.products.update(editing.id, p);
            toast.success("Product updated");
            setEditing(null);
          }}
        />
      )}

      {showLabels && <BarcodeLabelsDialog products={products} onClose={() => setShowLabels(false)} />}
    </div>
  );
}

function ProductFormDialog({
  product,
  onClose,
  onSave,
}: {
  product?: Product;
  onClose: () => void;
  onSave: (p: Product) => Promise<void>;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [cost, setCost] = useState(product?.cost !== undefined ? String(product.cost) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "");
  const [lowStockThreshold, setLowStockThreshold] = useState(product?.lowStockThreshold !== undefined ? String(product.lowStockThreshold) : "5");
  const [image, setImage] = useState<string | null>(product?.image ?? null);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!name || !price) {
      toast.error("Name and price are required");
      return;
    }
    setSaving(true);
    await onSave({
      id: product?.id ?? generateId(),
      name,
      sku: sku || generateId().slice(0, 8).toUpperCase(),
      barcode: barcode || undefined,
      price: Number(price),
      cost: cost ? Number(cost) : undefined,
      stock: stock ? Number(stock) : 0,
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 5,
      image: image ?? undefined,
      isActive,
      createdAt: product?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-md p-6 relative my-8">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-semibold text-slate-800 mb-4">{product ? "Edit Product" : "Add Product"}</h3>
        <div className="space-y-3">
          <div>
            <Label>Product Image</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-slate-300" />
                )}
              </div>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-[#0070E0] border border-[#0070E0]/30 rounded-xl px-3 py-2 hover:bg-[#0070E0]/5">
                  <ImagePlus className="h-4 w-4" /> {image ? "Change Image" : "Upload Image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                />
              </label>
              {image && (
                <button type="button" onClick={() => setImage(null)} className="text-xs text-red-500 hover:underline">
                  Remove
                </button>
              )}
            </div>
          </div>
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
              <div className="flex gap-1.5">
                <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or generate" />
                <Button type="button" variant="outline" size="sm" onClick={() => setBarcode(generateBarcodeValue())}>
                  Gen
                </Button>
              </div>
            </div>
          </div>
          {barcode && (
            <div className="flex justify-center py-1">
              <BarcodeCanvas value={barcode} />
            </div>
          )}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Low Stock Alert At</Label>
              <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} placeholder="5" />
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active (visible in POS)
              </label>
            </div>
          </div>
        </div>
        <Button className="w-full mt-5" onClick={submit} loading={saving}>
          {product ? "Save Changes" : "Save Product"}
        </Button>
      </Card>
    </div>
  );
}
