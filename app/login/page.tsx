"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "./actions";
import Threads from "@/components/bits/Threads";

const inputClass =
  "w-full bg-page border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors";

const TABS = ["sign_in", "sign_up"] as const;
const TAB_LABELS: Record<string, string> = { sign_in: "Sign in", sign_up: "Sign up" };

function friendlyAuthError(message: string): string {
  if (/only request this after/i.test(message)) {
    return "Too many sign-up attempts in a short time. Wait about a minute, or sign in if you already created an account.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Please confirm your email first, then sign in. Or disable email confirmation in Supabase for local development.";
  }
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    setError(null);
    setIsPending(true);

    const fd = new FormData(e.currentTarget);
    const action = mode === "sign_in" ? signIn : signUp;

    try {
      const result = await action(fd);
      if (result?.error) {
        setError(friendlyAuthError(result.error));
        return;
      }
      if (result?.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-page flex items-center justify-center px-4">
      {/* Threads background */}
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        <Threads
          color={[46, 184, 150]}
          amplitude={0.4}
          distance={0}
          enableMouseInteraction={false}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand block */}
        <div className="flex flex-col items-center gap-3 mb-7">
          <div className="w-[42px] h-[42px] bg-card border border-border rounded-[10px] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M3 14 C3 8, 7 4, 15 4"
                stroke="#2EB896"
                strokeWidth="1.75"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M9 10 C9 6, 12 4, 15 4"
                stroke="#2EB896"
                strokeWidth="1.75"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-text-primary">Freelance Freedom</p>
            <p className="text-xs text-text-muted">Remember each client&apos;s voice</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-[10px] p-6">
          <Link
            href="/"
            className="mb-5 inline-flex text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            ← Freelance Freedom
          </Link>

          {/* Tab row */}
          <div className="flex border-b border-border mb-6">
            {TABS.map((tab) => {
              const active = mode === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setMode(tab); setError(null); }}
                  className={`flex-1 pb-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "text-accent border-b-[1.5px] border-accent -mb-px"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "sign_up" && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                    First name
                  </label>
                  <input
                    name="first_name"
                    type="text"
                    required
                    autoComplete="given-name"
                    disabled={isPending}
                    className={inputClass}
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                    Last name
                  </label>
                  <input
                    name="last_name"
                    type="text"
                    required
                    autoComplete="family-name"
                    disabled={isPending}
                    className={inputClass}
                    placeholder="Smith"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                disabled={isPending}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
                disabled={isPending}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="bg-danger/15 text-danger text-xs border border-border rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-accent text-[#041A12] font-semibold text-sm py-2.5 rounded-md hover:bg-accent-press transition-colors disabled:opacity-60"
            >
              {isPending ? "…" : mode === "sign_in" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
