import { redirect } from "next/navigation";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { loadLatestChatSession } from "@/lib/chatSession";
import { applyMonthlyResetIfNeeded } from "@/lib/messageQuota";
import ChatUI from "./ChatUI";
import type { ChatMessage, Decision, Plan, TaskType } from "@/lib/types";

interface Props {
  params: { id: string };
  searchParams: { task?: string };
}

export default async function ChatPage({ params, searchParams }: Props) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name, industry")
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !client) redirect("/dashboard");

  const { data: memory } = await supabase
    .from("client_memory")
    .select("brand_voice, tone_rules, vocab_avoid, decisions")
    .eq("client_id", params.id)
    .single();

  const latestSession = await loadLatestChatSession(supabase, params.id);

  const { data: userRow } = await supabase
    .from("users")
    .select("plan, message_count, messages_reset_at")
    .eq("id", session.user.id)
    .single();

  let userPlan: Plan = (userRow?.plan as Plan) ?? "free";
  let messageCount = userRow?.message_count ?? 0;

  if (userRow) {
    const serviceClient = createServiceClient();
    const refreshed = await applyMonthlyResetIfNeeded(
      serviceClient,
      session.user.id,
      {
        plan: userPlan,
        message_count: userRow.message_count,
        messages_reset_at: userRow.messages_reset_at,
      }
    );
    messageCount = refreshed.message_count;
    userPlan = refreshed.plan;
  }

  const taskFromUrl = searchParams.task as TaskType | undefined;
  const initialTaskType =
    taskFromUrl ?? latestSession?.task_type ?? ("general" as TaskType);
  const initialMessages: ChatMessage[] = latestSession?.messages ?? [];

  const toneRules = Array.isArray(memory?.tone_rules) ? memory.tone_rules : [];
  const vocabAvoid = Array.isArray(memory?.vocab_avoid) ? memory.vocab_avoid : [];
  const decisions = (memory?.decisions ?? []) as Decision[];

  return (
    <ChatUI
      clientId={client.id}
      clientName={client.name}
      clientIndustry={client.industry ?? ""}
      brandVoice={memory?.brand_voice ?? null}
      toneRulesCount={toneRules.length}
      vocabAvoidCount={vocabAvoid.length}
      initialTaskType={initialTaskType}
      initialMessages={initialMessages}
      initialDecisions={decisions}
      userPlan={userPlan}
      initialMessageCount={messageCount}
    />
  );
}
