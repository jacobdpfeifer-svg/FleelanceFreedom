import type { MemoryPayload } from "@/app/clients/actions";
import type { SentenceStyle } from "@/lib/types";

export interface Extraction {
  label: string;
  value: string;
}

export interface ProfileState {
  voice: string;
  audienceProfile: string;
  vocabUse: string[];
  vocabAvoid: string[];
  sampleCopy: string;
  negativeExamples: string;
  decisions: string[];
  sentenceStyle: SentenceStyle;
}

export const EMPTY_PROFILE: ProfileState = {
  voice: "",
  audienceProfile: "",
  vocabUse: [],
  vocabAvoid: [],
  sampleCopy: "",
  negativeExamples: "",
  decisions: [],
  sentenceStyle: {},
};

export type StepId =
  | "voice"
  | "audience"
  | "vocab"
  | "sample"
  | "rejection"
  | "decision";

export interface OnboardingStep {
  id: StepId;
  stepLabel: string;
  stepNum: number;
  question: (name: string) => string;
  hint: string;
  capability: string;
}

const VOCAB_LOVE = /(?:love|use|always)[:\s]+([^.!?\n]+)/i;
const VOCAB_HATE = /(?:hate|never|avoid|cringe)[:\s]+([^.!?\n]+)/i;

function splitWordList(raw: string): string[] {
  return raw
    .split(/[,·]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function parseVocabLists(answer: string): {
  use: string[];
  avoid: string[];
} {
  const loveMatch = answer.match(VOCAB_LOVE);
  const hateMatch = answer.match(VOCAB_HATE);
  return {
    use: loveMatch ? splitWordList(loveMatch[1]) : [],
    avoid: hateMatch ? splitWordList(hateMatch[1]) : [],
  };
}

export function parseSentenceStyle(text: string): SentenceStyle {
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const avgWords = sentences.length
    ? sentences.reduce((a, s) => a + s.trim().split(/\s+/).length, 0) /
      sentences.length
    : 10;

  return {
    avg_length: avgWords < 8 ? "short" : avgWords < 15 ? "medium" : "long",
    exclamation_points: text.includes("!"),
    opens_with_question: sentences[0]?.includes("?") ?? false,
    first_person: /\b(i|we|our|my)\b/i.test(text),
    uses_emdash: text.includes("—") || text.includes("--"),
  };
}

export function parseExtractions(stepId: StepId, answer: string): Extraction[] {
  switch (stepId) {
    case "voice": {
      const words = answer
        .split(/[,.\s]+/)
        .filter((w) => w.length > 3)
        .slice(0, 3);
      const brandRef = answer.match(
        /(?:love|like|admire|similar to)\s+([A-Z][a-z]+)/i
      );
      return [
        { label: "tone rule written", value: words.join(", ") || "recorded" },
        brandRef
          ? { label: "brand reference logged", value: brandRef[1] }
          : { label: "voice direction", value: "captured" },
      ];
    }
    case "audience": {
      const jobMatch = answer.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*s?\b)/);
      return [
        { label: "reader profile", value: jobMatch ? jobMatch[1] : "defined" },
        { label: "pain point", value: "mapped" },
      ];
    }
    case "vocab": {
      const { use, avoid } = parseVocabLists(answer);
      const extractions: Extraction[] = [];
      if (use.length)
        extractions.push({ label: "words to use", value: use.join(", ").slice(0, 35) });
      if (avoid.length)
        extractions.push({ label: "words banned", value: avoid.join(", ").slice(0, 35) });
      if (!extractions.length)
        extractions.push({ label: "vocabulary rules", value: "extracted" });
      return extractions;
    }
    case "sample": {
      const style = parseSentenceStyle(answer);
      const lengthLabel =
        style.avg_length === "short"
          ? "short & punchy"
          : style.avg_length === "medium"
            ? "measured"
            : "long-form";
      return [
        { label: "sentence length", value: lengthLabel },
        {
          label: "exclamation points",
          value: style.exclamation_points ? "uses them" : "avoids them",
        },
        {
          label: "writing pattern",
          value: style.first_person ? "first-person" : "third-person",
        },
      ];
    }
    case "rejection":
      return [
        { label: "rejection pattern", value: "logged" },
        { label: "anti-pattern rule", value: "written" },
      ];
    case "decision":
      return [
        {
          label: "standing rule",
          value: answer.slice(0, 45) + (answer.length > 45 ? "…" : ""),
        },
      ];
    default:
      return [{ label: "captured", value: "saved to profile" }];
  }
}

export function applyAnswer(
  prev: ProfileState,
  stepId: StepId,
  answer: string
): ProfileState {
  const next = { ...prev };

  switch (stepId) {
    case "voice":
      next.voice = answer;
      break;
    case "audience":
      next.audienceProfile = answer;
      break;
    case "vocab": {
      const { use, avoid } = parseVocabLists(answer);
      next.vocabUse = use;
      next.vocabAvoid = avoid;
      break;
    }
    case "sample":
      next.sampleCopy = answer;
      next.sentenceStyle = parseSentenceStyle(answer);
      break;
    case "rejection":
      next.negativeExamples = answer;
      break;
    case "decision":
      next.decisions = [answer];
      break;
  }

  return next;
}

export function profileToMemoryPayload(profile: ProfileState): MemoryPayload {
  const standingRule = profile.decisions[0];

  return {
    brand_voice: profile.voice || null,
    audience_profile: profile.audienceProfile || null,
    vocab_use: profile.vocabUse,
    vocab_avoid: profile.vocabAvoid,
    samples: profile.sampleCopy
      ? [{ type: "email", text: profile.sampleCopy }]
      : [],
    rejections: profile.negativeExamples
      ? [{ sample: profile.negativeExamples, reason: profile.negativeExamples }]
      : [],
    decisions: standingRule
      ? [
          {
            topic: "Onboarding",
            detail: standingRule,
            recorded_at: new Date().toISOString(),
          },
        ]
      : [],
    tone_rules: [
      ...profile.vocabAvoid.map((v) => `never say "${v}"`),
      ...(standingRule ? [standingRule] : []),
    ],
    sentence_style: profile.sentenceStyle,
  };
}
