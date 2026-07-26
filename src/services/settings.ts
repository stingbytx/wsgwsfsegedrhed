// ============================================================================
// Settings Engine — single source of truth for business settings.
//
// Reads/writes the legacy `settings` singleton (unchanged shape, so the
// existing settings page keeps working) AND a mirrored `enterpriseSettings`
// record that holds the extended enterprise fields. A unified
// `getMergedSettings()` returns one object for the whole app to consume.
// ============================================================================

import type { PosDatabase } from "@/lib/db";
import type { BusinessSettings, TaxRate } from "@/types";
import type { EnterpriseSettings, Prefixes, DateFormat, TimeFormat, ThermalSize } from "@/types/enterprise";
import { nowIso } from "@/lib/utils";
import { configureFormat } from "@/lib/format";

export const DEFAULT_PREFIXES: Prefixes = {
  invoice: "INV",
  purchase: "PO",
  grn: "GRN",
  barcode: "2",
  return: "RET",
  transfer: "TRF",
};

const DEFAULT_ENTERPRISE: Omit<EnterpriseSettings, "id" | "updatedAt" | "storeName" | "currency" | "currencySymbol" | "taxRates" | "theme" | "language"> = {
  storePhone: undefined,
  logo: null,
  printerName: undefined,
  receiptFooter: "Thank you for your business!",
  companyAddress: undefined,
  companyEmail: undefined,
  companyWebsite: undefined,
  tin: undefined,
  vatNumber: undefined,
  receiptHeader: undefined,
  defaultTaxPercent: 0,
  defaultWarehouseId: null,
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  receiptWidth: "80mm",
  thermalPrinterSize: "80mm",
  autoBackup: false,
  autoBackupFrequencyDays: 7,
  prefixes: { ...DEFAULT_PREFIXES },
};

/** Merge the legacy singleton with the enterprise record. */
export async function getMergedSettings(db: PosDatabase): Promise<EnterpriseSettings> {
  const [legacy, ent] = await Promise.all([
    db.settings.get("default"),
    db.enterpriseSettings.get("default"),
  ]);

  const merged: EnterpriseSettings = {
    ...DEFAULT_ENTERPRISE,
    ...ent,
    // legacy always wins for the shared fields
    id: "default",
    storeName: legacy?.storeName ?? ent?.storeName ?? "My Store",
    storePhone: legacy?.storePhone ?? ent?.storePhone,
    logo: legacy?.logo ?? ent?.logo ?? null,
    currency: legacy?.currency ?? ent?.currency ?? "USD",
    currencySymbol: legacy?.currencySymbol ?? ent?.currencySymbol ?? "$",
    receiptFooter: legacy?.receiptFooter ?? ent?.receiptFooter,
    taxRates: legacy?.taxRates ?? ent?.taxRates ?? [],
    printerName: legacy?.printerName ?? ent?.printerName,
    theme: legacy?.theme ?? ent?.theme ?? "light",
    language: legacy?.language ?? ent?.language ?? "en",
    updatedAt: nowIso(),
  };

  // Apply to global formatter so every component formats consistently.
  configureFormat({
    currencySymbol: merged.currencySymbol,
    dateFormat: merged.dateFormat ?? "DD/MM/YYYY",
    timeFormat: merged.timeFormat ?? "12h",
  });

  return merged;
}

/** Persist settings — writes BOTH the legacy singleton (for the existing
 *  settings page + backup) and the enterprise record. Atomic-ish. */
export async function saveMergedSettings(db: PosDatabase, s: EnterpriseSettings): Promise<void> {
  const now = nowIso();
  const legacy: BusinessSettings = {
    id: "default",
    storeName: s.storeName,
    storePhone: s.storePhone,
    logo: s.logo ?? null,
    currency: s.currency,
    currencySymbol: s.currencySymbol,
    receiptFooter: s.receiptFooter,
    taxRates: s.taxRates ?? [],
    printerName: s.printerName,
    theme: s.theme,
    language: s.language,
    updatedAt: now,
  };
  const enterprise: EnterpriseSettings = { ...s, id: "default", updatedAt: now };
  await Promise.all([db.settings.put(legacy), db.enterpriseSettings.put(enterprise)]);
  configureFormat({ currencySymbol: s.currencySymbol, dateFormat: s.dateFormat ?? "DD/MM/YYYY", timeFormat: s.timeFormat ?? "12h" });
}

export async function getPrefixes(db: PosDatabase): Promise<Prefixes> {
  const s = await getMergedSettings(db);
  return s.prefixes ?? DEFAULT_PREFIXES;
}

export async function getTaxRates(db: PosDatabase): Promise<TaxRate[]> {
  const s = await getMergedSettings(db);
  return s.taxRates ?? [];
}

export function defaultTaxRates(): TaxRate[] {
  return [{ id: "default-tax", name: "Standard", rate: 0, isDefault: true }];
}

export type { DateFormat, TimeFormat, ThermalSize };
