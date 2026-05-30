"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "./actions";
import LoginBackground from "./LoginBackground";

const inputClass =
  "w-full bg-warm-ivory border border-warm-taupe rounded-lg px-3 py-2.5 text-sm text-warm-olive placeholder-warm-taupe focus:outline-none focus:border-warm-olive transition-colors";

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
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <LoginBackground />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-warm-olive">Freelance Freedom</h1>
        </div>

        <div className="bg-white/85 backdrop-blur-sm border border-warm-taupe rounded-2xl p-6 shadow-sm">
          <div className="flex rounded-lg bg-warm-cream p-1 mb-6">
            {(["sign_in", "sign_up"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  mode === m
                    ? "bg-warm-olive text-warm-ivory"
                    : "text-warm-olive/60 hover:text-warm-olive"
                }`}
              >
                {m === "sign_in" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "sign_up" && (
              <>
                <div>
                  <label className="block text-xs text-warm-olive/70 mb-1.5">
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
                  <label className="block text-xs text-warm-olive/70 mb-1.5">
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
              <label className="block text-xs text-warm-olive/70 mb-1.5">Email</label>
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
              <label className="block text-xs text-warm-olive/70 mb-1.5">Password</label>
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
              <p className="text-red-800 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-warm-olive hover:bg-brand-dark disabled:opacity-50 text-warm-ivory font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {isPending ? "…" : mode === "sign_in" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
