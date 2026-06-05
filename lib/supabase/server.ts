import { createServerClient as _createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server-side Supabase client for RSC, Server Actions, and Route Handlers.
 * Always uses the user's session cookie so RLS applies.
 */
export function createServerClient() {
  const cookieStore = cookies();

  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — ignore, middleware will handle it
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above
          }
        },
      },
    }
  );
}

/** Alias used by route handlers and pages. */
export const createClient = createServerClient;

/**
 * Service-role client that bypasses RLS. Only use in trusted server contexts
 * (webhooks, admin tasks). Never expose to the client.
 */
export function createServiceClient() {
  return createAdminClient();
}
