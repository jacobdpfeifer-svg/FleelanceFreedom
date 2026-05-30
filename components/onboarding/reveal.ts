import type { StepId } from "./helpers";

export type FreelancerType =
  | "copywriter"
  | "social"
  | "content"
  | "ux"
  | "pr"
  | "general";

export type CorrectPhase = "reveal" | "diagnose" | "edit";

export const REVEAL_LABELS: Record<FreelancerType, string> = {
  copywriter: "Email subject line — in their voice",
  social: "Social caption — in their voice",
  content: "Newsletter opener — in their voice",
  ux: "Empty state copy — in their voice",
  pr: "Press release headline — in their voice",
  general: "Brand voice sample",
};

/** User prompt sent to /api/reveal for each freelancer type. */
export const REVEAL_GENERATION_PROMPTS: Record<FreelancerType, string> = {
  copywriter:
    "Write exactly one email subject line in this client's voice. Output only the subject line — no quotes, labels, or explanation.",
  social:
    "Write exactly one social media caption in this client's voice. Output only the caption — no quotes, labels, or explanation.",
  content:
    "Write the opening 2–3 sentences of a newsletter in this client's voice. Output only the copy — no quotes, labels, or explanation.",
  ux: "Write empty-state copy (a headline plus one short supporting line) in this client's voice. Output only the copy — no quotes, labels, or explanation.",
  pr: "Write exactly one press release headline in this client's voice. Output only the headline — no quotes, labels, or explanation.",
  general:
    "Write one short brand voice sample (1–2 sentences) in this client's voice. Output only the copy — no quotes, labels, or explanation.",
};

export const DIAGNOSE_OPTIONS: {
  label: string;
  sub: string;
  stepId: StepId;
}[] = [
  { label: "The tone felt wrong", sub: "Fix voice calibration", stepId: "voice" },
  { label: "It used words they'd never use", sub: "Fix vocabulary rules", stepId: "vocab" },
  { label: "Didn't sound like their writing", sub: "Fix voice sample", stepId: "sample" },
  {
    label: "Too generic — could be any brand",
    sub: "Fix anti-pattern shield",
    stepId: "rejection",
  },
];

export const STEP_META: Record<StepId, { label: string; question: string }> = {
  voice: {
    label: "VOICE CALIBRATION",
    question:
      "Describe their brand in 3 words — then name a brand they admire and say why in one sentence.",
  },
  audience: {
    label: "AUDIENCE FILTER",
    question:
      "Who reads their content? Job title and the one thing that stresses them out at work.",
  },
  vocab: {
    label: "VOCABULARY RULES",
    question: "Words they love — and words that make them cringe. Up to 5 of each.",
  },
  sample: {
    label: "VOICE SAMPLE",
    question: "Paste their best piece of copy — anything they've written or approved.",
  },
  rejection: {
    label: "ANTI-PATTERN SHIELD",
    question:
      "Something a writer produced that they rejected — and why in one sentence.",
  },
  decision: {
    label: "STANDING RULES",
    question:
      "One content rule you've already decided — something you never want to re-explain.",
  },
};
