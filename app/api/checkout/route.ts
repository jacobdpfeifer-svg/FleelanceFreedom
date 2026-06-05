import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { getAppUrl, getPriceId, getStripe } from "@/lib/stripe";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plan?: Plan };
  try {
    body = (await req.json()) as { plan?: Plan };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan = body.plan;
  if (plan !== "pro" && plan !== "agency") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = getPriceId(plan);
  if (!priceId) {
    return NextResponse.json({ error: "Price not configured" }, { status: 500 });
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("email, stripe_customer_id, plan")
    .eq("id", user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();
  let customerId = userRow.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create(
      { email: userRow.email ?? user.email ?? undefined, metadata: { userId: user.id } },
      { idempotencyKey: `customer_${user.id}` }
    );
    customerId = customer.id;

    const admin = createAdminClient();
    await admin
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=canceled`,
    metadata: {
      userId: user.id,
      plan,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        plan,
      },
    },
  });

  if (!checkoutSession.url) {
    return NextResponse.json(
      { error: "Could not create checkout session" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: checkoutSession.url });
}
