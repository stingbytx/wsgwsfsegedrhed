// ============================================================================
// Global Search Engine — instant search across every entity in the system.
// Returns grouped, scored hits with deep links so the search bar can jump
// the user straight to the right page/record.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { SearchHit, SearchResults, SearchEntityType } from "@/types/enterprise";

function score(haystack: string, query: string): number {
  if (!haystack) return 0;
  const h = haystack.toLowerCase();
  const q = query.toLowerCase();
  if (h === q) return 100;
  if (h.startsWith(q)) return 80;
  if (h.includes(q)) return 60;
  return 0;
}

function pushHit(
  hits: SearchHit[],
  type: SearchEntityType,
  id: string,
  label: string,
  sublabel: string | undefined,
  href: string,
  s: number
) {
  if (s > 0) hits.push({ id, type, label, sublabel, href, score: s });
}

export async function globalSearch(db: PosDatabase, query: string): Promise<SearchResults> {
  const trimmed = query.trim();
  const empty: SearchResults = { query: trimmed, total: 0, hits: [], grouped: emptyGrouped() };
  if (!trimmed) return empty;

  const [products, orders, customers, suppliers, employees, purchaseOrders, grns, expenses, categories, creditSales, returns] = await Promise.all([
    db.products.toArray(),
    db.orders.toArray(),
    db.customers.toArray(),
    db.suppliers.toArray(),
    db.employees.toArray(),
    db.purchaseOrders.toArray(),
    db.grns.toArray(),
    db.expenses.toArray(),
    db.categories.toArray(),
    db.creditSales.toArray(),
    db.salesReturns.toArray(),
  ]);

  const hits: SearchHit[] = [];

  for (const p of products) {
    pushHit(hits, "product", p.id, p.name, p.sku, `/inventory?q=${encodeURIComponent(p.id)}`,
      Math.max(score(p.name, trimmed), score(p.sku, trimmed), score(p.barcode ?? "", trimmed)));
  }
  for (const o of orders) {
    pushHit(hits, "invoice", o.id, o.orderNumber, new Date(o.createdAt).toLocaleDateString(), `/reports?order=${o.id}`,
      score(o.orderNumber, trimmed));
  }
  for (const c of customers) {
    pushHit(hits, "customer", c.id, c.name, c.phone ?? c.email, `/customers?q=${c.id}`,
      Math.max(score(c.name, trimmed), score(c.phone ?? "", trimmed), score(c.email ?? "", trimmed)));
  }
  for (const s of suppliers) {
    pushHit(hits, "supplier", s.id, s.name, s.phone ?? s.email, `/suppliers?q=${s.id}`,
      Math.max(score(s.name, trimmed), score(s.phone ?? "", trimmed), score(s.email ?? "", trimmed)));
  }
  for (const e of employees) {
    pushHit(hits, "employee", e.id, e.fullName, e.code, `/employees?q=${e.id}`,
      Math.max(score(e.fullName, trimmed), score(e.code, trimmed), score(e.email ?? "", trimmed)));
  }
  for (const po of purchaseOrders) {
    pushHit(hits, "purchaseOrder", po.id, po.poNumber, po.supplierName, `/purchases?q=${po.id}`,
      score(po.poNumber, trimmed));
  }
  for (const g of grns) {
    pushHit(hits, "grn", g.id, g.grnNumber, g.poNumber, `/grns?q=${g.id}`, score(g.grnNumber, trimmed));
  }
  for (const e of expenses) {
    pushHit(hits, "expense", e.id, e.category, e.description, `/expenses?q=${e.id}`,
      Math.max(score(e.category, trimmed), score(e.description ?? "", trimmed)));
  }
  for (const c of categories) {
    pushHit(hits, "category", c.id, c.name, undefined, `/inventory?cat=${c.id}`, score(c.name, trimmed));
  }
  for (const c of creditSales) {
    pushHit(hits, "creditSale", c.id, `Credit #${c.id.slice(0, 6)}`, c.status, `/customers?credit=${c.id}`,
      score(c.status, trimmed));
  }
  for (const r of returns) {
    pushHit(hits, "return", r.id, r.returnNumber, r.orderNumber, `/returns?q=${r.id}`, score(r.returnNumber, trimmed));
  }

  hits.sort((a, b) => b.score - a.score);
  const grouped = emptyGrouped();
  for (const h of hits.slice(0, 50)) grouped[h.type].push(h);

  return { query: trimmed, total: hits.length, hits: hits.slice(0, 50), grouped };
}

function emptyGrouped(): Record<SearchEntityType, SearchHit[]> {
  return {
    product: [], invoice: [], customer: [], supplier: [], employee: [],
    purchaseOrder: [], grn: [], expense: [], category: [], transaction: [],
    return: [], creditSale: [],
  };
}
