import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ensures a row exists in public.users for the signed-in auth user.
 * Required before inserting clients (FK).
 */
export async function ensureAppUser(
  supabase: SupabaseClient,
  authUser: Pick<User, "id" | "email">
): Promise<{ error?: string }> {
  const email = authUser.email?.trim();
  if (!email) {
    return { error: "Your account is missing an email address." };
  }

  const row = { id: authUser.id, email };

  // Fast path when the profile row is readable.
  const { data: existing, error: selectError } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existing) return {};

  if (selectError) {
    console.warn("ensureAppUser select skipped:", selectError.message);
    if (/relation "public\.users" does not exist/i.test(selectError.message)) {
      return {
        error:
          "Database not set up yet. Run migration 001_init.sql in the Supabase SQL editor.",
      };
    }
  }

  // 1) Service role upsert — bypasses RLS; works even when JWT is not on DB yet.
  try {
    const admin = createAdminClient();
    const { error: adminError } = await admin
      .from("users")
      .upsert(row, { onConflict: "id" });

    if (!adminError) return {};
    console.error("ensureAppUser admin upsert error:", adminError.message);
  } catch (err) {
    console.error("ensureAppUser admin client error:", err);
  }

  // 2) Security-definer RPC (migration 005).
  const { error: rpcError } = await supabase.rpc("ensure_user_profile", {
    user_email: email,
  });
  if (!rpcError) return {};
  if (rpcError.code !== "42883" && !/ensure_user_profile/i.test(rpcError.message)) {
    console.error("ensureAppUser rpc error:", rpcError.message);
  }

  // 3) Direct insert under the user's session (migration 004 policy).
  const { error: insertError } = await supabase.from("users").insert(row);
  if (!insertError) return {};
  if (insertError.code === "23505") return {};

  console.error("ensureAppUser insert error:", insertError.message);

  return {
    error:
      "Could not set up your account. In Supabase SQL editor, run migrations 001 and 005, then restart the dev server.",
  };
}
