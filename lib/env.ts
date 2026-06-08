/**
 * Validates required server-side environment variables at startup.
 * Call this from instrumentation.ts or the root layout server component.
 * Throws clearly if anything is missing so misconfiguration is caught immediately.
 */
const REQUIRED_SERVER_VARS = [
  "ANTHROPIC_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

export function validateEnv() {
  const missing = REQUIRED_SERVER_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n\nCheck your .env.local and Vercel environment settings.`
    );
  }
}
