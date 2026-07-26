"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useDb } from "@/hooks/use-db";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/form";
import { Modal, PageHeader, Badge, statusTone } from "@/components/ui/primitives";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney, formatDateTime, toDateInput } from "@/lib/format";
import { generateId, nowIso } from "@/lib/utils";
import { generateEAN13, isDuplicateBarcode } from "@/services/barcode";
import { createProduct, updateProduct, validateProduct, duplicateProduct, archiveProduct, setProductStatus, bulkUpdate, bulkDelete, toggleFavorite, expiryStatus, expiryDays, profitMargin } from "@/services/pim";
import { parseCSV, buildImportPreview, commitImport, importTemplate, type ImportPreview } from "@/services/bulk-import";
import { printLabels, type LabelPaperSize } from "@/services/barcode-print";
import { exportCSV, exportExcel } from "@/services/export";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Copy, Archive, Barcode, Star, Upload, Download,
  Package, Boxes, History as HistoryIcon, Printer, X,
} from "lucide-react";
import type { Product } from "@/types";
import type { ProductPimExtension } from "@/types/pim";

type PimProduct = Product & Partial<ProductPimExtension>;

export default function ProductsPage() {
  const db = useDb();
  const router = useRouter();
  const { currencySymbol } = useUIStore();
  const products = useLiveQuery(() => (db ? db.products.toArray() : []), [db]) ?? [];
  const categories = useLiveQuery(() => (db ? db.categories.toArray() : []), [db]) ?? [];
  const brands = useLiveQuery(() => (db ? db.brands.toArray() : []), [db]) ?? [];
  const suppliers = useLiveQuery(() => (db ? db.suppliers.toArray() : []), [db]) ?? [];
  const warehouses = useLiveQuery(() => (db ? db.warehouses.toArray() : []), [db]) ?? [];

  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<PimProduct | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [printOpen, setPrintOpen] = React.useState<PimProduct | null>(null);
  const [filter, setFilter] = React.useState({ category: "", brand: "", supplier: "", stock: "", status: "", taxable: "", image: "" });

  const catName = (id?: string | null) => (id ? categories.find((c) => c.id === id)?.name ?? "—" : "—");
  const brandName = (id?: string | null) => (id ? brands.find((b) => b.id === id)?.name ?? "—" : "—");
  const supName = (id?: string | null) => (id ? suppliers.find((s) => s.id === id)?.name ?? "—" : "—");

  // Apply quick filters on top of DataTable search
  const filtered = React.useMemo(() => {
    return products.filter((p) => {
      const ext = p as PimProduct;
      if (filter.category && p.categoryId !== filter.category) return false;
      if (filter.brand && ext.brandId !== filter.brand) return false;
      if (filter.stock === "low" && !(p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 5))) return false;
      if (filter.stock === "out" && p.stock > 0) return false;
      if (filter.status && (ext.status ?? (p.isActive ? "ACTIVE" : "INACTIVE")) !== filter.status) return false;
      if (filter.taxable === "yes" && !(ext.taxPercent && ext.taxPercent > 0)) return false;
      if (filter.taxable === "no" && ext.taxPercent && ext.taxPercent > 0) return false;
      if (filter.image === "yes" && !p.image) return false;
      if (filter.image === "no" && p.image) return false;
      if (filter.stock === "expiring" && expiryStatus(p.expirationDate) === "NORMAL") return false;
      if (filter.stock === "expired" && expiryStatus(p.expirationDate) !== "EXPIRED") return false;
      return true;
    });
  }, [products, filter]);

  const toggleSelect = (id: string) => {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const columns: Column<PimProduct>[] = [
    {
      key: "select", header: "", width: "32px",
      render: (p) => <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />,
    },
    {
      key: "name", header: "Product", sortable: true, filterable: true,
      render: (p) => (
        <div className="flex items-center gap-2 min-w-[180px]">
          <div className="h-9 w-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
            {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-slate-300" />}
          </div>
          <div className="min-w-0">
            <button onClick={() => router.push(`/products/${p.id}`)} className="font-medium text-slate-800 hover:text-[#0070E0] truncate block">{p.name}</button>
            <p className="text-[11px] text-slate-400">{catName(p.categoryId)} • {brandName((p as PimProduct).brandId)}</p>
          </div>
        </div>
      ),
    },
    { key: "sku", header: "SKU", sortable: true, filterable: true, render: (p) => <span className="font-mono text-xs text-slate-500">{p.sku}</span> },
    { key: "barcode", header: "Barcode", filterable: true, render: (p) => <span className="font-mono text-xs text-slate-500">{p.barcode ?? "—"}</span> },
    { key: "price", header: "Price", align: "right", sortable: true, value: (p) => p.price, render: (p) => <span className="font-medium text-slate-800">{formatMoney(p.price, currencySymbol)}</span> },
    { key: "cost", header: "Cost", align: "right", sortable: true, value: (p) => p.cost ?? 0, render: (p) => <span className="text-slate-500">{formatMoney(p.cost ?? 0, currencySymbol)}</span> },
    { key: "margin", header: "Margin", align: "right", sortable: true, value: (p) => profitMargin(p.price, p.cost ?? 0), render: (p) => <span className={profitMargin(p.price, p.cost ?? 0) > 0 ? "text-emerald-600" : "text-red-500"}>{profitMargin(p.price, p.cost ?? 0).toFixed(0)}%</span> },
    { key: "stock", header: "Stock", align: "right", sortable: true, value: (p) => p.stock, render: (p) => <span className={p.stock <= (p.lowStockThreshold ?? 5) ? "text-amber-600 font-medium" : "text-slate-700"}>{p.stock}</span> },
    {
      key: "expiry", header: "Expiry", sortable: true, value: (p) => expiryDays(p.expirationDate) ?? 9999,
      render: (p) => { const s = expiryStatus(p.expirationDate); if (s === "NORMAL" && !p.expirationDate) return <span className="text-slate-300">—</span>; const tone = s === "EXPIRED" ? "danger" : s === "EXPIRING_SOON" ? "warning" : "success"; return <Badge tone={tone}>{expiryDays(p.expirationDate)}d</Badge>; },
    },
    {
      key: "status", header: "Status", sortable: true, value: (p) => (p as PimProduct).status ?? (p.isActive ? "ACTIVE" : "INACTIVE"),
      render: (p) => { const s = (p as PimProduct).status ?? (p.isActive ? "ACTIVE" : "INACTIVE"); return <Badge tone={statusTone(s)}>{s.replace(/_/g, " ")}</Badge>; },
    },
    { key: "createdAt", header: "Created", sortable: true, render: (p) => <span className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</span> },
    {
      key: "actions", header: "Actions", align: "right",
      render: (p) => (
        <div className="flex justify-end gap-1.5">
          <button title="View" onClick={() => router.push(`/products/${p.id}`)} className="text-slate-500 hover:text-[#0070E0]"><HistoryIcon className="h-3.5 w-3.5" /></button>
          <button title="Edit" onClick={() => setEditing(p)} className="text-[#0070E0] hover:scale-110"><Pencil className="h-3.5 w-3.5" /></button>
          <button title="Barcode" onClick={() => setPrintOpen(p)} className="text-slate-500 hover:text-[#0070E0]"><Barcode className="h-3.5 w-3.5" /></button>
          <button title="Favorite" onClick={() => toggleFavorite(db!, p.id)} className={p.isFavorite ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}><Star className="h-3.5 w-3.5" /></button>
          <button title="Duplicate" onClick={async () => { await duplicateProduct(db!, p.id); toast.success("Product duplicated"); }} className="text-slate-400 hover:text-slate-600"><Copy className="h-3.5 w-3.5" /></button>
          <button title="Archive" onClick={async () => { await archiveProduct(db!, p.id); toast.success("Archived"); }} className="text-slate-400 hover:text-slate-600"><Archive className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  const doExport = (fmt: "csv" | "excel") => {
    const rows = filtered.map((p) => ({
      Name: p.name, SKU: p.sku, Barcode: p.barcode ?? "", Category: catName(p.categoryId), Brand: brandName((p as PimProduct).brandId),
      Price: p.price, Cost: p.cost ?? 0, Stock: p.stock, Min: p.lowStockThreshold ?? 5, Status: (p as PimProduct).status ?? (p.isActive ? "ACTIVE" : "INACTIVE"),
    }));
    const headers = ["Name", "SKU", "Barcode", "Category", "Brand", "Price", "Cost", "Stock", "Min", "Status"];
    const base = `unipos-products-${new Date().toISOString().split("T")[0]}`;
    if (fmt === "csv") exportCSV(rows, headers, `${base}.csv`); else exportExcel(rows, headers, `${base}.xls`, "Products");
    toast.success(`${fmt.toUpperCase()} exported`);
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Products (PIM)"
        subtitle={`${products.length} products • ${selected.size} selected`}
        actions={<>
          <Button variant="outline" onClick={() => doExport("csv")}><Download className="h-4 w-4" /> CSV</Button>
          <Button variant="outline" onClick={() => doExport("excel")}><Download className="h-4 w-4" /> Excel</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import</Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Add Product</Button>
        </>}
      />

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-40"><Select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}><option value="">All Categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
        <div className="w-36"><Select value={filter.brand} onChange={(e) => setFilter({ ...filter, brand: e.target.value })}><option value="">All Brands</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></div>
        <div className="w-36"><Select value={filter.stock} onChange={(e) => setFilter({ ...filter, stock: e.target.value })}><option value="">All Stock</option><option value="low">Low Stock</option><option value="out">Out of Stock</option><option value="expiring">Expiring Soon</option><option value="expired">Expired</option></Select></div>
        <div className="w-36"><Select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}><option value="">All Status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option><option value="DISCONTINUED">Discontinued</option></Select></div>
        <div className="w-32"><Select value={filter.taxable} onChange={(e) => setFilter({ ...filter, taxable: e.target.value })}><option value="">All Tax</option><option value="yes">Taxable</option><option value="no">Non-Taxable</option></Select></div>
        <div className="w-32"><Select value={filter.image} onChange={(e) => setFilter({ ...filter, image: e.target.value })}><option value="">All Images</option><option value="yes">Has Image</option><option value="no">No Image</option></Select></div>
        {selected.size > 0 && <Button variant="outline" onClick={() => setBulkOpen(true)}><Boxes className="h-4 w-4" /> Bulk Actions ({selected.size})</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(p) => p.id}
        searchKeys={["name", "sku", "barcode"]}
        dateFilterKey="updatedAt"
        initialPageSize={25}
        exportFilename="unipos-products"
        exportTitle="Products"
        emptyIcon={Package}
        emptyTitle="No products"
        onRowClick={(p) => router.push(`/products/${p.id}`)}
      />

      {(showForm || editing) && db && (
        <ProductForm
          product={editing}
          categories={categories}
          brands={brands}
          suppliers={suppliers}
          warehouses={warehouses}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={async (p) => {
            const errs = await validateProduct(db, p, editing?.id);
            if (errs.length) { toast.error(errs.join(" • ")); throw new Error(errs.join(" • ")); }
            if (editing) { await updateProduct(db, editing.id, p); toast.success("Product updated"); }
            else { await createProduct(db, p as PimProduct); toast.success("Product added"); }
            setShowForm(false); setEditing(null);
          }}
        />
      )}

      {bulkOpen && db && (
        <BulkActionsDialog
          count={selected.size}
          onClose={() => setBulkOpen(false)}
          onApply={async (action, value) => {
            const ids = Array.from(selected);
            if (action === "delete") { if (!confirm(`Delete ${ids.length} products?`)) return; await bulkDelete(db, ids); toast.success("Deleted"); }
            else if (action === "archive") { await bulkUpdate(db, ids, { status: "ARCHIVED", isActive: false } as Partial<ProductPimExtension>); toast.success("Archived"); }
            else if (action === "activate") { await bulkUpdate(db, ids, { status: "ACTIVE", isActive: true } as Partial<ProductPimExtension>); toast.success("Activated"); }
            else if (action === "deactivate") { await bulkUpdate(db, ids, { status: "INACTIVE", isActive: false } as Partial<ProductPimExtension>); toast.success("Deactivated"); }
            else if (action === "category" && value) { await bulkUpdate(db, ids, { categoryId: value }); toast.success("Category updated"); }
            else if (action === "supplier" && value) { /* supplier is multi; skip */ toast.info("Use product profile for supplier updates"); }
            setSelected(new Set()); setBulkOpen(false);
          }}
          categories={categories}
        />
      )}

      {importOpen && db && (
        <ImportDialog onClose={() => setImportOpen(false)} db={db} />
      )}

      {printOpen && (
        <PrintLabelsDialog product={printOpen} currencySymbol={currencySymbol} onClose={() => setPrintOpen(null)} />
      )}
    </div>
  );
}

// ─── Product Form ──────────────────────────────────────────────────────────────────
function ProductForm({ product, categories, brands, suppliers, warehouses, onClose, onSave }: {
  product: PimProduct | null;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  warehouses: { id: string; name: string }[];
  onClose: () => void; onSave: (p: Partial<PimProduct>) => Promise<void>;
}) {
  const [name, setName] = React.useState(product?.name ?? "");
  const [sku, setSku] = React.useState(product?.sku ?? "");
  const [barcode, setBarcode] = React.useState(product?.barcode ?? "");
  const [categoryId, setCategoryId] = React.useState(product?.categoryId ?? "");
  const [brandId, setBrandId] = React.useState((product as PimProduct)?.brandId ?? "");
  const [description, setDescription] = React.useState((product as PimProduct)?.description ?? "");
  const [price, setPrice] = React.useState(product ? String(product.price) : "");
  const [cost, setCost] = React.useState(product?.cost !== undefined ? String(product.cost) : "");
  const [wholesalePrice, setWholesalePrice] = React.useState(String((product as PimProduct)?.wholesalePrice ?? ""));
  const [dealerPrice, setDealerPrice] = React.useState(String((product as PimProduct)?.dealerPrice ?? ""));
  const [specialPrice, setSpecialPrice] = React.useState(String((product as PimProduct)?.specialPrice ?? ""));
  const [discountPercent, setDiscountPercent] = React.useState(String((product as PimProduct)?.discountPercent ?? ""));
  const [stock, setStock] = React.useState(product ? String(product.stock) : "");
  const [lowStockThreshold, setLowStockThreshold] = React.useState(product?.lowStockThreshold !== undefined ? String(product.lowStockThreshold) : "5");
  const [unit, setUnit] = React.useState((product as PimProduct)?.unitId ?? "");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [taxPercent, setTaxPercent] = React.useState(String((product as PimProduct)?.taxPercent ?? ""));
  const [taxInclusive, setTaxInclusive] = React.useState((product as PimProduct)?.taxInclusive ?? false);
  const [status, setStatus] = React.useState<"ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED" | "DISCONTINUED">((product as PimProduct)?.status ?? "ACTIVE");
  const [expirationDate, setExpirationDate] = React.useState(product?.expirationDate ?? "");
  const [image, setImage] = React.useState<string | null>(product?.image ?? null);
  const [saving, setSaving] = React.useState(false);

  const margin = profitMargin(Number(price) || 0, Number(cost) || 0);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        id: product?.id ?? generateId(),
        name, sku: sku || generateId().slice(0, 8).toUpperCase(),
        barcode: barcode || undefined,
        categoryId: categoryId || null,
        price: Number(price) || 0, cost: cost ? Number(cost) : undefined,
        stock: stock ? Number(stock) : 0, lowStockThreshold: Number(lowStockThreshold) || 5,
        image: image ?? undefined, isActive: status === "ACTIVE", expirationDate: expirationDate || null,
        createdAt: product?.createdAt ?? nowIso(), updatedAt: nowIso(),
        brandId: brandId || null, description, unitId: unit || null,
        wholesalePrice: wholesalePrice ? Number(wholesalePrice) : undefined,
        dealerPrice: dealerPrice ? Number(dealerPrice) : undefined,
        specialPrice: specialPrice ? Number(specialPrice) : undefined,
        discountPercent: discountPercent ? Number(discountPercent) : undefined,
        taxPercent: taxPercent ? Number(taxPercent) : undefined, taxInclusive,
        status,
      } as Partial<PimProduct>);
    } catch { /* toast shown in parent */ }
    setSaving(false);
  };

  const handleImage = (file: File) => { const r = new FileReader(); r.onload = () => setImage(r.result as string); r.readAsDataURL(file); };

  return (
    <Modal open onClose={onClose} title={product ? "Edit Product" : "Add Product"} size="xl"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Save</Button></>}>
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="shrink-0">
            <div className="h-20 w-20 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
              {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-slate-300" />}
            </div>
            <label className="cursor-pointer mt-2 block text-xs text-[#0070E0] text-center">
              Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])} /></label>
          </div>
          <div className="flex-1 space-y-3">
            <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Auto" /></div>
              <div><Label>Barcode</Label><div className="flex gap-1.5"><Input value={barcode} onChange={(e) => setBarcode(e.target.value)} /><Button type="button" variant="outline" size="sm" onClick={() => setBarcode(generateEAN13())}>Gen</Button></div></div>
              <div><Label>Status</Label><Select value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED" | "DISCONTINUED")}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option><option value="DISCONTINUED">Discontinued</option></Select></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div><Label>Category</Label><Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
          <div><Label>Brand</Label><Select value={brandId} onChange={(e) => setBrandId(e.target.value)}><option value="">—</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></div>
          <div><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Piece" /></div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div><Label>Cost Price</Label><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
          <div><Label>Selling Price</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div><Label>Wholesale</Label><Input type="number" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} /></div>
          <div><Label>Dealer Price</Label><Input type="number" value={dealerPrice} onChange={(e) => setDealerPrice(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div><Label>Special Price</Label><Input type="number" value={specialPrice} onChange={(e) => setSpecialPrice(e.target.value)} /></div>
          <div><Label>Discount %</Label><Input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} /></div>
          <div><Label>Tax %</Label><Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} /></div>
          <div className="flex items-end pb-2.5"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={taxInclusive} onChange={(e) => setTaxInclusive(e.target.checked)} /> Tax Inclusive</label></div>
        </div>
        <div className="text-xs text-slate-500">Profit Margin: <span className={margin > 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>{margin.toFixed(1)}%</span></div>

        <div className="grid grid-cols-3 gap-3">
          <div><Label>Stock</Label><Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
          <div><Label>Min Stock</Label><Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} /></div>
          <div><Label>Expiry Date</Label><Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} /></div>
        </div>
        <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
      </div>
    </Modal>
  );
}

// ─── Bulk Actions ────────────────────────────────────────────────────────────────
function BulkActionsDialog({ count, categories, onClose, onApply }: {
  count: number; categories: { id: string; name: string }[];
  onClose: () => void; onApply: (action: string, value?: string) => Promise<void>;
}) {
  const [action, setAction] = React.useState("activate");
  const [value, setValue] = React.useState("");
  return (
    <Modal open onClose={onClose} title={`Bulk Actions — ${count} products`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onApply(action, value)}>Apply</Button></>}>
      <div className="space-y-3">
        <div><Label>Action</Label>
          <Select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="activate">Activate</option><option value="deactivate">Deactivate</option>
            <option value="archive">Archive</option><option value="delete">Delete</option>
            <option value="category">Update Category</option>
          </Select>
        </div>
        {action === "category" && <div><Label>Category</Label><Select value={value} onChange={(e) => setValue(e.target.value)}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>}
        <p className="text-xs text-amber-600">Destructive actions require confirmation.</p>
      </div>
    </Modal>
  );
}

// ─── Import Dialog ─────────────────────────────────────────────────────────────────
function ImportDialog({ db, onClose }: { db: import("@/lib/db").PosDatabase; onClose: () => void }) {
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    const text = await file.text();
    const rows = parseCSV(text);
    const p = await buildImportPreview(db, rows);
    setPreview(p);
    setBusy(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([importTemplate()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "unipos-products-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const commit = async () => {
    if (!preview) return;
    setBusy(true);
    const res = await commitImport(db, preview);
    toast.success(`Imported ${res.imported} products (${res.skipped} skipped)`);
    setBusy(false); onClose();
  };

  return (
    <Modal open onClose={onClose} title="Bulk Import Products" size="xl"
      footer={preview && <><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={commit} loading={busy}>Import {preview.valid} valid</Button></>}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="text-sm" />
          <Button variant="outline" size="sm" onClick={downloadTemplate}>Download Template</Button>
        </div>
        {preview && (
          <div className="space-y-2">
            <div className="flex gap-4 text-sm">
              <span className="text-slate-600">Total: <strong>{preview.total}</strong></span>
              <span className="text-emerald-600">Valid: <strong>{preview.valid}</strong></span>
              <span className="text-red-500">Invalid: <strong>{preview.invalid}</strong></span>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-100">
              <table className="w-full text-xs">
                <thead className="bg-slate-50/80 sticky top-0"><tr><th className="p-2 text-left">#</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">SKU</th><th className="p-2 text-left">Errors</th></tr></thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.rowIndex} className="border-t border-slate-50">
                      <td className="p-2">{r.rowIndex}</td>
                      <td className="p-2">{r.product?.name ?? "—"}</td>
                      <td className="p-2 font-mono">{r.product?.sku ?? "—"}</td>
                      <td className="p-2 text-red-500">{r.errors.join(" • ") || <span className="text-emerald-600">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Print Labels Dialog ───────────────────────────────────────────────────────────
function PrintLabelsDialog({ product, currencySymbol, onClose }: { product: PimProduct; currencySymbol: string; onClose: () => void }) {
  const [qty, setQty] = React.useState<number>(10);
  const [paper, setPaper] = React.useState<LabelPaperSize>("A4");
  const [showPrice, setShowPrice] = React.useState(true);
  const [showSku, setShowSku] = React.useState(true);

  return (
    <Modal open onClose={onClose} title={`Print Labels — ${product.name}`} size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => printLabels({ product, quantity: qty, paperSize: paper, showPrice, showSku, currencySymbol })}><Printer className="h-4 w-4" /> Print {qty}</Button></>}>
      <div className="space-y-3">
        <div><Label>Quantity</Label>
          <div className="flex flex-wrap gap-2">
            {[1, 10, 20, 50, 100].map((n) => <Button key={n} size="sm" variant={qty === n ? "primary" : "outline"} onClick={() => setQty(n)}>{n}</Button>)}
            <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} className="w-24" />
          </div>
        </div>
        <div><Label>Paper Size</Label><Select value={paper} onChange={(e) => setPaper(e.target.value as LabelPaperSize)}><option value="A4">A4</option><option value="58mm">Thermal 58mm</option><option value="80mm">Thermal 80mm</option></Select></div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> Show Price</label>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showSku} onChange={(e) => setShowSku(e.target.checked)} /> Show SKU</label>
        </div>
        <div className="rounded-xl border border-slate-100 p-3 text-xs text-slate-500 bg-slate-50/50">
          Barcode: <strong className="font-mono">{product.barcode ?? "(auto-generated)"}</strong> • {product.name} • {formatMoney(product.price, currencySymbol)}
        </div>
      </div>
    </Modal>
  );
}
