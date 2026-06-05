import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { buildClientContext } from "@/lib/buildClientContext";
import { getTaskDirective } from "@/lib/prompt-builder";
import { streamAnthropicSSE } from "@/lib/anthropic";
import { upsertChatSession } from "@/lib/chatSession";
import { consumeMessage, refundMessage } from "@/lib/messageQuota";
import type { ChatMessage, TaskType } from "@/lib/types";

interface GenerateBody {
  clientId: string;
  message: string;
  taskType: TaskType;
  history: ChatMessage[];
}

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { clientId, message, taskType, history } = body;
  if (!clientId || !message) {
    return NextResponse.json({ error: "clientId and message required" }, { status: 400 });
  }

  if (message.length > 10000)
    return NextResponse.json({ error: "Message too long." }, { status: 422 });
  const safeHistory = Array.isArray(history) ? history.slice(-20) : [];

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, industry")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const serviceClient = createServiceClient();
  const quota = await consumeMessage(serviceClient, user.id);
  if (!quota) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!quota.allowed)
    return NextResponse.json(
      { error: "Monthly limit reached. Upgrade to Pro for unlimited messages." },
      { status: 429 }
    );

  const { data: memory } = await supabase
    .from("client_memory")
    .select("*")
    .eq("client_id", clientId)
    .single();

  const contextString = buildClientContext({
    name: client.name,
    industry: client.industry,
    ...(memory ?? {}),
  });
  const resolvedTask = taskType ?? "general";
  const writingInstructions = `You replicate ${client.name}'s writing with precision.
Study every pattern below. Match it exactly in your output.
Do not interpret — reproduce the exact vocabulary, sentence length,
punctuation habits, and structure shown.

${contextString}

# Task
${getTaskDirective(resolvedTask)}

Write as if you are ${client.name}. One wrong word breaks the illusion.`;

  const messages: ChatMessage[] = [
    ...safeHistory,
    { role: "user", content: message },
  ];

  const onComplete = async (fullText: string) => {
    const trimmed = fullText.trim();
    if (!trimmed) {
      throw new Error("No copy came back. Please try again.");
    }

    const allMessages: ChatMessage[] = [
      ...messages,
      { role: "assistant", content: trimmed },
    ];

    const saveResult = await upsertChatSession(
      serviceClient,
      clientId,
      allMessages,
      taskType ?? "general"
    );

    if (saveResult.error) {
      throw new Error(`Failed to save chat: ${saveResult.error}`);
    }

  };

  const stream = streamAnthropicSSE({
    system: writingInstructions,
    messages,
    maxTokens: 1024,
    onComplete,
    onError: async () => { await refundMessage(serviceClient, user.id); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
