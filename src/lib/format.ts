// ============================================================================
// Global formatting utilities — single source of truth for currency, dates,
// and numbers across the entire app. All modules import from here so the
// format is consistent and configurable from one place.
//
// These are pure helpers (no React) so they can be unit-tested and reused
// in services, exports, and print templates alike.
// ============================================================================

import type { DateFormat, TimeFormat } from "@/types/enterprise";

export interface FormatConfig {
  currencySymbol: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  locale?: string;
}

const DEFAULT_CONFIG: FormatConfig = {
  currencySymbol: "$",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  locale: undefined,
};

let _config: FormatConfig = { ...DEFAULT_CONFIG };

/** Configure the global formatter (called once on app boot from settings). */
export function configureFormat(cfg: Partial<FormatConfig>) {
  _config = { ..._config, ...cfg };
}

export function getFormatConfig(): FormatConfig {
  return _config;
}

// ─── Currency ────────────────────────────────────────────────────────────────

export function formatMoney(amount: number, symbol: string = _config.currencySymbol): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact money for dashboard tiles (e.g. 1.2K, 3.4M). */
export function formatMoneyCompact(amount: number, symbol: string = _config.currencySymbol): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${symbol}${(n / 1_000).toFixed(1)}K`;
  return formatMoney(n, symbol);
}

// ─── Dates & Times ─────────────────────────────────────────────────────────────

const PAD = (n: number) => String(n).padStart(2, "0");

export function formatDate(input: string | Date | null | undefined, fmt?: DateFormat): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const f = fmt ?? _config.dateFormat;
  const day = PAD(d.getDate());
  const month = PAD(d.getMonth() + 1);
  const year = d.getFullYear();
  switch (f) {
    case "MM/DD/YYYY": return `${month}/${day}/${year}`;
    case "YYYY-MM-DD": return `${year}-${month}-${day}`;
    case "DD/MM/YYYY":
    default: return `${day}/${month}/${year}`;
  }
}

export function formatTime(input: string | Date | null | undefined, fmt?: TimeFormat): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const f = fmt ?? _config.timeFormat;
  if (f === "24h") {
    return `${PAD(d.getHours())}:${PAD(d.getMinutes())}`;
  }
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${PAD(d.getMinutes())} ${ampm}`;
}

export function formatDateTime(input: string | Date | null | undefined, fmt?: DateFormat, tfmt?: TimeFormat): string {
  return `${formatDate(input, fmt)} ${formatTime(input, tfmt)}`;
}

/** Build an ISO date string (YYYY-MM-DD) from a Date — useful for filters. */
export function toDateInput(d: Date = new Date()): string {
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}`;
}

// ─── Numbers ───────────────────────────────────────────────────────────────────

export function formatNumber(n: number, decimals = 0): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(n: number, decimals = 1): string {
  return `${(Number.isFinite(n) ? n : 0).toFixed(decimals)}%`;
}

// ─── Misc helpers ────────────────────────────────────────────────────────────

export function safeNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

export function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
