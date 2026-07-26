"use client";
import * as React from "react";

export interface ShortcutDef {
  key: string; // e.g. "F1", "Escape"
  ctrl?: boolean;
  shift?: boolean;
  handler: () => void;
  description?: string;
  // skip when the active element is an input/textarea (for typing keys)
  ignoreOnInput?: boolean;
}

/** Register global keyboard shortcuts. Unmounts cleanly. */
export function useKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toUpperCase();
      const onInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      for (const s of shortcuts) {
        if (s.ignoreOnInput && onInput && s.key !== "Escape") continue;
        if (e.ctrlKey !== !!s.ctrl) continue;
        if (e.shiftKey !== !!s.shift) continue;
        if (e.key.toLowerCase() === s.key.toLowerCase()) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}

export const POS_SHORTCUTS = [
  { key: "F1", description: "Product Search" },
  { key: "F2", description: "Customer Search" },
  { key: "F3", description: "Hold Invoice" },
  { key: "F4", description: "Payment" },
  { key: "F5", description: "Complete Sale" },
  { key: "F6", description: "Print" },
  { key: "F7", description: "New Customer" },
  { key: "F8", description: "Discount" },
  { key: "Escape", description: "Cancel" },
] as const;
