"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { useCartStore, selectTotal } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { completeSale, holdOrder } from "@/services/orders";
import { CustomerPicker } from "@/components/pos/customer-picker";
import { Receipt } from "@/components/pos/receipt";
import { toast } from "sonner";
import { Search, Minus, Plus, Trash2, PauseCircle, Percent, Printer, X } from "lucide-react";
import type { Product, PaymentMethod, HeldOrder, Order, Customer, BusinessSettings } from "@/types";

export default function PosPage() {
  const db = useDb();
  const user = useAuthStore((s) => s.user);
  const { currencySymbol } = useUIStore();
  const cart = useCartStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showHeld, setShowHeld] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const barcodeBuffer = useRef("");

  const allProducts = useLiveQuery(() => (db ? db.products.toArray() : []), [db]) ?? [];
  const products = useMemo(() => allProducts.filter((p) => p.isActive), [allProducts]);
  const categories = useLiveQuery(() => (db ? db.categories.toArray() : []), [db]) ?? [];
  const heldOrders = useLiveQuery(() => (db ? db.heldOrders.toArray() : []), [db]) ?? [];
  const customers = useLiveQuery(() => (db ? db.customers.toArray() : []), [db]) ?? [];
  const settings = useLiveQuery(() => (db ? db.settings.get("default") : undefined), [db]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? "").includes(search);
      const matchesCategory = !activeCategory || p.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  // Barcode scanner support: rapid keystrokes ending in Enter = scan.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === "Enter") {
        const code = barcodeBuffer.current;
        barcodeBuffer.current = "";
        if (!code) return;
        const product = products.find((p) => p.barcode === code);
        if (product) {
          cart.addProduct(product);
          toast.success(`Added ${product.name}`);
        } else {
          toast.error(`No product with barcode ${code}`);
        }
        return;
      }
      if (e.key.length === 1) barcodeBuffer.current += e.key;
      clearTimeout(timeout);
      timeout = setTimeout(() => (barcodeBuffer.current = ""), 300);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [products, cart]);

  const total = selectTotal(cart);
  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const selectedCustomer = customers.find((c) => c.id === cart.customerId) ?? null;

  const handleHold = async () => {
    if (!db || cart.items.length === 0) return;
    await holdOrder(db, cart.items, cart.customerId, `Hold ${new Date().toLocaleTimeString()}`);
    cart.clear();
    toast.success("Order held");
  };

  const resumeHeld = async (order: HeldOrder) => {
    if (!db) return;
    cart.loadItems(order.items);
    cart.setCustomer(order.customerId ?? null);
    await db.heldOrders.delete(order.id);
    setShowHeld(false);
  };

  return (
    <div className="flex h-screen">
      {/* Left: categories */}
      <div className="w-48 shrink-0 border-r border-slate-100 bg-white p-4 space-y-1 overflow-y-auto">
        <button
          onClick={() => setActiveCategory(null)}
          className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium ${!activeCategory ? "bg-[#0070E0] text-white" : "text-slate-600 hover:bg-slate-50"}`}
        >
          All Products
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium ${activeCategory === c.id ? "bg-[#0070E0] text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {c.name}
          </button>
        ))}
        <div className="pt-4 mt-4 border-t border-slate-100">
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowHeld(true)}>
            <PauseCircle className="h-4 w-4" /> Held ({heldOrders.length})
          </Button>
        </div>
      </div>

      {/* Center: product grid */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, SKU, or scan barcode…"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 content-start">
          {filtered.length === 0 && <p className="col-span-full text-center text-slate-400 py-10">No products found.</p>}
          {filtered.map((p) => (
            <ProductTile key={p.id} product={p} symbol={currencySymbol} onClick={() => cart.addProduct(p)} />
          ))}
        </div>
      </div>

      {/* Right: cart */}
      <div className="w-96 shrink-0 border-l border-slate-100 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Current Order</h2>
            {cart.items.length > 0 && (
              <button onClick={cart.clear} className="text-xs text-red-500 hover:underline">
                Clear
              </button>
            )}
          </div>
          <CustomerPicker selectedCustomerId={cart.customerId} onSelect={cart.setCustomer} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.items.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Cart is empty. Tap a product to add it.</p>}
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{item.name}</p>
                <p className="text-xs text-slate-500">{formatCurrency(item.price, currencySymbol)} each</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center"
                  onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center text-sm text-slate-800 font-medium">{item.quantity}</span>
                <button
                  className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center"
                  onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <p className="w-16 text-right text-sm font-medium text-slate-800">{formatCurrency(item.total, currencySymbol)}</p>
              <button onClick={() => cart.removeItem(item.id)} className="text-slate-300 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-100 space-y-2">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span className="text-slate-700">{formatCurrency(subtotal, currencySymbol)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-800">
            <span>Total</span>
            <span>{formatCurrency(total, currencySymbol)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" onClick={handleHold} disabled={cart.items.length === 0}>
              <PauseCircle className="h-4 w-4" /> Hold
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const pct = prompt("Discount percent (0-100)");
                if (pct) cart.setOrderDiscount({ type: "PERCENT", value: Number(pct) });
              }}
            >
              <Percent className="h-4 w-4" /> Discount
            </Button>
          </div>
          <Button className="w-full" size="lg" disabled={cart.items.length === 0} onClick={() => setCheckoutOpen(true)}>
            Complete Sale — {formatCurrency(total, currencySymbol)}
          </Button>
        </div>
      </div>

      {showHeld && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setShowHeld(false)}>
          <Card className="w-full max-w-md p-5 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-3">Held Orders</h3>
            {heldOrders.length === 0 && <p className="text-sm text-slate-400">No held orders.</p>}
            {heldOrders.map((o) => (
              <button
                key={o.id}
                onClick={() => resumeHeld(o)}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-50 border border-slate-100 mb-2"
              >
                <p className="text-sm font-medium text-slate-700">{o.label}</p>
                <p className="text-xs text-slate-500">{o.items.length} items</p>
              </button>
            ))}
          </Card>
        </div>
      )}

      {checkoutOpen && db && user && (
        <CheckoutDialog
          total={total}
          onClose={() => setCheckoutOpen(false)}
          onComplete={async (method) => {
            const order = await completeSale(db, {
              items: cart.items,
              customerId: cart.customerId,
              orderDiscount: cart.orderDiscount,
              payments: [{ method, amount: method === "CREDIT" ? 0 : total }],
              notes: cart.notes,
            });
            toast.success("Sale completed");
            cart.clear();
            setCheckoutOpen(false);
            setReceiptOrder(order);
          }}
        />
      )}

      {receiptOrder && (
        <ReceiptDialog
          order={receiptOrder}
          customer={customers.find((c) => c.id === receiptOrder.customerId) ?? null}
          settings={settings ?? null}
          currencySymbol={currencySymbol}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}

function ProductTile({ product, symbol, onClick }: { product: Product; symbol: string; onClick: () => void }) {
  const outOfStock = product.stock <= 0;
  return (
    <button
      onClick={onClick}
      disabled={outOfStock}
      className="text-left rounded-2xl border border-slate-100 bg-white p-3 hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <div className="h-20 w-full rounded-xl bg-slate-50 mb-2 flex items-center justify-center overflow-hidden">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-slate-400 text-xs">No image</span>
        )}
      </div>
      <p className="text-sm font-medium text-slate-700 truncate">{product.name}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm font-semibold text-[#0070E0]">{formatCurrency(product.price, symbol)}</span>
        <span className={`text-[10px] ${outOfStock ? "text-red-500" : "text-slate-500"}`}>{outOfStock ? "Out" : `${product.stock} left`}</span>
      </div>
    </button>
  );
}

function CheckoutDialog({
  total,
  onClose,
  onComplete,
}: {
  total: number;
  onClose: () => void;
  onComplete: (method: PaymentMethod) => Promise<void>;
}) {
  const { currencySymbol, setLastPaymentMethod } = useUIStore();
  const [loading, setLoading] = useState<PaymentMethod | null>(null);

  const pay = async (method: PaymentMethod) => {
    setLoading(method);
    try {
      await onComplete(method);
      setLastPaymentMethod(method);
    } catch {
      toast.error("Could not complete sale");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h3 className="font-semibold text-slate-800 text-center mb-1">Choose Payment Method</h3>
        <p className="text-center text-2xl font-bold text-[#0070E0] mb-5">{formatCurrency(total, currencySymbol)}</p>
        <div className="grid grid-cols-1 gap-2">
          <Button size="lg" loading={loading === "CASH"} onClick={() => pay("CASH")}>
            Cash
          </Button>
          <Button size="lg" variant="secondary" loading={loading === "CARD"} onClick={() => pay("CARD")}>
            Card
          </Button>
          <Button size="lg" variant="outline" loading={loading === "CREDIT"} onClick={() => pay("CREDIT")}>
            Credit (Pay Later)
          </Button>
        </div>
        <Button variant="ghost" className="w-full mt-3" onClick={onClose}>
          Cancel
        </Button>
      </Card>
    </div>
  );
}

function ReceiptDialog({
  order,
  customer,
  settings,
  currencySymbol,
  onClose,
}: {
  order: Order;
  customer: Customer | null;
  settings: BusinessSettings | null;
  currencySymbol: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-4 relative max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
        <Receipt order={order} customer={customer} settings={settings} currencySymbol={currencySymbol} />
        <div className="flex gap-2 mt-4 no-print">
          <Button className="flex-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </Card>
    </div>
  );
}
