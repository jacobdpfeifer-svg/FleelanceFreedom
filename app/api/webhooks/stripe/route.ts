import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";

function planFromMetadata(value: string | undefined): Plan | null {
  if (value === "pro" || value === "agency") return value;
  return null;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 400 }
    );
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Stripe webhook signature error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: dedupeError } = await admin
    .from("stripe_events")
    .insert({ id: event.id });
  if (dedupeError) {
    // 23505 = already processed; ack and stop.
    if (dedupeError.code === "23505")
      return NextResponse.json({ received: true, duplicate: true });
    console.error("stripe_events insert error:", dedupeError.message);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = planFromMetadata(session.metadata?.plan);

      if (!userId || !plan) break;

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      await admin
        .from("users")
        .update({
          plan,
          ...(customerId ? { stripe_customer_id: customerId } : {}),
        })
        .eq("id", userId);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      if (!customerId) break;

      await admin
        .from("users")
        .update({ plan: "free" })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
