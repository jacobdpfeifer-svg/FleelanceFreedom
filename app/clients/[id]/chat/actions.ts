"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Decision } from "@/lib/types";

export async function saveDecision(clientId: string, note: string): Promise<{ error?: string }> {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { error: "Not authenticated" };

  const newDecision: Decision = {
    topic: "Session learning",
    detail: note.trim(),
    recorded_at: new Date().toISOString(),
  };

  // Fetch existing decisions
  const { data: existing } = await supabase
    .from("client_memory")
    .select("id, decisions")
    .eq("client_id", clientId)
    .single();

  if (existing) {
    const decisions: Decision[] = Array.isArray(existing.decisions)
      ? existing.decisions
      : [];
    decisions.push(newDecision);

    const { error } = await supabase
      .from("client_memory")
      .update({ decisions, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    // Memory row doesn't exist yet — create it
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .single();

    if (!client) return { error: "Client not found" };

    const { error } = await supabase.from("client_memory").insert({
      client_id: clientId,
      decisions: [newDecision],
    });

    if (error) return { error: error.message };
  }

  return {};
}
