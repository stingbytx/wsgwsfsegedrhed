"use client";
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/** Renders a scannable CODE128 barcode onto a canvas for a given value. */
export function BarcodeCanvas({ value, label }: { value: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: "CODE128",
          width: 1.6,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 4,
        });
      } catch {
        // invalid characters for the barcode symbology — ignore render
      }
    }
  }, [value]);

  if (!value) return <p className="text-xs text-slate-400">No barcode set</p>;

  return (
    <div className="flex flex-col items-center">
      <canvas ref={ref} />
      {label && <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>}
    </div>
  );
}
