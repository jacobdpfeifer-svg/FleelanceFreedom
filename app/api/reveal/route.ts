import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { buildClientContext } from "@/lib/buildClientContext";
import { consumeMessage, refundMessage } from "@/lib/messageQuota";

type FreelancerType =
  | "copywriter"
  | "social"
  | "content"
  | "ux"
  | "pr"
  | "general";

const SEED_PROMPTS: Record<FreelancerType, string> = {
  copywriter:
    "Write one email subject line in this client's voice. Under 12 words. No explanation. Output only the subject line.",
  social:
    "Write one social media caption in this client's voice. Under 30 words. No hashtags. No explanation. Output only the caption.",
  content:
    "Write the opening sentence of a newsletter in this client's voice. Under 25 words. No explanation. Output only the sentence.",
  ux: "Write one empty-state message for this client's product in their voice. Under 12 words. No explanation. Output only the message.",
  pr: "Write one press release headline in this client's voice. Under 15 words. No explanation. Output only the headline.",
  general:
    "Write one tagline that captures this client's brand voice. Under 12 words. No explanation. Output only the tagline.",
};

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let clientId: string;
  try {
    const body = (await req.json()) as { clientId?: string };
    clientId = body.clientId ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, industry, freelancer_type")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { data: memory, error: memoryError } = await supabase
    .from("client_memory")
    .select("*")
    .eq("client_id", clientId)
    .single();

  if (memoryError || !memory || !memory.brand_voice) {
    return NextResponse.json({ output: null }, { status: 200 });
  }

  const freelancerType = (client.freelancer_type ||
    "general") as FreelancerType;
  const seedPrompt = SEED_PROMPTS[freelancerType] ?? SEED_PROMPTS.general;
  const contextString = buildClientContext({
    name: client.name,
    industry: client.industry,
    ...memory,
  });

  const serviceClient = createServiceClient();
  const quota = await consumeMessage(serviceClient, user.id);
  if (!quota) return NextResponse.json({ output: null, error: "User not found" }, { status: 404 });
  if (!quota.allowed)
    return NextResponse.json(
      { output: null, error: "Monthly limit reached. Upgrade to Pro." },
      { status: 429 }
    );

  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 80,
      system: `You write copy for ${client.name}. Follow every rule below exactly. Do not explain, do not add context — output only what is asked.\n\n${contextString}`,
      messages: [{ role: "user", content: seedPrompt }],
    });

    const output = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim()
      .replace(/^["']|["']$/g, "");

    return NextResponse.json({ output, freelancerType });
  } catch (err: unknown) {
    await refundMessage(serviceClient, user.id);
    console.error("Reveal generation error:", err);
    return NextResponse.json(
      { output: null, error: "Generation failed. Try regenerating." },
      { status: 500 }
    );
  }
}
