"use client";
import { useState, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { useUIStore } from "@/stores/ui-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { exportBackup, downloadBackup, restoreBackup } from "@/services/backup";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";

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
    </div>
  );
}
