import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "./types";
import { FREE_MESSAGE_LIMIT } from "./quotaConstants";

export { FREE_MESSAGE_LIMIT };

export interface QuotaUser {
  plan: Plan;
  message_count: number;
  messages_reset_at: string;
}

function computeNextReset(resetAt: Date, now: Date): Date {
  const nextReset = new Date(resetAt);
  while (nextReset <= now) {
    nextReset.setMonth(nextReset.getMonth() + 1);
  }
  return nextReset;
}

/** Reset message_count when the monthly window has elapsed. */
export async function applyMonthlyResetIfNeeded(
  serviceClient: SupabaseClient,
  userId: string,
  user: QuotaUser
): Promise<QuotaUser> {
  const now = new Date();
  const resetAt = new Date(user.messages_reset_at);

  if (now >= resetAt) {
    const nextReset = computeNextReset(resetAt, now);
    await serviceClient
      .from("users")
      .update({
        message_count: 0,
        messages_reset_at: nextReset.toISOString(),
      })
      .eq("id", userId);
    return {
      ...user,
      message_count: 0,
      messages_reset_at: nextReset.toISOString(),
    };
  }

  return user;
}

export function isFreeLimitReached(user: QuotaUser): boolean {
  return user.plan === "free" && user.message_count >= FREE_MESSAGE_LIMIT;
}

export function quotaLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: "Monthly limit reached. Upgrade to Pro for unlimited messages." },
    { status: 429 }
  );
}

/**
 * Load user quota, apply monthly reset if due, and block free users at the cap.
 * Used by /api/generate and /api/analyze-sample before any Anthropic call.
 */
export async function checkAndApplyQuota(
  supabase: SupabaseClient,
  serviceClient: SupabaseClient,
  userId: string
): Promise<{ user: QuotaUser } | { response: NextResponse }> {
  const { data: user, error } = await supabase
    .from("users")
    .select("plan, message_count, messages_reset_at")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return {
      response: NextResponse.json({ error: "User not found" }, { status: 404 }),
    };
  }

  const quotaUser = await applyMonthlyResetIfNeeded(
    serviceClient,
    userId,
    user as QuotaUser
  );

  if (isFreeLimitReached(quotaUser)) {
    return { response: quotaLimitResponse() };
  }

  return { user: quotaUser };
}

/** Increment usage after a successful generation or analysis. */
export async function incrementMessageCount(
  serviceClient: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await serviceClient.rpc("increment_message_count", {
    user_id: userId,
  });
  if (error) {
    console.error("increment_message_count error:", error.message);
  }
}
