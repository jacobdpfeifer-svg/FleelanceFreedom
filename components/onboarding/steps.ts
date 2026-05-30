import type { OnboardingStep, StepId } from "./helpers";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "voice",
    stepLabel: "VOICE CALIBRATION",
    stepNum: 1,
    question: (name) =>
      `Describe ${name}'s brand in 3 words — then name a brand they admire and say why in one sentence.`,
    hint: "'Direct, data-led, no-BS. They love Stripe's docs — clear, respects the reader.'",
    capability: "Voice layer: ready",
  },
  {
    id: "audience",
    stepLabel: "AUDIENCE FILTER",
    stepNum: 2,
    question: () =>
      "Who reads their content? Give me a job title and the one thing that stresses them out at work.",
    hint: "'CFOs at mid-market SaaS. They're scared of being sold to instead of helped.'",
    capability: "Audience filter: set",
  },
  {
    id: "vocab",
    stepLabel: "VOCABULARY RULES",
    stepNum: 3,
    question: () => "Words they love — and words that make them cringe. Up to 5 of each.",
    hint: "'Love: reduce, streamline, measure. Hate: leverage, synergy, unlock, circle back.'",
    capability: "Vocabulary rules: locked in",
  },
  {
    id: "sample",
    stepLabel: "VOICE SAMPLE",
    stepNum: 4,
    question: () =>
      "Paste their best piece of copy — anything they've written or approved. Any format.",
    hint: "An email, a social post, a landing page section — whatever best shows their voice.",
    capability: "Sentence fingerprint: active",
  },
  {
    id: "rejection",
    stepLabel: "ANTI-PATTERN SHIELD",
    stepNum: 5,
    question: () =>
      "Has a writer or generic draft produced something this client rejected? Describe it and say why in one sentence.",
    hint: "'An email that opened with \"In today's fast-paced world\" — they said it sounded like every other company.'",
    capability: "Anti-pattern shield: loaded",
  },
  {
    id: "decision",
    stepLabel: "STANDING RULES",
    stepNum: 6,
    question: () =>
      "One content rule you've already decided — something you never want to re-explain.",
    hint: "'Always lead with a stat. Never use exclamation points. Keep emails under 150 words.'",
    capability: "Standing rules: saved",
  },
];

export const TOTAL_STEPS = ONBOARDING_STEPS.length;
