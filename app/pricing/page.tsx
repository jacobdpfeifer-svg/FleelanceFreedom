import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import PricingCheckout from "./PricingCheckout";
import type { Plan } from "@/lib/types";

interface Props {
  searchParams: { checkout?: string };
}

const TIERS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try Freelance Freedom with one client.",
    features: [
      "1 client",
      "50 messages / month",
      "Memory editor & chat",
      "Onboarding voice capture",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$9",
    period: "/ month",
    description: "For freelancers juggling multiple clients.",
    features: [
      "Unlimited clients",
      "Unlimited messages",
      "Full decision history",
      "PDF memory export",
    ],
    highlighted: true,
  },
  {
    id: "agency" as const,
    name: "Agency",
    price: "$29",
    period: "/ month",
    description: "For teams managing many client voices.",
    features: [
      "Everything in Pro",
      "Priority support",
      "Team workflows (coming soon)",
      "Shared client libraries (coming soon)",
    ],
  },
];

export default async function PricingPage({ searchParams }: Props) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: user } = await supabase
    .from("users")
    .select("plan")
    .eq("id", session.user.id)
    .single();

  const currentPlan = (user?.plan as Plan) ?? "free";

  return (
    <div className="min-h-screen bg-warm-ivory">
      <nav className="border-b border-warm-taupe px-6 py-4 flex items-center gap-3 bg-white/60 backdrop-blur-sm">
        <Link
          href="/dashboard"
          className="text-warm-olive/60 hover:text-warm-olive text-sm transition-colors"
        >
          ← Dashboard
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-warm-olive">Pricing</h1>
          <p className="text-warm-olive/60 text-sm mt-2 max-w-md mx-auto">
            Store each client&apos;s voice once. Generate on-brand copy without
            re-explaining context every session.
          </p>
        </div>

        {searchParams.checkout === "canceled" && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3 rounded-xl text-center">
            Checkout canceled — no charges were made.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => {
            const isCurrent = currentPlan === tier.id;

            return (
              <div
                key={tier.id}
                className={`rounded-2xl border p-6 flex flex-col ${
                  tier.highlighted
                    ? "border-warm-olive bg-white shadow-md ring-1 ring-warm-olive/10"
                    : "border-warm-taupe bg-white/80"
                }`}
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-warm-olive">
                      {tier.name}
                    </h2>
                    {isCurrent && (
                      <span className="text-xs bg-warm-cream text-warm-olive/70 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-warm-olive/60 text-xs mt-1">
                    {tier.description}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-warm-olive">
                    {tier.price}
                  </span>
                  <span className="text-warm-olive/50 text-sm ml-1">
                    {tier.period}
                  </span>
                </div>

                <ul className="space-y-2 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="text-sm text-warm-olive/80 flex items-start gap-2"
                    >
                      <span className="text-warm-olive mt-0.5">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {tier.id === "free" ? (
                  <Link
                    href="/dashboard"
                    className="block w-full text-center bg-warm-cream hover:bg-warm-taupe/30 text-warm-olive px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {isCurrent ? "Current plan" : "Stay on Free"}
                  </Link>
                ) : (
                  <PricingCheckout
                    plan={tier.id}
                    currentPlan={currentPlan}
                    label={`Upgrade to ${tier.name}`}
                    highlighted={tier.highlighted}
                  />
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
