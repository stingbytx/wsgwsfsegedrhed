"use client";
import { formatCurrency } from "@/lib/utils";
import type { Order, Customer, BusinessSettings } from "@/types";

interface ReceiptProps {
  order: Order;
  customer?: Customer | null;
  settings?: BusinessSettings | null;
  currencySymbol: string;
}

/** A normal thermal/A4-style receipt — store name, date/time, items, customer, totals, footer. */
export function Receipt({ order, customer, settings, currencySymbol }: ReceiptProps) {
  const date = new Date(order.createdAt);
  return (
    <div id="receipt-print-area" className="print-area mx-auto max-w-xs bg-white p-4 font-mono text-[12px] text-black">
      <div className="text-center mb-2">
        <p className="font-bold text-sm">{settings?.storeName || "Universal POS"}</p>
        {settings?.storePhone && (
          <p className="text-[10px]">{settings.storePhone}</p>
        )}
        <p className="text-[10px] text-gray-500 italic">Powered by UniPOS</p>
      </div>
      <div className="border-t border-dashed border-black my-2" />
      <div className="flex justify-between">
        <span>Order #</span>
        <span>{order.orderNumber}</span>
      </div>
      <div className="flex justify-between">
        <span>Date</span>
        <span>{date.toLocaleDateString()}</span>
      </div>
      <div className="flex justify-between">
        <span>Time</span>
        <span>{date.toLocaleTimeString()}</span>
      </div>
      {customer && (
        <>
          <div className="flex justify-between">
            <span>Customer</span>
            <span>{customer.name}</span>
          </div>
          {customer.phone && (
            <div className="flex justify-between">
              <span>Phone</span>
              <span>{customer.phone}</span>
            </div>
          )}
        </>
      )}
      <div className="border-t border-dashed border-black my-2" />
      {order.items.map((item) => (
        <div key={item.id} className="mb-1">
          <div className="flex justify-between">
            <span>{item.name}</span>
            <span>{formatCurrency(item.total, currencySymbol)}</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-700">
            <span>
              {item.quantity} x {formatCurrency(item.price, currencySymbol)}
            </span>
          </div>
        </div>
      ))}
      <div className="border-t border-dashed border-black my-2" />
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatCurrency(order.subtotal, currencySymbol)}</span>
      </div>
      {order.discount && (
        <div className="flex justify-between">
          <span>Discount</span>
          <span>
            -{order.discount.type === "PERCENT" ? `${order.discount.value}%` : formatCurrency(order.discount.value, currencySymbol)}
          </span>
        </div>
      )}
      {order.taxTotal > 0 && (
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatCurrency(order.taxTotal, currencySymbol)}</span>
        </div>
      )}
      <div className="border-t border-dashed border-black my-2" />
      <div className="flex justify-between font-bold text-sm">
        <span>TOTAL</span>
        <span>{formatCurrency(order.total, currencySymbol)}</span>
      </div>
      <div className="flex justify-between mt-1">
        <span>Paid ({order.payments.map((p) => p.method).join(", ")})</span>
        <span>{formatCurrency(order.amountPaid, currencySymbol)}</span>
      </div>
      {order.balanceDue > 0 && (
        <div className="flex justify-between font-bold">
          <span>Balance Due</span>
          <span>{formatCurrency(order.balanceDue, currencySymbol)}</span>
        </div>
      )}
      <div className="border-t border-dashed border-black my-2" />
      <p className="text-center mt-3">{settings?.receiptFooter || "Thank you for your business!"}</p>
    </div>
  );
}
