"use client";

import { useState } from "react";
import type { Plan } from "@/lib/types";
import { Button } from "@/components/ui";

interface Props {
  plan: "pro" | "agency";
  currentPlan: Plan;
  label: string;
  highlighted?: boolean;
}

export default function PricingCheckout({
  plan,
  currentPlan,
  label,
  highlighted = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrent = currentPlan === plan;
  const isDowngrade =
    currentPlan === "agency" && plan === "pro";

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout failed. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Checkout failed. Please try again.");
      setLoading(false);
    }
  }

  if (isCurrent) {
    return (
      <span className="inline-block w-full text-center bg-raised text-text-muted px-4 py-2.5 rounded-lg text-sm font-medium">
        Current plan
      </span>
    );
  }

  if (isDowngrade) {
    return (
      <span className="inline-block w-full text-center text-text-muted text-xs py-2.5">
        Manage billing in Stripe
      </span>
    );
  }

  return (
    <div>
      <Button
        variant={highlighted ? "primary" : "secondary"}
        onClick={handleCheckout}
        disabled={loading}
        className="w-full justify-center"
      >
        {loading ? "Redirecting…" : label}
      </Button>
      {error && (
        <p className="text-xs text-danger mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
