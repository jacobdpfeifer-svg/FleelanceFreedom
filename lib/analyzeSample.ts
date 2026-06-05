import type { AnalysisResult, SentenceStyle } from "./types";
import { getAnthropic, ANTHROPIC_MODEL } from "./anthropic";

const ANALYSIS_INSTRUCTION = (text: string) => `Analyze this text:
---
${text}
---
Return ONLY this JSON, no other text:
{
  "avg_length": "short|medium|long",
  "uses_emdash": true,
  "opens_with_question": false,
  "oxford_comma": true,
  "exclamation_points": false,
  "first_person": false,
  "vocab_use": ["up to 6 characteristic words or short phrases this writer favors"],
  "vocab_avoid": ["up to 4 words that feel wrong for this voice"]
}`;

/**
 * Sends a copy sample for analysis and returns detected writing patterns.
 * This runs on the server only (uses ANTHROPIC_API_KEY).
 * Throws on API or parse failure — caller should handle gracefully.
 */
export async function analyzeSample(text: string): Promise<AnalysisResult> {
  const anthropic = getAnthropic();

  let parsed: {
    avg_length?: string;
    uses_emdash?: boolean;
    opens_with_question?: boolean;
    oxford_comma?: boolean;
    exclamation_points?: boolean;
    first_person?: boolean;
    vocab_use?: unknown[];
    vocab_avoid?: unknown[];
  } | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const retryNudge =
      attempt === 1 ? "\n\nReturn ONLY valid minified JSON. No prose, no code fences." : "";
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      system: "Extract writing patterns as JSON only. No prose. No markdown. No code fences.",
      messages: [{ role: "user", content: `${ANALYSIS_INSTRUCTION(text.slice(0, 3000))}${retryNudge}` }],
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();

    try {
      parsed = JSON.parse(cleaned);
      break;
    } catch {
      if (attempt === 1) {
        throw new Error("We couldn't read the analysis result. Try again.");
      }
    }
  }

  if (!parsed) throw new Error("We couldn't read the analysis result. Try again.");

  const sentence_style: SentenceStyle = {};
  if (parsed.avg_length === "short" || parsed.avg_length === "medium" || parsed.avg_length === "long") {
    sentence_style.avg_length = parsed.avg_length;
  }
  if (typeof parsed.uses_emdash === "boolean") sentence_style.uses_emdash = parsed.uses_emdash;
  if (typeof parsed.opens_with_question === "boolean") sentence_style.opens_with_question = parsed.opens_with_question;
  if (typeof parsed.oxford_comma === "boolean") sentence_style.oxford_comma = parsed.oxford_comma;
  if (typeof parsed.exclamation_points === "boolean") sentence_style.exclamation_points = parsed.exclamation_points;
  if (typeof parsed.first_person === "boolean") sentence_style.first_person = parsed.first_person;

  const vocab_use = Array.isArray(parsed.vocab_use)
    ? (parsed.vocab_use as unknown[]).filter((v): v is string => typeof v === "string").slice(0, 6)
    : [];

  const vocab_avoid = Array.isArray(parsed.vocab_avoid)
    ? (parsed.vocab_avoid as unknown[]).filter((v): v is string => typeof v === "string").slice(0, 4)
    : [];

  return { sentence_style, vocab_use, vocab_avoid };
}

/**
 * Merge two AnalysisResults — union vocab arrays (deduplicated),
 * prefer explicit boolean values over undefined from whichever result has them.
 */
export function mergeAnalysis(a: AnalysisResult, b: AnalysisResult): AnalysisResult {
  const mergeStyle = (base: SentenceStyle, next: SentenceStyle): SentenceStyle => {
    const out: SentenceStyle = { ...base };
    (Object.keys(next) as (keyof SentenceStyle)[]).forEach((k) => {
      if (next[k] !== undefined) (out as Record<string, unknown>)[k] = next[k];
    });
    return out;
  };

  return {
    sentence_style: mergeStyle(a.sentence_style, b.sentence_style),
    vocab_use: Array.from(new Set([...a.vocab_use, ...b.vocab_use])).slice(0, 10),
    vocab_avoid: Array.from(new Set([...a.vocab_avoid, ...b.vocab_avoid])).slice(0, 8),
  };
}
