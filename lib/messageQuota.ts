import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "./types";
import { FREE_MESSAGE_LIMIT } from "./quotaConstants";

export { FREE_MESSAGE_LIMIT };

export interface QuotaState {
  allowed: boolean;
  plan: Plan;
  message_count: number;
  messages_reset_at: string;
}

/** Atomic: applies monthly reset, enforces free cap, increments. Service client only. */
export async function consumeMessage(
  serviceClient: SupabaseClient,
  userId: string
): Promise<QuotaState | null> {
  const { data, error } = await serviceClient
    .rpc("consume_message", { p_user_id: userId })
    .single();
  if (error || !data) return null;
  const row = data as {
    allowed: boolean; plan: Plan; message_count: number; messages_reset_at: string;
  };
  return {
    allowed: row.allowed,
    plan: row.plan ?? "free",
    message_count: row.message_count ?? 0,
    messages_reset_at: row.messages_reset_at,
  };
}

/** Undo a consume when the downstream call failed. */
export async function refundMessage(
  serviceClient: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await serviceClient.rpc("refund_message", { p_user_id: userId });
  if (error) console.error("refund_message error:", error.message);
}

/** Pure, read-only quota view for display (no DB write). */
export function effectiveQuota(user: {
  plan: Plan; message_count: number; messages_reset_at: string;
}): { plan: Plan; message_count: number; messages_reset_at: string } {
  const now = new Date();
  let reset = new Date(user.messages_reset_at);
  let count = user.message_count;
  if (now >= reset) {
    while (reset <= now) reset = new Date(reset.setMonth(reset.getMonth() + 1));
    count = 0;
  }
  return { plan: user.plan, message_count: count, messages_reset_at: reset.toISOString() };
}
