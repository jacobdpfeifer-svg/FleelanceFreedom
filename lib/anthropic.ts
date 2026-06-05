import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "./types";

export const ANTHROPIC_MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Copy generation isn't configured. Contact support.");
    }
    client = new Anthropic({ apiKey, timeout: 60000 });
  }
  return client;
}

/**
 * Streams an Anthropic completion as Server-Sent Events.
 * Each text chunk is emitted as `data: {"text": "..."}\n\n`, and the stream ends
 * with `data: [DONE]\n\n`. The full assembled text is passed to `onComplete`
 * so the caller can persist the assistant message and any new learnings.
 */
export function streamAnthropicSSE(args: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  onComplete?: (fullText: string) => Promise<void> | void;
  onError?: () => Promise<void> | void;
}): ReadableStream<Uint8Array> {
  const { system, messages, maxTokens = 2048, onComplete, onError } = args;
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const anthropic = getAnthropic();
        const stream = anthropic.messages.stream({
          model: ANTHROPIC_MODEL,
          max_tokens: maxTokens,
          system,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            full += event.delta.text;
            send({ text: event.delta.text });
          }
        }

        if (onComplete) {
          await onComplete(full);
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (onError) { try { await onError(); } catch {} }
        send({ error: message });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });
}
