"use client";
import { useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useDb } from "@/hooks/use-db";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PremiumLock } from "@/components/billing/premium-lock";
import { exportBackup, downloadBackup, restoreBackup } from "@/services/backup";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";

export default function SettingsPage() {
  const db = useDb();
  const isPremium = useAuthStore((s) => s.isPremium);
  const { currency, currencySymbol, setCurrency, theme, setTheme, language, setLanguage } = useUIStore();
  const settings = useLiveQuery(() => db?.settings.get("default"), [db]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [storeName, setStoreName] = useState(settings?.storeName ?? "");
  const [footer, setFooter] = useState(settings?.receiptFooter ?? "");

  const saveSettings = async () => {
    if (!db) return;
    await db.settings.put({
      id: "default",
      storeName,
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
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="My Shop" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value, currencySymbol)} placeholder="USD" />
            </div>
            <div>
              <Label>Currency Symbol</Label>
              <Input value={currencySymbol} onChange={(e) => setCurrency(currency, e.target.value)} placeholder="$" />
            </div>
          </div>
          <div>
            <Label>Receipt Footer</Label>
            <Input value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Thank you for your business!" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Theme</Label>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                value={theme}
                onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <Label>Language</Label>
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" />
            </div>
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
            All your business data lives in this browser. Export it as JSON to migrate to another device, or restore a
            previous backup.
          </p>
          <div className="flex gap-3">
            {isPremium ? (
              <Button variant="outline" onClick={handleBackup}>
                <Download className="h-4 w-4" /> Download Backup (JSON)
              </Button>
            ) : (
              <PremiumLock label="Backup & Restore">
                <Button variant="outline" type="button">
                  <Download className="h-4 w-4" /> Download Backup (JSON)
                </Button>
              </PremiumLock>
            )}
            {isPremium ? (
              <>
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
              </>
            ) : (
              <PremiumLock label="Backup & Restore">
                <Button variant="outline" type="button">
                  <Upload className="h-4 w-4" /> Restore from JSON
                </Button>
              </PremiumLock>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
