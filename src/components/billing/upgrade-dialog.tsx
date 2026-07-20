"use client";
import { useState } from "react";
import { Lock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  featureLabel?: string;
}

const PREMIUM_PERKS = [
  "Unlimited products, orders & customers",
  "Advanced reports & profit analytics",
  "Barcode generation & printing",
  "Receipt & report printing",
  "JSON backup & restore",
  "Priority support",
];

export function UpgradeDialog({ open, onClose, featureLabel }: UpgradeDialogProps) {
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/paypal/create-subscription", { method: "POST" });
      const data = await res.json();
      if (data.approveUrl) {
        window.location.href = data.approveUrl;
      } else {
        toast.error(data.error?.message || "Could not start checkout");
      }
    } catch {
      toast.error("Could not reach PayPal. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
        <div className="h-12 w-12 rounded-2xl bg-[#0070E0]/10 flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-[#0070E0]" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">
          {featureLabel ? `Unlock ${featureLabel}` : "Upgrade to Premium"}
        </h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          This feature is part of the Premium plan. Upgrade to unlock full access.
        </p>
        <ul className="space-y-2 mb-6">
          {PREMIUM_PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2 text-sm text-slate-600">
              <Check className="h-4 w-4 text-[#009CDE] shrink-0" /> {perk}
            </li>
          ))}
        </ul>
        <Button className="w-full" onClick={handleUpgrade} loading={loading}>
          Upgrade with PayPal
        </Button>
        <Button variant="ghost" className="w-full mt-2" onClick={onClose}>
          Maybe later
        </Button>
      </Card>
    </div>
  );
}
