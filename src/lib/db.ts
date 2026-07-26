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
import type {
  Employee,
  Warehouse,
  PurchaseOrder,
  GRN,
  SalesReturn,
  StockTransfer,
  ExpenseCategory,
  AuditEntry,
  Role,
  EnterpriseSettings,
} from "@/types/enterprise";
import type {
  Brand, Unit, ProductVariant, Batch, ProductSupplier, WarehouseStock,
  ProductImage, PriceLevel, Promotion, RelatedProduct, ProductHistoryEntry,
  Shift, CashDrawerEntry,
} from "@/types/pim";
import type {
  CommunicationLog, CustomerDocument, CustomerGroup, CreditPayment,
  LoyaltyLedgerEntry,
} from "@/types/crm";

export class PosDatabase extends Dexie {
  // Legacy tables (v1) — unchanged schema
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

  // PIM / POS tables (v3) — additive only
  brands!: Table<Brand, string>;
  units!: Table<Unit, string>;
  variants!: Table<ProductVariant, string>;
  batches!: Table<Batch, string>;
  productSuppliers!: Table<ProductSupplier, string>;
  warehouseStock!: Table<WarehouseStock, string>;
  productImages!: Table<ProductImage, string>;
  priceLevels!: Table<PriceLevel, string>;
  promotions!: Table<Promotion, string>;
  relatedProducts!: Table<RelatedProduct, string>;
  productHistory!: Table<ProductHistoryEntry, string>;
  shifts!: Table<Shift, string>;
  cashDrawer!: Table<CashDrawerEntry, string>;

  // CRM tables (additive)
  communicationLogs!: Table<CommunicationLog, string>;
  customerDocuments!: Table<CustomerDocument, string>;
  customerGroups!: Table<CustomerGroup, string>;
  creditPayments!: Table<CreditPayment, string>;
  loyaltyLedger!: Table<LoyaltyLedgerEntry, string>;

  // Enterprise tables (v2) — additive only
  employees!: Table<Employee, string>;
  warehouses!: Table<Warehouse, string>;
  purchaseOrders!: Table<PurchaseOrder, string>;
  grns!: Table<GRN, string>;
  salesReturns!: Table<SalesReturn, string>;
  stockTransfers!: Table<StockTransfer, string>;
  expenseCategories!: Table<ExpenseCategory, string>;
  auditLogs!: Table<AuditEntry, string>;
  roles!: Table<Role, string>;
  enterpriseSettings!: Table<EnterpriseSettings, string>;

  constructor(userId: string) {
    super(`universal-pos_${userId}`);
    // v1 — original schema, untouched
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

    // v2 — enterprise extension. Existing stores are re-declared with the
    // SAME indexes so Dexie preserves data; new stores are added.
    this.version(2).stores({
      products: "id, sku, barcode, categoryId, name, isActive, isFavorite",
      categories: "id, name",
      suppliers: "id, name",
      orders: "id, orderNumber, customerId, status, createdAt",
      inventoryMovements: "id, productId, type, createdAt",
      customers: "id, name, phone, email, code, city, companyName, loyaltyTier, creditStatus, isVip, birthday, type, createdAt",
      creditSales: "id, orderId, customerId, status, dueDate",
      expenses: "id, category, date",
      heldOrders: "id, createdAt",
      receipts: "id, orderId",
      activityLogs: "id, entity, createdAt",
      settings: "id",
      // new
      employees: "id, code, email, roleId, warehouseId, isActive, fullName",
      warehouses: "id, code, name, isDefault, isActive",
      purchaseOrders: "id, poNumber, supplierId, status, createdAt",
      grns: "id, grnNumber, purchaseOrderId, supplierId, status, receivedAt, createdAt",
      salesReturns: "id, returnNumber, orderId, customerId, createdAt",
      stockTransfers: "id, transferNumber, status, createdAt",
      expenseCategories: "id, name",
      auditLogs: "id, action, entity, entityId, userId, createdAt",
      roles: "id, name",
      enterpriseSettings: "id",
      // v3 — PIM / POS
      brands: "id, name, status",
      units: "id, name, baseUnitId",
      variants: "id, productId, barcode, sku, isActive",
      batches: "id, productId, supplierId, warehouseId, expiryDate",
      productSuppliers: "id, productId, supplierId, isPreferred",
      warehouseStock: "id, productId, warehouseId",
      productImages: "id, productId, isMain",
      priceLevels: "id, productId, kind, isActive",
      promotions: "id, type, isActive, startDate, endDate",
      relatedProducts: "id, productId, relatedProductId",
      productHistory: "id, productId, action, createdAt",
      shifts: "id, cashierId, status, startedAt",
      cashDrawer: "id, type, shiftId, createdAt",
      // CRM
      communicationLogs: "id, customerId, type, createdAt",
      customerDocuments: "id, customerId, type, createdAt",
      customerGroups: "id, name, isDynamic, createdAt",
      creditPayments: "id, customerId, orderId, date, createdAt",
      loyaltyLedger: "id, customerId, type, createdAt",
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
