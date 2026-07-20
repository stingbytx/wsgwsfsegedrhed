import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPayPalAccessToken, PAYPAL_BASE } from "@/lib/paypal";

// Called from the Upgrade button. Creates a PayPal subscription and returns
// the approval URL to redirect the user to PayPal Checkout.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const planId = process.env.PAYPAL_PLAN_ID;
  if (!planId) {
    return NextResponse.json({ error: "PAYPAL_PLAN_ID not configured" }, { status: 500 });
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: user.id, // links the PayPal subscription back to this Supabase user
        subscriber: { email_address: user.email },
        application_context: {
          brand_name: "Universal POS",
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?status=success`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?status=cancelled`,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status });
    }

    const approveLink = data.links?.find((l: { rel: string; href: string }) => l.rel === "approve")?.href;
    return NextResponse.json({ approveUrl: approveLink, subscriptionId: data.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
