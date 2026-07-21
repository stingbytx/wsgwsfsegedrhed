import { create } from "zustand";
import type { OrderItem, Product, DiscountType } from "@/types";
import { generateId } from "@/lib/utils";

interface CartState {
  items: OrderItem[];
  customerId: string | null;
  orderDiscount: { type: DiscountType; value: number } | null;
  notes: string;
  addProduct: (product: Product) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  removeItem: (itemId: string) => void;
  setItemDiscount: (itemId: string, discount: { type: DiscountType; value: number } | null) => void;
  setOrderDiscount: (discount: { type: DiscountType; value: number } | null) => void;
  setCustomer: (customerId: string | null) => void;
  setNotes: (notes: string) => void;
  clear: () => void;
  loadItems: (items: OrderItem[]) => void;
}

function computeItemTotal(item: OrderItem): number {
  let total = item.price * item.quantity;
  if (item.discount) {
    total -= item.discount.type === "PERCENT" ? total * (item.discount.value / 100) : item.discount.value;
  }
  if (item.taxRate) total += total * (item.taxRate / 100);
  return Math.max(0, total);
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  orderDiscount: null,
  notes: "",
  addProduct: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === existing.id
              ? { ...i, quantity: i.quantity + 1, total: computeItemTotal({ ...i, quantity: i.quantity + 1 }) }
              : i
          ),
        };
      }
      const item: OrderItem = {
        id: generateId(),
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        cost: product.cost,
        quantity: 1,
        total: product.price,
      };
      return { items: [...state.items, item] };
    }),
  updateQuantity: (itemId, qty) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.id === itemId ? { ...i, quantity: qty, total: computeItemTotal({ ...i, quantity: qty }) } : i))
        .filter((i) => i.quantity > 0),
    })),
  removeItem: (itemId) => set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),
  setItemDiscount: (itemId, discount) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === itemId ? { ...i, discount: discount ?? undefined, total: computeItemTotal({ ...i, discount: discount ?? undefined }) } : i
      ),
    })),
  setOrderDiscount: (discount) => set({ orderDiscount: discount }),
  setCustomer: (customerId) => set({ customerId }),
  setNotes: (notes) => set({ notes }),
  clear: () => set({ items: [], customerId: null, orderDiscount: null, notes: "" }),
  loadItems: (items) => set({ items }),
}));

export function selectSubtotal(state: CartState): number {
  return state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function selectTax(state: CartState): number {
  return state.items.reduce((sum, i) => {
    const base = i.price * i.quantity;
    return sum + (i.taxRate ? base * (i.taxRate / 100) : 0);
  }, 0);
}

export function selectTotal(state: CartState): number {
  const subtotal = state.items.reduce((sum, i) => sum + computeItemTotal(i), 0);
  let total = subtotal;
  if (state.orderDiscount) {
    total -= state.orderDiscount.type === "PERCENT" ? total * (state.orderDiscount.value / 100) : state.orderDiscount.value;
  }
  return Math.max(0, total);
}
