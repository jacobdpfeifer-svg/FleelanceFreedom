import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { analyzeSample } from "@/lib/analyzeSample";
import { consumeMessage, refundMessage } from "@/lib/messageQuota";
import { MIN_SAMPLE_CHARS } from "@/lib/sampleConstants";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let text: string;
  try {
    const body = (await req.json()) as { text?: string };
    text = (body.text ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!text || text.length < MIN_SAMPLE_CHARS) {
    return NextResponse.json(
      { error: `Paste at least ${MIN_SAMPLE_CHARS} characters of copy to analyze.` },
      { status: 422 }
    );
  }

  const serviceClient = createServiceClient();
  const quota = await consumeMessage(serviceClient, user.id);
  if (!quota) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!quota.allowed)
    return NextResponse.json(
      { error: "Monthly limit reached. Upgrade to Pro for unlimited messages." },
      { status: 429 }
    );

  try {
    const result = await analyzeSample(text);
    return NextResponse.json(result);
  } catch (err) {
    await refundMessage(serviceClient, user.id);
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("analyze-sample error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
