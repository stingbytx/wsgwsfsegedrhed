// ============================================================================
// Dexie (IndexedDB) database — ALL business data lives here, per-browser.
// Nothing in this file ever talks to a network. Scoped per Supabase user id
// so multiple accounts on the same browser don't mix data.
// ============================================================================
import Dexie, { type Table } from "dexie";
import type {
  Product,
  Category,
  Supplier,
  Order,
  InventoryMovement,
  Customer,
  CreditSale,
  Expense,
  HeldOrder,
  Receipt,
  ActivityLog,
  BusinessSettings,
} from "@/types";

export class PosDatabase extends Dexie {
  products!: Table<Product, string>;
  categories!: Table<Category, string>;
  suppliers!: Table<Supplier, string>;
  orders!: Table<Order, string>;
  inventoryMovements!: Table<InventoryMovement, string>;
  customers!: Table<Customer, string>;
  creditSales!: Table<CreditSale, string>;
  expenses!: Table<Expense, string>;
  heldOrders!: Table<HeldOrder, string>;
  receipts!: Table<Receipt, string>;
  activityLogs!: Table<ActivityLog, string>;
  settings!: Table<BusinessSettings, string>;

  constructor(userId: string) {
    super(`universal-pos_${userId}`);
    this.version(1).stores({
      products: "id, sku, barcode, categoryId, name, isActive, isFavorite",
      categories: "id, name",
      suppliers: "id, name",
      orders: "id, orderNumber, customerId, status, createdAt",
      inventoryMovements: "id, productId, type, createdAt",
      customers: "id, name, phone, email",
      creditSales: "id, orderId, customerId, status, dueDate",
      expenses: "id, category, date",
      heldOrders: "id, createdAt",
      receipts: "id, orderId",
      activityLogs: "id, entity, createdAt",
      settings: "id",
    });
  }
}

let dbInstance: PosDatabase | null = null;
let currentUserId: string | null = null;

/** Get (or lazily create) the IndexedDB database scoped to the logged-in user. */
export function getDb(userId: string): PosDatabase {
  if (!dbInstance || currentUserId !== userId) {
    dbInstance?.close();
    dbInstance = new PosDatabase(userId);
    currentUserId = userId;
  }
  return dbInstance;
}

export function closeDb() {
  dbInstance?.close();
  dbInstance = null;
  currentUserId = null;
}
