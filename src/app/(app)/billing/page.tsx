"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { FREE_LIMITS } from "@/lib/plan-limits";

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const { user, plan, isPremium } = useAuthStore();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast.success("Subscription approved! It may take a moment for Premium to activate.");
      // Re-fetch the user so refreshed metadata (once the webhook lands) is picked up.
      createClient().auth.getUser();
    } else if (status === "cancelled") {
      toast.info("Checkout was cancelled.");
    }
  }, [searchParams]);

  const upgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/paypal/create-subscription", { method: "POST" });
      const data = await res.json();
      if (data.approveUrl) {
        window.location.href = data.approveUrl;
      } else {
        toast.error("Could not start PayPal checkout. Check server PayPal configuration.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Billing</h1>
        <p className="text-sm text-slate-500">
          Signed in as {user?.email} — current plan: <span className="font-semibold">{plan}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={!isPremium ? "ring-2 ring-[#0070E0]" : ""}>
          <CardHeader>
            <CardTitle className="text-slate-700 text-base">Free</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-slate-800">$0</p>
            <ul className="space-y-1.5 text-sm text-slate-600 mt-3">
              <li className="flex gap-2"><Check className="h-4 w-4 text-[#009CDE]" /> Up to {FREE_LIMITS.products} products</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-[#009CDE]" /> Up to {FREE_LIMITS.orders} orders</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-[#009CDE]" /> Up to {FREE_LIMITS.customers} customers</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-[#009CDE]" /> Cash, Card &amp; Credit payments</li>
              <li className="flex gap-2 text-slate-400"><Lock className="h-4 w-4" /> Receipt printing</li>
              <li className="flex gap-2 text-slate-400"><Lock className="h-4 w-4" /> Backup &amp; restore</li>
            </ul>
          </CardContent>
        </Card>

        <Card className={isPremium ? "ring-2 ring-[#0070E0]" : ""}>
          <CardHeader>
            <CardTitle className="text-slate-700 text-base">Premium</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-slate-800">Subscription via PayPal</p>
            <ul className="space-y-1.5 text-sm text-slate-600 mt-3">
              <li className="flex gap-2"><Check className="h-4 w-4 text-[#009CDE]" /> Unlimited products, orders, customers</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-[#009CDE]" /> Advanced reports &amp; profit analytics</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-[#009CDE]" /> Barcode generation &amp; printing</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-[#009CDE]" /> Receipt &amp; report printing</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-[#009CDE]" /> JSON backup &amp; restore</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-[#009CDE]" /> Priority support</li>
            </ul>
            {isPremium ? (
              <p className="text-sm font-medium text-[#009CDE] mt-3">You're on Premium 🎉</p>
            ) : (
              <Button className="w-full mt-3" onClick={upgrade} loading={loading}>
                Upgrade with PayPal
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
