"use client";
import { useState, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { useUIStore } from "@/stores/ui-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/form";
import { exportBackup, downloadBackup, restoreBackup } from "@/services/backup";
import { getMergedSettings, saveMergedSettings, DEFAULT_PREFIXES } from "@/services/settings";
import type { EnterpriseSettings, DateFormat, TimeFormat, ThermalSize } from "@/types/enterprise";
import { toast } from "sonner";
import { Download, Upload, Building2, Stamp, Sliders, Palette, DatabaseBackup } from "lucide-react";

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "MXN", symbol: "Mex$", name: "Mexican Peso" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "ARS", symbol: "AR$", name: "Argentine Peso" },
  { code: "CLP", symbol: "CL$", name: "Chilean Peso" },
  { code: "COP", symbol: "CO$", name: "Colombian Peso" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
  { code: "RON", symbol: "lei", name: "Romanian Leu" },
  { code: "BGN", symbol: "лв", name: "Bulgarian Lev" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  { code: "MAD", symbol: "MAD", name: "Moroccan Dirham" },
  { code: "DZD", symbol: "DA", name: "Algerian Dinar" },
  { code: "TND", symbol: "DT", name: "Tunisian Dinar" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "SAR", symbol: "SR", name: "Saudi Riyal" },
  { code: "QAR", symbol: "QR", name: "Qatari Riyal" },
  { code: "KWD", symbol: "KD", name: "Kuwaiti Dinar" },
  { code: "BHD", symbol: "BD", name: "Bahraini Dinar" },
  { code: "OMR", symbol: "OMR", name: "Omani Rial" },
  { code: "JOD", symbol: "JD", name: "Jordanian Dinar" },
  { code: "ILS", symbol: "₪", name: "Israeli Shekel" },
  { code: "IQD", symbol: "IQD", name: "Iraqi Dinar" },
];

export default function SettingsPage() {
  const db = useDb();
  const { currency, currencySymbol, setCurrency, theme, language } = useUIStore();
  const settings = useLiveQuery(() => db?.settings.get("default"), [db]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [footer, setFooter] = useState("");

  // Sync from DB when settings load
  useEffect(() => {
    if (settings) {
      setStoreName(settings.storeName ?? "");
      setStorePhone(settings.storePhone ?? "");
      setFooter(settings.receiptFooter ?? "");
    }
  }, [settings]);

  const saveSettings = async () => {
    if (!db) return;
    await db.settings.put({
      id: "default",
      storeName,
      storePhone,
      currency,
      currencySymbol,
      receiptFooter: footer,
      taxRates: settings?.taxRates ?? [],
      theme,
      language,
      updatedAt: new Date().toISOString(),
    });
    toast.success("Settings saved");
  };

  const handleCurrencyChange = (code: string) => {
    const found = CURRENCIES.find((c) => c.code === code);
    if (found) setCurrency(found.code, found.symbol);
  };

  const handleBackup = async () => {
    if (!db) return;
    const backup = await exportBackup(db);
    downloadBackup(backup);
    toast.success("Backup downloaded");
  };

  const handleRestore = async (file: File) => {
    if (!db) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await restoreBackup(db, parsed);
      toast.success("Backup restored");
    } catch {
      toast.error("Invalid backup file");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-800">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Store Name</Label>
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="My Shop"
            />
          </div>
          <div>
            <Label>Store Contact Number</Label>
            <Input
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              placeholder="+94 77 123 4567"
            />
          </div>
          <div>
            <Label>Currency</Label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0070E0]/30"
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol}) — {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Selected symbol: <strong>{currencySymbol}</strong>
            </p>
          </div>
          <div>
            <Label>Receipt Footer</Label>
            <Input
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="Thank you for your business!"
            />
          </div>
          <Button onClick={saveSettings}>Save Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup &amp; Restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">
            All your business data lives in this browser. Export it as JSON to migrate to another device, or
            restore a previous backup.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBackup}>
              <Download className="h-4 w-4" /> Download Backup (JSON)
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Restore from JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleRestore(e.target.files[0])}
            />
          </div>
        </CardContent>
      </Card>

      <EnterpriseSettingsCards />
    </div>
  );
}

// ─── Enterprise settings (additive) ───────────────────────────────────────────
// Separate component so the legacy cards above remain untouched. Reads the
// merged settings and writes through `saveMergedSettings`, which persists
// BOTH the legacy singleton and the enterprise record.
function EnterpriseSettingsCards() {
  const db = useDb();
  const { theme, setTheme, currency, setCurrency } = useUIStore();
  const merged = useLiveQuery(() => (db ? getMergedSettings(db) : Promise.resolve(undefined)), [db]);

  const [company, setCompany] = useState({
    companyAddress: "", companyEmail: "", companyWebsite: "",
    tin: "", vatNumber: "", receiptHeader: "", defaultTaxPercent: "0",
  });
  const [prefixes, setPrefixes] = useState(DEFAULT_PREFIXES);
  const [formats, setFormats] = useState<{ dateFormat: DateFormat; timeFormat: TimeFormat; receiptWidth: ThermalSize; thermalPrinterSize: ThermalSize }>({
    dateFormat: "DD/MM/YYYY", timeFormat: "12h", receiptWidth: "80mm", thermalPrinterSize: "80mm",
  });
  const [backup, setBackup] = useState({ autoBackup: false, autoBackupFrequencyDays: "7" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!merged) return;
    setCompany({
      companyAddress: merged.companyAddress ?? "",
      companyEmail: merged.companyEmail ?? "",
      companyWebsite: merged.companyWebsite ?? "",
      tin: merged.tin ?? "",
      vatNumber: merged.vatNumber ?? "",
      receiptHeader: merged.receiptHeader ?? "",
      defaultTaxPercent: String(merged.defaultTaxPercent ?? 0),
    });
    setPrefixes(merged.prefixes ?? DEFAULT_PREFIXES);
    setFormats({
      dateFormat: merged.dateFormat ?? "DD/MM/YYYY",
      timeFormat: merged.timeFormat ?? "12h",
      receiptWidth: merged.receiptWidth ?? "80mm",
      thermalPrinterSize: merged.thermalPrinterSize ?? "80mm",
    });
    setBackup({ autoBackup: merged.autoBackup ?? false, autoBackupFrequencyDays: String(merged.autoBackupFrequencyDays ?? 7) });
  }, [merged]);

  const save = async () => {
    if (!db || !merged) return;
    setSaving(true);
    const next: EnterpriseSettings = {
      ...merged,
      companyAddress: company.companyAddress || undefined,
      companyEmail: company.companyEmail || undefined,
      companyWebsite: company.companyWebsite || undefined,
      tin: company.tin || undefined,
      vatNumber: company.vatNumber || undefined,
      receiptHeader: company.receiptHeader || undefined,
      defaultTaxPercent: Number(company.defaultTaxPercent) || 0,
      prefixes,
      dateFormat: formats.dateFormat,
      timeFormat: formats.timeFormat,
      receiptWidth: formats.receiptWidth,
      thermalPrinterSize: formats.thermalPrinterSize,
      autoBackup: backup.autoBackup,
      autoBackupFrequencyDays: Number(backup.autoBackupFrequencyDays) || 7,
      theme,
    };
    await saveMergedSettings(db, next);
    setSaving(false);
    toast.success("Enterprise settings saved");
  };

  if (!merged) return null;

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[#0070E0]" /> Company Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Address</Label><Input value={company.companyAddress} onChange={(e) => setCompany({ ...company, companyAddress: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={company.companyEmail} onChange={(e) => setCompany({ ...company, companyEmail: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Website</Label><Input value={company.companyWebsite} onChange={(e) => setCompany({ ...company, companyWebsite: e.target.value })} /></div>
            <div><Label>TIN</Label><Input value={company.tin} onChange={(e) => setCompany({ ...company, tin: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>VAT Number</Label><Input value={company.vatNumber} onChange={(e) => setCompany({ ...company, vatNumber: e.target.value })} /></div>
            <div><Label>Default Tax %</Label><Input type="number" value={company.defaultTaxPercent} onChange={(e) => setCompany({ ...company, defaultTaxPercent: e.target.value })} /></div>
          </div>
          <div><Label>Receipt Header</Label><Input value={company.receiptHeader} onChange={(e) => setCompany({ ...company, receiptHeader: e.target.value })} placeholder="Welcome / promo line" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Stamp className="h-4 w-4 text-[#0070E0]" /> Document Prefixes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><Label>Invoice</Label><Input value={prefixes.invoice} onChange={(e) => setPrefixes({ ...prefixes, invoice: e.target.value })} /></div>
            <div><Label>Purchase Order</Label><Input value={prefixes.purchase} onChange={(e) => setPrefixes({ ...prefixes, purchase: e.target.value })} /></div>
            <div><Label>GRN</Label><Input value={prefixes.grn} onChange={(e) => setPrefixes({ ...prefixes, grn: e.target.value })} /></div>
            <div><Label>Return</Label><Input value={prefixes.return} onChange={(e) => setPrefixes({ ...prefixes, return: e.target.value })} /></div>
            <div><Label>Transfer</Label><Input value={prefixes.transfer} onChange={(e) => setPrefixes({ ...prefixes, transfer: e.target.value })} /></div>
            <div><Label>Barcode</Label><Input value={prefixes.barcode} onChange={(e) => setPrefixes({ ...prefixes, barcode: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sliders className="h-4 w-4 text-[#0070E0]" /> Formats &amp; Printer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>Date Format</Label>
              <Select value={formats.dateFormat} onChange={(e) => setFormats({ ...formats, dateFormat: e.target.value as DateFormat })}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </Select>
            </div>
            <div><Label>Time Format</Label>
              <Select value={formats.timeFormat} onChange={(e) => setFormats({ ...formats, timeFormat: e.target.value as TimeFormat })}>
                <option value="12h">12-hour</option>
                <option value="24h">24-hour</option>
              </Select>
            </div>
            <div><Label>Receipt Width</Label>
              <Select value={formats.receiptWidth} onChange={(e) => setFormats({ ...formats, receiptWidth: e.target.value as ThermalSize })}>
                <option value="58mm">58mm</option>
                <option value="80mm">80mm</option>
                <option value="A4">A4</option>
              </Select>
            </div>
            <div><Label>Thermal Printer</Label>
              <Select value={formats.thermalPrinterSize} onChange={(e) => setFormats({ ...formats, thermalPrinterSize: e.target.value as ThermalSize })}>
                <option value="58mm">58mm</option>
                <option value="80mm">80mm</option>
                <option value="A4">A4</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-4 w-4 text-[#0070E0]" /> Appearance &amp; Auto-Backup</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Theme</Label>
              <Select value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </Select>
            </div>
            <div><Label>Currency</Label>
              <Select value={currency} onChange={(e) => {
                const found = CURRENCIES.find((c) => c.code === e.target.value);
                if (found) setCurrency(found.code, found.symbol);
              }}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.name}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={backup.autoBackup} onChange={(e) => setBackup({ ...backup, autoBackup: e.target.checked })} />
              <DatabaseBackup className="h-4 w-4 text-slate-400" /> Enable auto-backup reminder
            </label>
            <div className="flex items-center gap-2">
              <Label className="mb-0">Every</Label>
              <Input type="number" value={backup.autoBackupFrequencyDays} onChange={(e) => setBackup({ ...backup, autoBackupFrequencyDays: e.target.value })} className="w-20 h-9" />
              <span className="text-sm text-slate-500">days</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>Save Enterprise Settings</Button>
      </div>
    </>
  );
}
