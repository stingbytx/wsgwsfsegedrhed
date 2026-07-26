"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/form";
import { Modal, Badge, statusTone, EmptyState, StatCard } from "@/components/ui/primitives";
import { useUIStore } from "@/stores/ui-store";
import { formatMoney, formatDateTime } from "@/lib/format";
import { generateId, nowIso } from "@/lib/utils";
import {
  listVariants, saveVariant, deleteVariant, listBatches, addBatch, listProductSuppliers,
  saveProductSupplier, getWarehouseStock, saveWarehouseStock, listProductImages,
  addProductImage, deleteProductImage, resizeImage, listPriceLevels, savePriceLevel,
  listRelatedProducts, saveRelatedProduct, getProductHistory, getProductValuation,
  getStockMovementSummary, expiryStatus, expiryDays, profitMargin,
} from "@/services/pim";
import { printLabels } from "@/services/barcode-print";
import { toast } from "sonner";
import {
  ArrowLeft, Package, Tag, Layers, Boxes, Truck, Warehouse, Image as ImageIcon,
  DollarSign, Link2, History, Plus, Trash2, Printer, TrendingUp, ShoppingCart,
} from "lucide-react";
import type { Product, Supplier } from "@/types";
import type { Warehouse as WH } from "@/types/enterprise";
import type { ProductVariant, Batch, ProductSupplier, WarehouseStock, PriceLevel, ProductHistoryEntry } from "@/types/pim";

const TABS = ["Overview", "Pricing", "Images", "Variants", "Batches", "Suppliers", "Warehouses", "Price Levels", "Related", "History"] as const;
type Tab = (typeof TABS)[number];

export default function ProductProfilePage() {
  const params = useParams();
  const router = useRouter();
  const db = useDb();
  const { currencySymbol } = useUIStore();
  const id = params.id as string;

  const product = useLiveQuery(() => db?.products.get(id), [db, id]);
  const categories = useLiveQuery(() => (db ? db.categories.toArray() : []), [db]) ?? [];
  const brands = useLiveQuery(() => (db ? db.brands.toArray() : []), [db]) ?? [];
  const suppliers = useLiveQuery(() => (db ? db.suppliers.toArray() : []), [db]) ?? [];
  const warehouses = useLiveQuery(() => (db ? db.warehouses.toArray() : []), [db]) ?? [];
  const allProducts = useLiveQuery(() => (db ? db.products.toArray() : []), [db]) ?? [];

  const [tab, setTab] = React.useState<Tab>("Overview");
  const [valuation, setValuation] = React.useState({ inventoryValue: 0, sellingValue: 0, potentialProfit: 0 });
  const [movements, setMovements] = React.useState({ purchased: 0, sold: 0, returned: 0, damaged: 0, adjusted: 0, transferred: 0, available: 0 });

  React.useEffect(() => {
    if (!db || !product) return;
    getProductValuation(db, id).then(setValuation);
    getStockMovementSummary(db, id).then(setMovements);
  }, [db, id, product]);

  if (!db) return <div className="p-6 text-slate-400">Loading…</div>;
  if (!product) return <div className="p-6"><EmptyState icon={Package} title="Product not found" /></div>;

  const catName = categories.find((c) => c.id === product.categoryId)?.name ?? "—";
  const brandName = brands.find((b) => b.id === (product as { brandId?: string }).brandId)?.name ?? "—";
  const margin = profitMargin(product.price, product.cost ?? 0);
  const ext = product as Product & Record<string, unknown>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/products")}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            {product.name}
            <Badge tone={statusTone((ext.status as string) ?? (product.isActive ? "ACTIVE" : "INACTIVE"))}>{((ext.status as string) ?? (product.isActive ? "ACTIVE" : "INACTIVE")).replace(/_/g, " ")}</Badge>
          </h1>
          <p className="text-sm text-slate-500">{product.sku} • {catName} • {brandName}</p>
        </div>
        <Button variant="outline" onClick={() => printLabels({ product, quantity: 10, paperSize: "A4", currencySymbol })}><Printer className="h-4 w-4" /> Print Labels</Button>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b border-slate-100">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-[#0070E0] text-[#0070E0]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{t}</button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-[20px] bg-white border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-700 mb-3">Basic Information</h3>
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                <Info label="Product Code" value={product.sku} />
                <Info label="Barcode" value={product.barcode ?? "—"} />
                <Info label="Category" value={catName} />
                <Info label="Brand" value={brandName} />
                <Info label="Unit" value={(ext.unitId as string) ?? "Piece"} />
                <Info label="Status" value={((ext.status as string) ?? "ACTIVE") as string} />
                <Info label="Created" value={formatDateTime(product.createdAt)} />
                <Info label="Last Updated" value={formatDateTime(product.updatedAt)} />
              </dl>
              {ext.description ? <p className="text-sm text-slate-600 mt-4 pt-4 border-t border-slate-100">{ext.description as string}</p> : null}
            </div>
            <div className="rounded-[20px] bg-white border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-700 mb-3">Stock Movement Summary</h3>
              <div className="grid grid-cols-4 gap-3 text-center">
                <Mini label="Purchased" value={movements.purchased} tone="text-emerald-600" />
                <Mini label="Sold" value={movements.sold} tone="text-[#0070E0]" />
                <Mini label="Returned" value={movements.returned} tone="text-amber-600" />
                <Mini label="Damaged" value={movements.damaged} tone="text-red-500" />
                <Mini label="Adjusted" value={movements.adjusted} tone="text-slate-600" />
                <Mini label="Transferred" value={movements.transferred} tone="text-purple-600" />
                <Mini label="Available" value={movements.available} tone="text-slate-800" />
                <Mini label="Reorder?" value={movements.available <= (product.lowStockThreshold ?? 5) ? "Yes" : "No"} tone={movements.available <= (product.lowStockThreshold ?? 5) ? "text-amber-600" : "text-slate-400"} />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-[20px] bg-white border border-slate-100 p-5">
              {product.image ? <img src={product.image} alt={product.name} className="w-full h-40 object-cover rounded-xl mb-3" /> : <div className="w-full h-40 bg-slate-50 rounded-xl flex items-center justify-center mb-3"><Package className="h-10 w-10 text-slate-300" /></div>}
              <dl className="space-y-2 text-sm">
                <Info label="Stock" value={String(product.stock)} />
                <Info label="Min Stock" value={String(product.lowStockThreshold ?? 5)} />
                <Info label="Expiry" value={product.expirationDate ? `${expiryDays(product.expirationDate)}d (${expiryStatus(product.expirationDate).replace(/_/g, " ")})` : "—"} />
              </dl>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <StatCard label="Inventory Value" value={formatMoney(valuation.inventoryValue, currencySymbol)} icon={Warehouse} tone="info" />
              <StatCard label="Selling Value" value={formatMoney(valuation.sellingValue, currencySymbol)} icon={TrendingUp} tone="success" />
              <StatCard label="Potential Profit" value={formatMoney(valuation.potentialProfit, currencySymbol)} icon={DollarSign} tone="purple" />
            </div>
          </div>
        </div>
      )}

      {tab === "Pricing" && (
        <div className="rounded-[20px] bg-white border border-slate-100 p-5 max-w-2xl">
          <h3 className="font-semibold text-slate-700 mb-3">Pricing</h3>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <Info label="Cost Price" value={formatMoney(product.cost ?? 0, currencySymbol)} />
            <Info label="Selling Price" value={formatMoney(product.price, currencySymbol)} />
            <Info label="Wholesale" value={formatMoney(Number(ext.wholesalePrice ?? 0), currencySymbol)} />
            <Info label="Dealer Price" value={formatMoney(Number(ext.dealerPrice ?? 0), currencySymbol)} />
            <Info label="Special Price" value={formatMoney(Number(ext.specialPrice ?? 0), currencySymbol)} />
            <Info label="Discount %" value={`${ext.discountPercent ?? 0}%`} />
            <Info label="Profit" value={formatMoney(product.price - (product.cost ?? 0), currencySymbol)} />
            <Info label="Profit Margin" value={`${margin.toFixed(1)}%`} />
            <Info label="Tax %" value={`${ext.taxPercent ?? 0}%`} />
            <Info label="Tax Inclusive" value={ext.taxInclusive ? "Yes" : "No"} />
          </dl>
        </div>
      )}

      {tab === "Images" && <ImagesTab productId={id} />}
      {tab === "Variants" && <VariantsTab productId={id} currencySymbol={currencySymbol} />}
      {tab === "Batches" && <BatchesTab productId={id} suppliers={suppliers} warehouses={warehouses} currencySymbol={currencySymbol} />}
      {tab === "Suppliers" && <SuppliersTab productId={id} suppliers={suppliers} currencySymbol={currencySymbol} />}
      {tab === "Warehouses" && <WarehousesTab productId={id} warehouses={warehouses} currencySymbol={currencySymbol} />}
      {tab === "Price Levels" && <PriceLevelsTab productId={id} currencySymbol={currencySymbol} />}
      {tab === "Related" && <RelatedTab productId={id} products={allProducts.filter((p) => p.id !== id)} />}
      {tab === "History" && <HistoryTab productId={id} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <><dt className="text-slate-400">{label}</dt><dd className="text-slate-700 font-medium">{value}</dd></>;
}
function Mini({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return <div><p className={`text-lg font-semibold ${tone}`}>{value}</p><p className="text-[11px] text-slate-400">{label}</p></div>;
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────────
function ImagesTab({ productId }: { productId: string }) {
  const db = useDb();
  const images = useLiveQuery(() => (db ? listProductImages(db, productId) : Promise.resolve([])), [db, productId]) ?? [];
  const [busy, setBusy] = React.useState(false);
  const handleUpload = async (file: File) => {
    if (!db) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const resized = await resizeImage(reader.result as string, 800);
      await addProductImage(db, { productId, url: resized, isMain: images.length === 0, order: images.length });
      setBusy(false);
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="rounded-[20px] bg-white border border-slate-100 p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-slate-700">Gallery</h3>
        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 h-8 rounded-2xl bg-[#0070E0] text-white text-sm font-medium hover:bg-[#005fc4]"><Plus className="h-3.5 w-3.5" /> Upload<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { for (const f of Array.from(e.target.files ?? [])) handleUpload(f); }} /></label>
      </div>
      {busy && <p className="text-xs text-slate-400 mb-2">Processing…</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {images.length === 0 && <p className="text-sm text-slate-400 col-span-full">No images yet.</p>}
        {images.map((img) => (
          <div key={img.id} className="relative group">
            <img src={img.url} alt="" className="w-full h-32 object-cover rounded-xl border border-slate-100" />
            {img.isMain && <span className="absolute top-1 left-1 bg-[#0070E0] text-white text-[10px] px-1.5 py-0.5 rounded">Main</span>}
            <button onClick={() => db && deleteProductImage(db, img.id)} className="absolute top-1 right-1 bg-white/80 rounded p-1 opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3 text-red-500" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VariantsTab({ productId, currencySymbol }: { productId: string; currencySymbol: string }) {
  const db = useDb();
  const variants = useLiveQuery(() => (db ? listVariants(db, productId) : Promise.resolve([])), [db, productId]) ?? [];
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-[20px] bg-white border border-slate-100 p-5">
      <div className="flex justify-between items-center mb-3"><h3 className="font-semibold text-slate-700">Variants</h3><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Add Variant</Button></div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-400 border-b border-slate-100"><th className="p-2">Axis</th><th className="p-2">Value</th><th className="p-2">SKU</th><th className="p-2">Barcode</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Stock</th><th className="p-2"></th></tr></thead>
        <tbody>
          {variants.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-slate-400">No variants</td></tr>}
          {variants.map((v) => (
            <tr key={v.id} className="border-t border-slate-50">
              <td className="p-2"><Badge tone="info">{v.axis}</Badge></td><td className="p-2">{v.value}</td><td className="p-2 font-mono text-xs">{v.sku}</td><td className="p-2 font-mono text-xs">{v.barcode ?? "—"}</td>
              <td className="p-2 text-right">{formatMoney(v.price, currencySymbol)}</td><td className="p-2 text-right">{v.stock}</td>
              <td className="p-2 text-right"><button onClick={() => db && deleteVariant(db, v.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {open && db && <VariantForm productId={productId} onClose={() => setOpen(false)} onSave={async (v) => { await saveVariant(db, v); setOpen(false); toast.success("Variant added"); }} />}
    </div>
  );
}

function VariantForm({ productId, onClose, onSave }: { productId: string; onClose: () => void; onSave: (v: ProductVariant) => Promise<void> }) {
  const [axis, setAxis] = React.useState<ProductVariant["axis"]>("SIZE");
  const [value, setValue] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [stock, setStock] = React.useState("");
  return (
    <Modal open onClose={onClose} title="Add Variant" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSave({ id: generateId(), productId, axis, value, sku, barcode, price: Number(price) || 0, cost: Number(cost) || 0, stock: Number(stock) || 0, isActive: true, createdAt: nowIso(), updatedAt: nowIso() })}>Save</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Axis</Label><Select value={axis} onChange={(e) => setAxis(e.target.value as ProductVariant["axis"])}><option value="SIZE">Size</option><option value="COLOR">Color</option><option value="MODEL">Model</option><option value="STORAGE">Storage</option><option value="RAM">RAM</option><option value="FLAVOR">Flavor</option><option value="CAPACITY">Capacity</option><option value="OTHER">Other</option></Select></div>
          <div><Label>Value *</Label><Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Red / XL / 256GB" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3"><div><Label>SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} /></div><div><Label>Barcode</Label><Input value={barcode} onChange={(e) => setBarcode(e.target.value)} /></div></div>
        <div className="grid grid-cols-3 gap-3"><div><Label>Price</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div><div><Label>Cost</Label><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></div><div><Label>Stock</Label><Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></div></div>
      </div>
    </Modal>
  );
}

function BatchesTab({ productId, suppliers, warehouses, currencySymbol }: { productId: string; suppliers: Supplier[]; warehouses: WH[]; currencySymbol: string }) {
  const db = useDb();
  const batches = useLiveQuery(() => (db ? listBatches(db, productId) : Promise.resolve([])), [db, productId]) ?? [];
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-[20px] bg-white border border-slate-100 p-5">
      <div className="flex justify-between items-center mb-3"><h3 className="font-semibold text-slate-700">Batches (FIFO)</h3><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Add Batch</Button></div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-400 border-b border-slate-100"><th className="p-2">Batch #</th><th className="p-2">Supplier</th><th className="p-2">Expiry</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Cost</th></tr></thead>
        <tbody>
          {batches.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-400">No batches</td></tr>}
          {batches.map((b) => (
            <tr key={b.id} className="border-t border-slate-50">
              <td className="p-2 font-mono text-xs">{b.batchNumber}</td><td className="p-2">{suppliers.find((s) => s.id === b.supplierId)?.name ?? "—"}</td>
              <td className="p-2">{b.expiryDate ? <Badge tone={expiryStatus(b.expiryDate) === "EXPIRED" ? "danger" : expiryStatus(b.expiryDate) === "EXPIRING_SOON" ? "warning" : "success"}>{expiryDays(b.expiryDate)}d</Badge> : "—"}</td>
              <td className="p-2 text-right">{b.quantity}</td><td className="p-2 text-right">{formatMoney(b.cost, currencySymbol)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {open && db && <BatchForm productId={productId} suppliers={suppliers} warehouses={warehouses} onClose={() => setOpen(false)} onSave={async (b) => { await addBatch(db, b); setOpen(false); toast.success("Batch added"); }} />}
    </div>
  );
}

function BatchForm({ productId, suppliers, warehouses, onClose, onSave }: { productId: string; suppliers: Supplier[]; warehouses: WH[]; onClose: () => void; onSave: (b: Omit<Batch, "id" | "createdAt">) => Promise<void> }) {
  const [batchNumber, setBatchNumber] = React.useState(`BATCH-${Date.now().toString().slice(-6)}`);
  const [supplierId, setSupplierId] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");
  return (
    <Modal open onClose={onClose} title="Add Batch" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSave({ productId, batchNumber, supplierId: supplierId || null, purchaseDate, expiryDate: expiryDate || null, cost: Number(cost) || 0, quantity: Number(quantity) || 0, warehouseId: warehouseId || null })}>Save</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3"><div><Label>Batch Number</Label><Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} /></div><div><Label>Supplier</Label><Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Purchase Date</Label><Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></div><div><Label>Expiry Date</Label><Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></div></div>
        <div className="grid grid-cols-3 gap-3"><div><Label>Cost</Label><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></div><div><Label>Quantity</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div><div><Label>Warehouse</Label><Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}><option value="">—</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div></div>
      </div>
    </Modal>
  );
}

function SuppliersTab({ productId, suppliers, currencySymbol }: { productId: string; suppliers: Supplier[]; currencySymbol: string }) {
  const db = useDb();
  const list = useLiveQuery(() => (db ? listProductSuppliers(db, productId) : Promise.resolve([])), [db, productId]) ?? [];
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-[20px] bg-white border border-slate-100 p-5">
      <div className="flex justify-between items-center mb-3"><h3 className="font-semibold text-slate-700">Suppliers</h3><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Add Supplier</Button></div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-400 border-b border-slate-100"><th className="p-2">Supplier</th><th className="p-2 text-right">Last Price</th><th className="p-2">Delivery</th><th className="p-2">MOQ</th><th className="p-2">Preferred</th></tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-400">No suppliers linked</td></tr>}
          {list.map((ps) => (
            <tr key={ps.id} className="border-t border-slate-50">
              <td className="p-2">{suppliers.find((s) => s.id === ps.supplierId)?.name ?? "—"}</td>
              <td className="p-2 text-right">{formatMoney(ps.lastPurchasePrice, currencySymbol)}</td>
              <td className="p-2">{ps.deliveryTimeDays ? `${ps.deliveryTimeDays}d` : "—"}</td>
              <td className="p-2">{ps.minimumOrderQuantity ?? "—"}</td>
              <td className="p-2">{ps.isPreferred ? <Badge tone="success">Yes</Badge> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {open && db && <ProductSupplierForm productId={productId} suppliers={suppliers} onClose={() => setOpen(false)} onSave={async (ps) => { await saveProductSupplier(db, ps); setOpen(false); toast.success("Supplier added"); }} />}
    </div>
  );
}

function ProductSupplierForm({ productId, suppliers, onClose, onSave }: { productId: string; suppliers: Supplier[]; onClose: () => void; onSave: (ps: ProductSupplier) => Promise<void> }) {
  const [supplierId, setSupplierId] = React.useState("");
  const [lastPurchasePrice, setLastPrice] = React.useState("");
  const [deliveryTimeDays, setDelivery] = React.useState("");
  const [minimumOrderQuantity, setMoq] = React.useState("");
  const [isPreferred, setPreferred] = React.useState(false);
  return (
    <Modal open onClose={onClose} title="Add Supplier" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSave({ id: generateId(), productId, supplierId, lastPurchasePrice: Number(lastPurchasePrice) || 0, deliveryTimeDays: Number(deliveryTimeDays) || undefined, minimumOrderQuantity: Number(minimumOrderQuantity) || undefined, isPreferred, createdAt: nowIso() })}>Save</Button></>}>
      <div className="space-y-3">
        <div><Label>Supplier</Label><Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
        <div className="grid grid-cols-3 gap-3"><div><Label>Last Price</Label><Input type="number" value={lastPurchasePrice} onChange={(e) => setLastPrice(e.target.value)} /></div><div><Label>Delivery (days)</Label><Input type="number" value={deliveryTimeDays} onChange={(e) => setDelivery(e.target.value)} /></div><div><Label>MOQ</Label><Input type="number" value={minimumOrderQuantity} onChange={(e) => setMoq(e.target.value)} /></div></div>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={isPreferred} onChange={(e) => setPreferred(e.target.checked)} /> Preferred supplier</label>
      </div>
    </Modal>
  );
}

function WarehousesTab({ productId, warehouses, currencySymbol }: { productId: string; warehouses: WH[]; currencySymbol: string }) {
  const db = useDb();
  const stock = useLiveQuery(() => (db ? getWarehouseStock(db, productId) : Promise.resolve([])), [db, productId]) ?? [];
  const addRow = async (wh: WH) => { if (!db) return; await saveWarehouseStock(db, { id: generateId(), productId, warehouseId: wh.id, stock: 0, reservedStock: 0, minStock: 5, maxStock: 100, reorderLevel: 10, updatedAt: nowIso() }); };
  return (
    <div className="rounded-[20px] bg-white border border-slate-100 p-5">
      <h3 className="font-semibold text-slate-700 mb-3">Warehouse Stock</h3>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-400 border-b border-slate-100"><th className="p-2">Warehouse</th><th className="p-2 text-right">Stock</th><th className="p-2 text-right">Reserved</th><th className="p-2 text-right">Reorder</th><th className="p-2 text-right">Max</th></tr></thead>
        <tbody>
          {stock.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-400">No warehouse stock records</td></tr>}
          {stock.map((ws) => (
            <tr key={ws.id} className="border-t border-slate-50">
              <td className="p-2">{warehouses.find((w) => w.id === ws.warehouseId)?.name ?? ws.warehouseId}</td>
              <td className="p-2 text-right">{ws.stock}</td><td className="p-2 text-right">{ws.reservedStock}</td><td className="p-2 text-right">{ws.reorderLevel}</td><td className="p-2 text-right">{ws.maxStock}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex gap-2 flex-wrap">
        {warehouses.filter((w) => !stock.some((s) => s.warehouseId === w.id)).map((w) => <Button key={w.id} size="sm" variant="outline" onClick={() => addRow(w)}><Plus className="h-3 w-3" /> {w.name}</Button>)}
      </div>
    </div>
  );
}

function PriceLevelsTab({ productId, currencySymbol }: { productId: string; currencySymbol: string }) {
  const db = useDb();
  const levels = useLiveQuery(() => (db ? listPriceLevels(db, productId) : Promise.resolve([])), [db, productId]) ?? [];
  const kinds: PriceLevel["kind"][] = ["RETAIL", "WHOLESALE", "DEALER", "VIP", "EMPLOYEE", "SPECIAL"];
  return (
    <div className="rounded-[20px] bg-white border border-slate-100 p-5">
      <h3 className="font-semibold text-slate-700 mb-3">Price Levels</h3>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-400 border-b border-slate-100"><th className="p-2">Level</th><th className="p-2 text-right">Price</th><th className="p-2">Active</th></tr></thead>
        <tbody>
          {kinds.map((k) => {
            const lvl = levels.find((l) => l.kind === k);
            return (
              <tr key={k} className="border-t border-slate-50">
                <td className="p-2">{k}</td>
                <td className="p-2 text-right">
                  <Input type="number" defaultValue={lvl?.price ?? 0} className="h-8 w-28 ml-auto" onBlur={async (e) => { if (db) await savePriceLevel(db, { id: lvl?.id ?? generateId(), productId, kind: k, price: Number(e.target.value) || 0, isActive: true, createdAt: lvl?.createdAt ?? nowIso() }); }} />
                </td>
                <td className="p-2">{lvl?.isActive ? <Badge tone="success">Yes</Badge> : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RelatedTab({ productId, products }: { productId: string; products: Product[] }) {
  const db = useDb();
  const related = useLiveQuery(() => (db ? listRelatedProducts(db, productId) : Promise.resolve([])), [db, productId]) ?? [];
  const [sel, setSel] = React.useState("");
  return (
    <div className="rounded-[20px] bg-white border border-slate-100 p-5">
      <h3 className="font-semibold text-slate-700 mb-3">Related Products (cross-sell)</h3>
      <div className="flex gap-2 mb-3">
        <Select value={sel} onChange={(e) => setSel(e.target.value)}><option value="">— Select product —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <Button onClick={async () => { if (db && sel) { await saveRelatedProduct(db, { id: generateId(), productId, relatedProductId: sel, relation: "CROSS_SELL" }); setSel(""); toast.success("Linked"); } }}>Link</Button>
      </div>
      <div className="space-y-1">
        {related.length === 0 && <p className="text-sm text-slate-400">No related products.</p>}
        {related.map((r) => <div key={r.id} className="flex justify-between items-center py-2 border-b border-slate-50 text-sm"><span>{products.find((p) => p.id === r.relatedProductId)?.name ?? r.relatedProductId}</span><Badge tone="info">{r.relation.replace("_", " ")}</Badge></div>)}
      </div>
    </div>
  );
}

function HistoryTab({ productId }: { productId: string }) {
  const db = useDb();
  const history = useLiveQuery(() => (db ? getProductHistory(db, productId) : Promise.resolve([])), [db, productId]) ?? [];
  return (
    <div className="rounded-[20px] bg-white border border-slate-100 p-5">
      <h3 className="font-semibold text-slate-700 mb-3">Product Timeline</h3>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {history.length === 0 && <p className="text-sm text-slate-400">No history yet.</p>}
        {history.map((h) => (
          <div key={h.id} className="flex gap-3 py-2 border-b border-slate-50 text-sm">
            <div className="w-2 h-2 rounded-full bg-[#0070E0] mt-1.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-slate-700">{h.action.replace(/_/g, " ")}</p>
              <p className="text-xs text-slate-400">{formatDateTime(h.createdAt)} {h.user ? `• ${h.user}` : ""}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
