"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import type { Decision, Sample, Rejection, SentenceStyle, Structure } from "@/lib/types";

export async function saveClientMeta(clientId: string, formData: FormData) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Not authenticated" };

  const name = (formData.get("name") as string)?.trim();
  const industry = (formData.get("industry") as string)?.trim() ?? null;

  if (!name) return { error: "Name is required" };

  const { error } = await supabase
    .from("clients")
    .update({ name, industry: industry || null })
    .eq("id", clientId);

  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

export interface MemoryPayload {
  brand_voice?: string | null;
  audience_profile?: string | null;
  tone_rules?: string[];
  decisions?: Decision[];
  samples?: Sample[];
  vocab_use?: string[];
  vocab_avoid?: string[];
  sentence_style?: SentenceStyle;
  structure?: Structure;
  rejections?: Rejection[];
}

export async function saveMemory(
  clientId: string,
  payload: MemoryPayload
): Promise<{ error?: string }> {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Not authenticated" };

  const memoryData = {
    client_id: clientId,
    brand_voice: payload.brand_voice?.trim() || null,
    audience_profile: payload.audience_profile?.trim() || null,
    tone_rules: payload.tone_rules ?? [],
    decisions: payload.decisions ?? [],
    samples: payload.samples ?? [],
    vocab_use: payload.vocab_use ?? [],
    vocab_avoid: payload.vocab_avoid ?? [],
    sentence_style: payload.sentence_style ?? {},
    structure: payload.structure ?? {},
    rejections: payload.rejections ?? [],
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("client_memory")
    .upsert(memoryData, { onConflict: "client_id" });

  if (error) return { error: error.message };
  revalidatePath(`/clients/${clientId}`);
  return {};
}

export async function deleteClient(
  clientId: string
): Promise<{ error?: string }> {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Not authenticated" };

  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) return { error: error.message };

  redirect("/dashboard");
}
