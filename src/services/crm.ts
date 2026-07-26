// ============================================================================
// CRM Service — Customer Relationship Management engine. Extends the existing
// customers table (so legacy /customers, POS, and orders keep working) with
// CRM fields + analytics. Single canonical engine for search/filter/sort,
// RFM/CLV analytics, groups/segments, and tags.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { Customer, Order } from "@/types";
import type {
  CustomerCrmExtension, CustomerTag, CustomerGroup, SegmentRule,
  CommunicationLog, CustomerDocument, CustomerAnalytics, RfmScore,
} from "@/types/crm";
import { generateId, nowIso } from "@/lib/utils";
import { logAudit } from "./audit";

type CrmCustomer = Customer & Partial<CustomerCrmExtension>;

// ─── CRUD ────────────────────────────────────────────────────────────────────────

export async function createCustomer(db: PosDatabase, c: CrmCustomer): Promise<Customer> {
  await db.customers.add(c as Customer);
  await logAudit(db, { action: "CREATE", entity: "customer", entityId: c.id, newValue: c });
  return c as Customer;
}

export async function updateCustomer(db: PosDatabase, id: string, patch: Partial<CrmCustomer>): Promise<void> {
  const existing = await db.customers.get(id);
  if (!existing) throw new Error("Customer not found");
  const next = { ...existing, ...patch, updatedAt: nowIso() };
  await db.customers.put(next);
  await logAudit(db, { action: "EDIT", entity: "customer", entityId: id, oldValue: existing, newValue: next });
}

export async function deleteCustomer(db: PosDatabase, id: string): Promise<void> {
  await db.customers.delete(id);
  await logAudit(db, { action: "DELETE", entity: "customer", entityId: id });
}

export async function validateCustomer(db: PosDatabase, c: Partial<CrmCustomer>, excludeId?: string): Promise<string[]> {
  const errs: string[] = [];
  if (!c.name?.trim()) errs.push("Name is required");
  if (c.code) {
    const all = await db.customers.toArray();
    if (all.some((x) => (x as CrmCustomer).code === c.code && x.id !== excludeId)) errs.push("Duplicate customer code");
  }
  if (c.phone) {
    const all = await db.customers.toArray();
    if (all.some((x) => x.phone === c.phone && x.id !== excludeId)) errs.push("Duplicate phone number");
  }
  if (c.creditLimit !== undefined && c.creditLimit < 0) errs.push("Credit limit cannot be negative");
  return errs;
}

export function nextCustomerCode(count: number): string {
  return `CUS-${String(count + 1).padStart(5, "0")}`;
}

// ─── Tags ────────────────────────────────────────────────────────────────────────

export async function addTag(db: PosDatabase, id: string, tag: CustomerTag): Promise<void> {
  const c = await db.customers.get(id) as CrmCustomer | undefined;
  if (!c) return;
  const tags = new Set(c.tags ?? []);
  tags.add(tag);
  await updateCustomer(db, id, { tags: Array.from(tags) });
}

export async function bulkTag(db: PosDatabase, ids: string[], tag: CustomerTag): Promise<void> {
  for (const id of ids) await addTag(db, id, tag);
}

// ─── Search / filter / sort ───────────────────────────────────────────────────────

export interface CustomerFilter {
  query?: string;
  creditStatus?: string;
  isVip?: boolean;
  tag?: string;
  city?: string;
  type?: string;
  loyaltyTier?: string;
  birthdayMonth?: number; // 1-12
  hasOutstanding?: boolean;
  blacklisted?: boolean;
  newThisMonth?: boolean;
  topCustomers?: boolean;
  groupMemberIds?: string[];
}

export type CustomerSortKey =
  | "name" | "createdAt" | "totalPurchases" | "creditBalance"
  | "loyaltyPoints" | "lastVisit" | "birthday";

export interface RankedCustomer {
  customer: CrmCustomer;
  totalPurchases: number;
  orderCount: number;
  lastVisit?: string | null;
}

export async function searchCustomers(
  db: PosDatabase,
  filter: CustomerFilter = {},
  sort: CustomerSortKey = "name",
  sortDir: "asc" | "desc" = "asc"
): Promise<RankedCustomer[]> {
  const [customers, orders] = await Promise.all([db.customers.toArray(), db.orders.toArray()]);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Build per-customer stats
  const stats = new Map<string, { totalPurchases: number; orderCount: number; lastVisit?: string | null }>();
  for (const o of orders) {
    if (!o.customerId) continue;
    if (o.status !== "COMPLETED" && o.status !== "PARTIALLY_REFUNDED") continue;
    const s = stats.get(o.customerId) ?? { totalPurchases: 0, orderCount: 0, lastVisit: null };
    s.totalPurchases += o.total;
    s.orderCount += 1;
    if (!s.lastVisit || o.createdAt > s.lastVisit) s.lastVisit = o.createdAt;
    stats.set(o.customerId, s);
  }

  let ranked: RankedCustomer[] = customers.map((c) => {
    const s = stats.get(c.id) ?? { totalPurchases: 0, orderCount: 0, lastVisit: null };
    return { customer: c as CrmCustomer, totalPurchases: s.totalPurchases, orderCount: s.orderCount, lastVisit: s.lastVisit };
  });

  // Filters
  if (filter.query) {
    const q = filter.query.toLowerCase();
    ranked = ranked.filter(({ customer: c }) => {
      const hay = [c.name, c.phone, c.email, c.address, c.code, c.loyaltyCardNumber, c.taxId, c.vatNumber, c.city, c.companyName, ...(c.tags ?? [])].map((x) => String(x ?? "").toLowerCase());
      return hay.some((h) => h.includes(q));
    });
  }
  if (filter.creditStatus) ranked = ranked.filter(({ customer: c }) => (c.creditStatus ?? "NO_CREDIT") === filter.creditStatus);
  if (filter.isVip !== undefined) ranked = ranked.filter(({ customer: c }) => !!c.isVip === filter.isVip);
  if (filter.tag) ranked = ranked.filter(({ customer: c }) => (c.tags ?? []).includes(filter.tag as CustomerTag));
  if (filter.city) ranked = ranked.filter(({ customer: c }) => c.city === filter.city);
  if (filter.type) ranked = ranked.filter(({ customer: c }) => (c.type ?? "RETAIL") === filter.type);
  if (filter.loyaltyTier) ranked = ranked.filter(({ customer: c }) => (c.loyaltyTier ?? "BRONZE") === filter.loyaltyTier);
  if (filter.birthdayMonth) ranked = ranked.filter(({ customer: c }) => c.birthday && new Date(c.birthday).getMonth() + 1 === filter.birthdayMonth);
  if (filter.hasOutstanding) ranked = ranked.filter(({ customer: c }) => (c.creditBalance ?? 0) > 0);
  if (filter.blacklisted) ranked = ranked.filter(({ customer: c }) => c.creditStatus === "BLACKLISTED");
  if (filter.newThisMonth) ranked = ranked.filter(({ customer: c }) => new Date(c.createdAt) >= monthStart);
  if (filter.topCustomers) ranked = ranked.filter((r) => r.orderCount >= 3);
  if (filter.groupMemberIds?.length) ranked = ranked.filter((r) => filter.groupMemberIds!.includes(r.customer.id));

  // Sort
  const dir = sortDir === "asc" ? 1 : -1;
  ranked.sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "name": cmp = a.customer.name.localeCompare(b.customer.name); break;
      case "createdAt": cmp = a.customer.createdAt.localeCompare(b.customer.createdAt); break;
      case "totalPurchases": cmp = a.totalPurchases - b.totalPurchases; break;
      case "creditBalance": cmp = (a.customer.creditBalance ?? 0) - (b.customer.creditBalance ?? 0); break;
      case "loyaltyPoints": cmp = (a.customer.loyaltyPoints ?? 0) - (b.customer.loyaltyPoints ?? 0); break;
      case "lastVisit": cmp = (a.lastVisit ?? "").localeCompare(b.lastVisit ?? ""); break;
      case "birthday": cmp = (a.customer.birthday ?? "").localeCompare(b.customer.birthday ?? ""); break;
    }
    return cmp * dir;
  });

  return ranked;
}

// ─── Purchase history & analytics ────────────────────────────────────────────────

export async function getCustomerOrders(db: PosDatabase, customerId: string): Promise<Order[]> {
  const all = await db.orders.toArray();
  return all.filter((o) => o.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function computeCustomerAnalytics(db: PosDatabase, customerId: string): Promise<CustomerAnalytics> {
  const [orders, products, categories, returns] = await Promise.all([
    db.orders.toArray(), db.products.toArray(), db.categories.toArray(), db.salesReturns.toArray(),
  ]);
  const customerOrders = orders.filter((o) => o.customerId === customerId);
  const completed = customerOrders.filter((o) => o.status === "COMPLETED" || o.status === "PARTIALLY_REFUNDED");
  const customerReturns = returns.filter((r) => r.customerId === customerId);

  const totalPurchases = completed.reduce((s, o) => s + o.total, 0);
  const totalPaid = completed.reduce((s, o) => s + o.amountPaid, 0);
  const totalVisits = completed.length;
  const averageOrderValue = totalVisits > 0 ? totalPurchases / totalVisits : 0;
  const lastPurchaseDate = completed.length ? completed[0]?.createdAt ?? null : null;

  // Favorite category + products
  const catMap = new Map<string, number>();
  const prodMap = new Map<string, { name: string; qty: number }>();
  const catsBoughtSet = new Set<string>();
  for (const o of completed) {
    for (const it of o.items) {
      const p = products.find((x) => x.id === it.productId);
      const cat = p?.categoryId ? categories.find((c) => c.id === p.categoryId)?.name ?? "Uncategorized" : "Uncategorized";
      catMap.set(cat, (catMap.get(cat) ?? 0) + it.quantity);
      catsBoughtSet.add(cat);
      const entry = prodMap.get(it.productId) ?? { name: it.name, qty: 0 };
      entry.qty += it.quantity;
      prodMap.set(it.productId, entry);
    }
  }
  const favoriteCategory = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  const favoriteProducts = Array.from(prodMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

  const returnRate = totalVisits > 0 ? customerReturns.length / totalVisits : 0;

  // RFM
  const recency = lastPurchaseDate ? Math.ceil((Date.now() - new Date(lastPurchaseDate).getTime()) / 86400000) : 9999;
  const frequency = totalVisits;
  const monetary = totalPurchases;
  const rfm = computeRfm(recency, frequency, monetary);

  // CLV — simple: total monetary (could be avg order × expected lifespan)
  const lifetimeValue = totalPurchases;

  return {
    totalPurchases, totalPaid, averageOrderValue, totalVisits,
    productsBought: prodMap.size, categoriesBought: catsBoughtSet.size,
    returnRate, lifetimeValue, lastPurchaseDate, favoriteCategory, favoriteProducts, rfm,
  };
}

function computeRfm(recency: number, frequency: number, monetary: number): RfmScore {
  // Score 1-5; thresholds are heuristic for a small/medium offline POS
  const r = recency <= 7 ? 5 : recency <= 30 ? 4 : recency <= 90 ? 3 : recency <= 180 ? 2 : 1;
  const f = frequency >= 20 ? 5 : frequency >= 10 ? 4 : frequency >= 5 ? 3 : frequency >= 2 ? 2 : 1;
  const m = monetary >= 100000 ? 5 : monetary >= 50000 ? 4 : monetary >= 20000 ? 3 : monetary >= 5000 ? 2 : 1;
  const score = `${r}${f}${m}`;
  // Segment mapping
  let segment = "Others";
  if (r >= 4 && f >= 4) segment = "Champions";
  else if (r >= 4 && f <= 2) segment = "New Customers";
  else if (r <= 2 && f >= 4) segment = "At Risk";
  else if (r <= 2 && f <= 2) segment = "Churned";
  else if (r >= 3 && f >= 3) segment = "Loyal";
  else if (r >= 3) segment = "Potential";
  return { recency, frequency, monetary, recencyScore: r, frequencyScore: f, monetaryScore: m, rfmScore: score, segment };
}

// ─── Communication log ───────────────────────────────────────────────────────────

export async function listCommunicationLogs(db: PosDatabase, customerId: string): Promise<CommunicationLog[]> {
  const all = await db.communicationLogs.where("customerId").equals(customerId).toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addCommunicationLog(db: PosDatabase, log: Omit<CommunicationLog, "id" | "createdAt">): Promise<CommunicationLog> {
  const row: CommunicationLog = { ...log, id: generateId(), createdAt: nowIso() };
  await db.communicationLogs.add(row);
  return row;
}

// ─── Document vault ──────────────────────────────────────────────────────────────

export async function listCustomerDocuments(db: PosDatabase, customerId: string): Promise<CustomerDocument[]> {
  const all = await db.customerDocuments.where("customerId").equals(customerId).toArray();
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function addCustomerDocument(db: PosDatabase, doc: Omit<CustomerDocument, "id" | "createdAt">): Promise<CustomerDocument> {
  const row: CustomerDocument = { ...doc, id: generateId(), createdAt: nowIso() };
  await db.customerDocuments.add(row);
  return row;
}

export async function deleteCustomerDocument(db: PosDatabase, id: string): Promise<void> {
  await db.customerDocuments.delete(id);
}

// ─── Groups & dynamic segments ───────────────────────────────────────────────────

export async function listGroups(db: PosDatabase): Promise<CustomerGroup[]> {
  return db.customerGroups.toArray();
}

export async function saveGroup(db: PosDatabase, g: CustomerGroup): Promise<void> {
  await db.customerGroups.put(g);
}

export async function deleteGroup(db: PosDatabase, id: string): Promise<void> {
  await db.customerGroups.delete(id);
}

export async function addCustomerToGroup(db: PosDatabase, groupId: string, customerId: string): Promise<void> {
  const g = await db.customerGroups.get(groupId);
  if (!g || g.isDynamic) return;
  const ids = new Set(g.memberIds ?? []);
  ids.add(customerId);
  await db.customerGroups.update(groupId, { memberIds: Array.from(ids) });
}

/** Evaluate a dynamic segment rule → list of matching customer ids. */
export async function evaluateSegment(db: PosDatabase, rule: SegmentRule): Promise<string[]> {
  const customers = await db.customers.toArray();
  const orders = await db.orders.toArray();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const orderCounts = new Map<string, number>();
  for (const o of orders) if (o.customerId && (o.status === "COMPLETED" || o.status === "PARTIALLY_REFUNDED")) orderCounts.set(o.customerId, (orderCounts.get(o.customerId) ?? 0) + 1);

  return customers.filter((c) => {
    const cc = c as CrmCustomer;
    switch (rule) {
      case "VIP": return !!cc.isVip;
      case "WHOLESALE": return cc.type === "WHOLESALE";
      case "RETAIL": return (cc.type ?? "RETAIL") === "RETAIL";
      case "BIRTHDAY_MONTH": return !!cc.birthday && new Date(cc.birthday).getMonth() === now.getMonth();
      case "BLACKLISTED": return cc.creditStatus === "BLACKLISTED";
      case "HAS_OUTSTANDING": return (c.creditBalance ?? 0) > 0;
      case "NEW_THIS_MONTH": return new Date(c.createdAt) >= monthStart;
      case "TOP_CUSTOMERS": return (orderCounts.get(c.id) ?? 0) >= 3;
      case "AT_RISK": return (orderCounts.get(c.id) ?? 0) >= 2 && (!cc.lastCreditPayment || new Date(cc.lastCreditPayment) < new Date(Date.now() - 60 * 86400000));
      case "CHURNED": return (orderCounts.get(c.id) ?? 0) === 0;
      default: return false;
    }
  }).map((c) => c.id);
}
