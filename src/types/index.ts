// ============================================================================
// Core domain types for Universal POS
// ============================================================================

export type ID = string;

export type SubscriptionPlan = "FREE" | "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export interface SubscriptionState {
  plan: SubscriptionPlan;
  isPremium: boolean;
  paypalSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  updatedAt?: string | null;
}

export interface Product {
  id: ID;
  name: string;
  sku: string;
  barcode?: string;
  categoryId?: ID | null;
  price: number;
  cost?: number;
  stock: number;
  lowStockThreshold?: number;
  image?: string | null;
  unit?: string;
  taxRateId?: ID | null;
  expirationDate?: string | null;
  isFavorite?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: ID;
  name: string;
  color?: string;
  icon?: string;
  createdAt: string;
}

export interface Supplier {
  id: ID;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export type PaymentMethod = "CASH" | "CARD" | "CREDIT" | "SPLIT";

export interface Payment {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export type DiscountType = "PERCENT" | "FIXED";

export interface OrderItem {
  id: ID;
  productId: ID;
  name: string;
  sku: string;
  price: number;
  cost?: number;
  quantity: number;
  discount?: { type: DiscountType; value: number };
  taxRate?: number;
  notes?: string;
  total: number;
}

export type OrderStatus = "COMPLETED" | "HELD" | "REFUNDED" | "PARTIALLY_REFUNDED" | "CANCELLED";

export interface Order {
  id: ID;
  orderNumber: string;
  customerId?: ID | null;
  items: OrderItem[];
  subtotal: number;
  discount?: { type: DiscountType; value: number };
  taxTotal: number;
  total: number;
  payments: Payment[];
  amountPaid: number;
  balanceDue: number;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cashierId?: string;
}

export interface InventoryMovement {
  id: ID;
  productId: ID;
  type: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" | "SALE" | "RETURN";
  quantity: number;
  reason?: string;
  supplierId?: ID | null;
  createdAt: string;
}

export interface Customer {
  id: ID;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditBalance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditSale {
  id: ID;
  orderId: ID;
  customerId: ID;
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  dueDate?: string | null;
  paymentHistory: { amount: number; date: string; note?: string }[];
  status: "OPEN" | "PARTIAL" | "PAID" | "OVERDUE";
  createdAt: string;
}

export interface Expense {
  id: ID;
  category: string;
  description?: string;
  amount: number;
  date: string;
  createdAt: string;
}

export interface HeldOrder {
  id: ID;
  label?: string;
  items: OrderItem[];
  customerId?: ID | null;
  createdAt: string;
}

export interface Receipt {
  id: ID;
  orderId: ID;
  format: "THERMAL" | "A4";
  printedAt: string;
}

export interface ActivityLog {
  id: ID;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface TaxRate {
  id: ID;
  name: string;
  rate: number;
  isDefault?: boolean;
}

export interface BusinessSettings {
  id: string; // singleton "default"
  storeName: string;
  logo?: string | null;
  currency: string;
  currencySymbol: string;
  receiptFooter?: string;
  taxRates: TaxRate[];
  printerName?: string;
  theme: "light" | "dark" | "system";
  language: string;
  updatedAt: string;
}
