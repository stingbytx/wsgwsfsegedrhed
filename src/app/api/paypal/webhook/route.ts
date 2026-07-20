import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/paypal";
import type { SubscriptionPlan } from "@/types";

// PayPal sends subscription lifecycle events here. We verify the signature
// server-side (never trust the browser), then update the user's plan in
// Supabase auth user_metadata — no separate business DB table needed.

const EVENT_TO_PLAN: Record<string, SubscriptionPlan> = {
  "BILLING.SUBSCRIPTION.ACTIVATED": "ACTIVE",
  "BILLING.SUBSCRIPTION.RE-ACTIVATED": "ACTIVE",
  "PAYMENT.SALE.COMPLETED": "ACTIVE",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED": "PAST_DUE",
  "BILLING.SUBSCRIPTION.SUSPENDED": "PAST_DUE",
  "BILLING.SUBSCRIPTION.CANCELLED": "CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED": "EXPIRED",
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  let verified = false;
  try {
    verified = await verifyWebhookSignature(request.headers, rawBody);
  } catch (err) {
    console.error("PayPal webhook verification error", err);
  }

  if (!verified) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType: string = event.event_type;
  const resource = event.resource ?? {};

  const newPlan = EVENT_TO_PLAN[eventType];
  if (!newPlan) {
    // Event we don't act on (e.g. informational events) — acknowledge and exit.
    return NextResponse.json({ received: true });
  }

  // custom_id was set to the Supabase user id when the subscription was created.
  const userId: string | undefined = resource.custom_id ?? resource.subscriber?.payer_id;
  const subscriptionId: string | undefined = resource.id ?? resource.billing_agreement_id;

  if (!userId) {
    console.error("PayPal webhook missing custom_id user reference", eventType);
    return NextResponse.json({ received: true, warning: "no user reference" });
  }

  const admin = createAdminClient();
  const { data: userData, error: fetchError } = await admin.auth.admin.getUserById(userId);
  if (fetchError || !userData?.user) {
    console.error("Could not find Supabase user for PayPal webhook", userId, fetchError);
    return NextResponse.json({ received: true, warning: "user not found" });
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...userData.user.user_metadata,
      plan: newPlan,
      paypal_subscription_id: subscriptionId,
      subscription_updated_at: new Date().toISOString(),
    },
  });

  if (updateError) {
    console.error("Failed to update subscription plan", updateError);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }

  return NextResponse.json({ received: true, plan: newPlan });
}
