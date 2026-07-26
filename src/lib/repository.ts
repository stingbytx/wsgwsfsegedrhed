// ============================================================================
// Repository layer — the single seam between business logic and storage.
//
// All service engines (inventory, finance, reporting, etc.) talk to a
// `Repository`, never to Dexie directly. Today the implementation is
// `DexieRepository` (IndexedDB, fully offline). To migrate to MySQL /
// PostgreSQL / Supabase later, implement the same interface against a
// remote client and swap the factory in `getRepository()`. No business
// logic changes.
//
// The interface is intentionally generic and table-name based so it can
// map 1:1 to SQL tables or Supabase collections.
// ============================================================================

import type { PosDatabase } from "@/lib/db";

export interface Repository {
  /** Return all rows for a collection (optionally filtered by index). */
  all<T>(collection: string, indexKey?: string, indexValue?: IDBValidKey): Promise<T[]>;
  /** Return a single row by primary key. */
  get<T>(collection: string, id: string): Promise<T | undefined>;
  /** Insert or update a row by primary key. */
  put<T>(collection: string, row: T): Promise<string>;
  /** Bulk insert/replace rows. */
  bulkPut<T>(collection: string, rows: T[]): Promise<void>;
  /** Delete a row by primary key. */
  remove(collection: string, id: string): Promise<void>;
  /** Count rows in a collection. */
  count(collection: string): Promise<number>;
  /** Run a read/write unit of work atomically. */
  transaction<T>(mode: "r" | "rw", collections: string[], fn: () => Promise<T>): Promise<T>;
}

/** Maps a logical collection name to its Dexie Table on the live DB. */
function tableOf(db: PosDatabase, collection: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (db as any)[collection];
  if (!t) throw new Error(`Unknown collection: ${collection}`);
  return t as import("dexie").Table<Record<string, unknown>, string>;
}

export class DexieRepository implements Repository {
  constructor(private db: PosDatabase) {}

  async all<T>(collection: string, indexKey?: string, indexValue?: IDBValidKey): Promise<T[]> {
    const t = tableOf(this.db, collection);
    if (indexKey && indexValue !== undefined) {
      return (t.where(indexKey).equals(indexValue as import("dexie").IndexableType).toArray() as Promise<T[]>).catch(async () => (await t.toArray()) as T[]);
    }
    return t.toArray() as Promise<T[]>;
  }

  async get<T>(collection: string, id: string): Promise<T | undefined> {
    const t = tableOf(this.db, collection);
    return t.get(id) as Promise<T | undefined>;
  }

  async put<T>(collection: string, row: T): Promise<string> {
    const t = tableOf(this.db, collection);
    return t.put(row as unknown as Record<string, unknown>) as unknown as Promise<string>;
  }

  async bulkPut<T>(collection: string, rows: T[]): Promise<void> {
    const t = tableOf(this.db, collection);
    await t.bulkPut(rows as unknown as Record<string, unknown>[]);
  }

  async remove(collection: string, id: string): Promise<void> {
    const t = tableOf(this.db, collection);
    await t.delete(id);
  }

  async count(collection: string): Promise<number> {
    const t = tableOf(this.db, collection);
    return t.count();
  }

  async transaction<T>(mode: "r" | "rw", collections: string[], fn: () => Promise<T>): Promise<T> {
    const tables = collections.map((c) => tableOf(this.db, c));
    return this.db.transaction(mode, tables, fn);
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────
// Business code calls `getRepository(db)`. Swap this single function to
// migrate to SQL/Supabase.

let activeRepo: Repository | null = null;
let activeDb: PosDatabase | null = null;

export function getRepository(db: PosDatabase): Repository {
  if (!activeRepo || activeDb !== db) {
    activeRepo = new DexieRepository(db);
    activeDb = db;
  }
  return activeRepo;
}

/** Collection name constants — single source of truth for table names. */
export const Collections = {
  products: "products",
  categories: "categories",
  suppliers: "suppliers",
  orders: "orders",
  inventoryMovements: "inventoryMovements",
  customers: "customers",
  creditSales: "creditSales",
  expenses: "expenses",
  heldOrders: "heldOrders",
  receipts: "receipts",
  activityLogs: "activityLogs",
  settings: "settings",
  employees: "employees",
  warehouses: "warehouses",
  purchaseOrders: "purchaseOrders",
  grns: "grns",
  salesReturns: "salesReturns",
  stockTransfers: "stockTransfers",
  expenseCategories: "expenseCategories",
  auditLogs: "auditLogs",
  roles: "roles",
  enterpriseSettings: "enterpriseSettings",
} as const;

export type CollectionName = (typeof Collections)[keyof typeof Collections];
