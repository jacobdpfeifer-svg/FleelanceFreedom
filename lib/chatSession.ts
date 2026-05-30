import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage, TaskType } from "./types";

export async function upsertChatSession(
  serviceClient: SupabaseClient,
  clientId: string,
  messages: ChatMessage[],
  taskType: TaskType
): Promise<{ error?: string }> {
  const { data: existing, error: fetchError } = await serviceClient
    .from("chat_sessions")
    .select("id")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };

  if (existing) {
    const { error } = await serviceClient
      .from("chat_sessions")
      .update({ messages, task_type: taskType })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await serviceClient
      .from("chat_sessions")
      .insert({
        client_id: clientId,
        messages,
        task_type: taskType,
      });
    if (error) return { error: error.message };
  }

  return {};
}

export async function loadLatestChatSession(
  supabase: SupabaseClient,
  clientId: string
): Promise<{ messages: ChatMessage[]; task_type: TaskType } | null> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("messages, task_type")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const messages = Array.isArray(data.messages)
    ? (data.messages as ChatMessage[])
    : [];

  return {
    messages,
    task_type: (data.task_type as TaskType) ?? "general",
  };
}
