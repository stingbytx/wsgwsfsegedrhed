"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarcodeCanvas } from "./barcode-canvas";
import { X, Printer } from "lucide-react";
import type { Product } from "@/types";

/** Prints one scannable label per product (name, price, barcode). */
export function BarcodeLabelsDialog({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const withBarcodes = products.filter((p) => p.barcode);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-5 max-h-[85vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-semibold text-slate-800 mb-1">Barcode Labels</h3>
        <p className="text-sm text-slate-500 mb-4">
          {withBarcodes.length} of {products.length} products have a barcode. Add one in Edit Product to include it here.
        </p>

        <div id="barcode-print-area" className="print-area grid grid-cols-3 gap-4">
          {withBarcodes.map((p) => (
            <div key={p.id} className="border border-slate-200 rounded-lg p-2 flex flex-col items-center">
              <p className="text-xs font-medium text-slate-700 text-center truncate w-full">{p.name}</p>
              <BarcodeCanvas value={p.barcode!} />
            </div>
          ))}
          {withBarcodes.length === 0 && <p className="col-span-3 text-center text-slate-400 py-8">No products with barcodes yet.</p>}
        </div>

        <Button className="w-full mt-5" onClick={() => window.print()} disabled={withBarcodes.length === 0}>
          <Printer className="h-4 w-4" /> Print Labels
        </Button>
      </Card>
    </div>
  );
}
