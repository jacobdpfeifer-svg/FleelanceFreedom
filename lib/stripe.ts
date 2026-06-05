import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured.");
    }
    stripe = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return stripe;
}

export function getPriceId(plan: "pro" | "agency"): string | undefined {
  if (plan === "pro") {
    return (
      process.env.STRIPE_PRICE_PRO ??
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
    );
  }
  return (
    process.env.STRIPE_PRICE_AGENCY ??
    process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY
  );
}

export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production")
    throw new Error("NEXT_PUBLIC_APP_URL is not set.");
  return "http://localhost:3000";
}
