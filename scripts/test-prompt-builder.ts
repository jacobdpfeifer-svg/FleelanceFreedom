import assert from "node:assert";
import { buildSystemPrompt } from "../lib/prompt-builder";
import type { ClientMemory } from "../lib/types";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const fullMemory: Partial<ClientMemory> = {
  brand_voice: "Warm, witty, and unapologetically direct.",
  audience_profile: "Busy solo founders aged 28-40 who hate fluff.",
  tone_rules: ["Never use the word 'synergy'", "Use second person", "No exclamation points"],
  decisions: [
    {
      topic: "CTA style",
      detail: "Always end with a single question, never an imperative.",
      recorded_at: "2026-01-01T00:00:00Z",
    },
  ],
  sample_copy: "You already know what to do. We just make it faster.",
  negative_examples: "Unlock unprecedented synergies to 10x your growth journey!",
};

console.log("buildSystemPrompt tests");

check("includes client name and industry", () => {
  const out = buildSystemPrompt({
    client: { name: "Acme Co", industry: "fintech" },
    memory: fullMemory,
    taskType: "general",
  });
  assert.match(out, /Acme Co/);
  assert.match(out, /fintech/);
});

check("includes brand voice, audience, tone rules, decisions, samples, anti-rules", () => {
  const out = buildSystemPrompt({
    client: { name: "Acme Co", industry: "fintech" },
    memory: fullMemory,
    taskType: "social_post",
  });
  assert.match(out, /Warm, witty/);
  assert.match(out, /Busy solo founders/);
  assert.match(out, /- Never use the word 'synergy'/);
  assert.match(out, /CTA style: Always end with a single question/);
  assert.match(out, /You already know what to do/);
  assert.match(out, /Unlock unprecedented synergies/);
});

check("applies task-specific directive", () => {
  const out = buildSystemPrompt({
    client: { name: "Acme Co", industry: null },
    memory: fullMemory,
    taskType: "email",
  });
  assert.match(out, /subject line/i);
});

check("omits empty sections gracefully", () => {
  const out = buildSystemPrompt({
    client: { name: "Bare Client", industry: null },
    memory: null,
    taskType: "general",
  });
  assert.doesNotMatch(out, /# Brand Voice/);
  assert.doesNotMatch(out, /# Tone & Style Rules/);
  assert.match(out, /# Output Rules/);
  assert.match(out, /Bare Client/);
});

check("filters blank tone rules", () => {
  const out = buildSystemPrompt({
    client: { name: "X", industry: null },
    memory: { tone_rules: ["", "  ", "Be concise"] },
    taskType: "general",
  });
  assert.match(out, /- Be concise/);
  assert.doesNotMatch(out, /- {2}\n/);
});

console.log(`\n${passed} checks passed.`);
