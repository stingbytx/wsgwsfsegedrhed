"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Package, ShoppingCart, Users, Truck, UserCog, FileText, Boxes, Receipt, ArrowLeftRight, Wallet, Tag, CreditCard, Undo2 } from "lucide-react";
import { useDb } from "@/hooks/use-db";
import { globalSearch } from "@/services/search";
import type { SearchHit, SearchEntityType } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const ICONS: Record<SearchEntityType, React.ComponentType<{ className?: string }>> = {
  product: Package, invoice: ShoppingCart, customer: Users, supplier: Truck,
  employee: UserCog, purchaseOrder: FileText, grn: Boxes, expense: Wallet,
  category: Tag, transaction: Receipt, return: Undo2, creditSale: CreditCard,
};

const LABELS: Record<SearchEntityType, string> = {
  product: "Products", invoice: "Invoices", customer: "Customers", supplier: "Suppliers",
  employee: "Employees", purchaseOrder: "Purchase Orders", grn: "GRNs", expense: "Expenses",
  category: "Categories", transaction: "Transactions", return: "Returns", creditSale: "Credit Sales",
};

export function GlobalSearch() {
  const db = useDb();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Debounced search
  React.useEffect(() => {
    if (!db || q.trim().length < 1) { setHits([]); return; }
    const t = setTimeout(async () => {
      const res = await globalSearch(db, q);
      setHits(res.hits);
      setOpen(true);
      setActive(0);
    }, 150);
    return () => clearTimeout(t);
  }, [q, db]);

  // Keyboard shortcut: "/" focuses search
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Enter" && hits[active]) { router.push(hits[active].href); setOpen(false); setQ(""); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hits, active, router]);

  // Close on outside click
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Group hits for display
  const grouped = React.useMemo(() => {
    const g: Partial<Record<SearchEntityType, SearchHit[]>> = {};
    for (const h of hits) (g[h.type] ??= []).push(h);
    return g;
  }, [hits]);

  const flat = hits;
  const go = (h: SearchHit) => { router.push(h.href); setOpen(false); setQ(""); };

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        placeholder="Search products, invoices, customers…  ( / )"
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0070E0]/40 placeholder:text-slate-400"
      />
      {open && flat.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-100 max-h-[420px] overflow-y-auto">
          {(Object.entries(grouped) as [SearchEntityType, SearchHit[]][]).map(([type, items]) => (
            <div key={type}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-50/80">{LABELS[type]} ({items.length})</div>
              {items.map((h) => {
                const Icon = ICONS[h.type];
                const idx = flat.indexOf(h);
                return (
                  <button
                    key={`${h.type}-${h.id}`}
                    onClick={() => go(h)}
                    className={cn("w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50", idx === active && "bg-[#0070E0]/5")}
                  >
                    <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-slate-800 truncate">{h.label}</span>
                      {h.sublabel && <span className="block text-xs text-slate-400 truncate">{h.sublabel}</span>}
                    </span>
                    <ArrowLeftRight className="h-3 w-3 text-slate-300" />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {open && q.trim() && flat.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-100 p-4 text-sm text-slate-400 text-center">
          No results for “{q}”
        </div>
      )}
    </div>
  );
}
