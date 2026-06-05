"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Decision } from "@/lib/types";

export async function saveDecision(clientId: string, note: string): Promise<{ error?: string }> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: owned } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();
  if (!owned) return { error: "Client not found" };

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

    if (error) {
      console.error("save error:", error.message);
      return { error: "Couldn't save changes. Please try again." };
    }
  } else {
    // Memory row doesn't exist yet — create it
    const { error } = await supabase.from("client_memory").insert({
      client_id: clientId,
      decisions: [newDecision],
    });

    if (error) {
      console.error("save error:", error.message);
      return { error: "Couldn't save changes. Please try again." };
    }
  }

  return {};
}
