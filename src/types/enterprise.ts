// ============================================================================
// Enterprise domain types — ADDITIVE extension of the core POS types.
// These entities extend UniPOS without modifying any existing type in
// `src/types/index.ts`. All new modules (employees, warehouses, purchase
// orders, GRNs, returns, audit, permissions, expanded settings) live here.
// ============================================================================

import type { ID } from "@/types";

// ─── Roles & Permissions ────────────────────────────────────────────────────

export type RoleName =
  | "OWNER"
  | "ADMINISTRATOR"
  | "MANAGER"
  | "CASHIER"
  | "INVENTORY_OFFICER"
  | "ACCOUNTANT"
  | "SALES_REPRESENTATIVE"
  | "GUEST";

export type Permission =
  | "pos.use"
  | "products.view" | "products.create" | "products.edit" | "products.delete"
  | "inventory.view" | "inventory.adjust" | "inventory.transfer"
  | "customers.view" | "customers.create" | "customers.edit" | "customers.delete"
  | "suppliers.view" | "suppliers.create" | "suppliers.edit" | "suppliers.delete"
  | "employees.view" | "employees.create" | "employees.edit" | "employees.delete"
  | "purchases.view" | "purchases.create" | "purchases.edit" | "purchases.delete"
  | "grns.view" | "grns.create" | "grns.edit"
  | "returns.view" | "returns.create"
  | "expenses.view" | "expenses.create" | "expenses.edit" | "expenses.delete"
  | "reports.view" | "reports.export"
  | "settings.view" | "settings.edit"
  | "audit.view"
  | "backup.export" | "backup.restore";

export interface Role {
  id: ID;
  name: RoleName;
  label: string;
  description?: string;
  permissions: Permission[];
  isSystem?: boolean; // system roles cannot be deleted
  createdAt: string;
  updatedAt: string;
}

// ─── Employees ───────────────────────────────────────────────────────────────

export interface Employee {
  id: ID;
  code: string; // unique employee code
  firstName: string;
  lastName: string;
  fullName: string; // denormalized for convenience
  email?: string;
  phone?: string;
  address?: string;
  roleId?: ID | null;
  roleName?: RoleName | null; // denormalized for quick access checks
  warehouseId?: ID | null;
  salary?: number;
  hiredAt?: string | null;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Warehouses ──────────────────────────────────────────────────────────────

export interface Warehouse {
  id: ID;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  manager?: string;
  isDefault?: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Purchase Orders & GRNs ──────────────────────────────────────────────────

export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrderItem {
  id: ID;
  productId: ID;
  name: string;
  sku: string;
  cost: number;
  quantityOrdered: number;
  quantityReceived: number; // accumulated from GRNs
  total: number;
}

export interface PurchaseOrder {
  id: ID;
  poNumber: string;
  supplierId: ID;
  supplierName?: string;
  warehouseId?: ID | null;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  status: PurchaseOrderStatus;
  expectedDate?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type GRNStatus = "OPEN" | "COMPLETED" | "CANCELLED";

export interface GRNItem {
  id: ID;
  poItemId: ID;
  productId: ID;
  name: string;
  sku: string;
  quantityReceived: number;
  cost: number;
  total: number;
}

export interface GRN {
  id: ID;
  grnNumber: string;
  purchaseOrderId: ID;
  poNumber?: string;
  supplierId: ID;
  supplierName?: string;
  warehouseId?: ID | null;
  items: GRNItem[];
  total: number;
  status: GRNStatus;
  notes?: string;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Sales Returns ───────────────────────────────────────────────────────────

export type ReturnReason = "DEFECTIVE" | "WRONG_ITEM" | "CUSTOMER_CHANGE" | "DAMAGED" | "OTHER";

export interface SalesReturnItem {
  id: ID;
  orderItemId: ID;
  productId: ID;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  reason: ReturnReason;
}

export interface SalesReturn {
  id: ID;
  returnNumber: string;
  orderId: ID;
  orderNumber?: string;
  customerId?: ID | null;
  items: SalesReturnItem[];
  total: number;
  restock: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Stock Transfers ─────────────────────────────────────────────────────────

export interface StockTransfer {
  id: ID;
  transferNumber: string;
  fromWarehouseId?: ID | null;
  toWarehouseId?: ID | null;
  items: { productId: ID; name: string; sku: string; quantity: number }[];
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Expense Categories ───────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: ID;
  name: string;
  color?: string;
  createdAt: string;
}

// ─── Audit Log (enterprise-grade) ─────────────────────────────────────────────

export type AuditAction =
  | "LOGIN" | "LOGOUT"
  | "CREATE" | "EDIT" | "DELETE"
  | "PRINT" | "EXPORT"
  | "REFUND" | "RETURN"
  | "STOCK_ADJUSTMENT" | "TRANSFER"
  | "PURCHASE" | "SALE" | "GRN"
  | "EXPENSE"
  | "SETTINGS_CHANGE" | "BACKUP";

export interface AuditEntry {
  id: ID;
  action: AuditAction;
  entity: string;
  entityId?: string;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  timestamp: string;
  ip?: string | null;
  browser?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  meta?: Record<string, unknown>;
  createdAt: string;
}

// ─── Expanded Business Settings ──────────────────────────────────────────────
// Extends the existing BusinessSettings shape with enterprise fields. The
// settings-service merges these with the legacy singleton so existing
// settings/save paths continue to work unchanged.

export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type TimeFormat = "12h" | "24h";
export type ThermalSize = "58mm" | "80mm" | "A4";

export interface Prefixes {
  invoice: string;
  purchase: string;
  grn: string;
  barcode: string;
  return: string;
  transfer: string;
}

export interface EnterpriseSettings {
  // legacy (kept in sync with BusinessSettings)
  id: string;
  storeName: string;
  storePhone?: string;
  logo?: string | null;
  currency: string;
  currencySymbol: string;
  receiptFooter?: string;
  taxRates: import("@/types").TaxRate[];
  printerName?: string;
  theme: "light" | "dark" | "system";
  language: string;
  updatedAt: string;

  // enterprise additions
  companyAddress?: string;
  companyEmail?: string;
  companyWebsite?: string;
  tin?: string;
  vatNumber?: string;
  receiptHeader?: string;
  defaultTaxPercent?: number;
  defaultWarehouseId?: ID | null;
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
  receiptWidth?: ThermalSize;
  thermalPrinterSize?: ThermalSize;
  autoBackup?: boolean;
  autoBackupFrequencyDays?: number;
  prefixes?: Prefixes;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export type SearchEntityType =
  | "product" | "invoice" | "customer" | "supplier" | "employee"
  | "purchaseOrder" | "grn" | "expense" | "category" | "transaction"
  | "return" | "creditSale";

export interface SearchHit {
  id: ID;
  type: SearchEntityType;
  label: string;
  sublabel?: string;
  href: string;
  score: number;
}

export interface SearchResults {
  query: string;
  total: number;
  hits: SearchHit[];
  grouped: Record<SearchEntityType, SearchHit[]>;
}
