import assert from "node:assert";
import { buildClientContext } from "../lib/buildClientContext";
import type { MemoryContext } from "../lib/types";

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

const fullMemory: MemoryContext = {
  name: "Acme Co",
  industry: "fintech",
  brand_voice: "Warm, witty, and unapologetically direct.",
  audience_profile: "Busy solo founders aged 28-40 who hate fluff.",
  vocab_use: ["fast", "clear"],
  vocab_avoid: ["synergy"],
  decisions: [
    {
      topic: "CTA style",
      detail: "Always end with a single question, never an imperative.",
      recorded_at: "2026-01-01T00:00:00Z",
    },
  ],
  samples: [
    { type: "email", text: "You already know what to do. We just make it faster." },
  ],
  rejections: [
    {
      sample: "Unlock unprecedented synergies to 10x your growth journey!",
      reason: "Too corporate and buzzword-heavy",
    },
  ],
};

console.log("buildClientContext tests");

check("includes client name and industry", () => {
  const out = buildClientContext(fullMemory);
  assert.match(out, /CLIENT:Acme Co\|fintech/);
});

check("includes voice, vocab, audience, decisions, samples, rejections", () => {
  const out = buildClientContext(fullMemory);
  assert.match(out, /VOICE:Warm, witty/);
  assert.match(out, /USE:fast·clear/);
  assert.match(out, /NEVER:synergy/);
  assert.match(out, /AUDIENCE:Busy solo founders/);
  assert.match(out, /Always end with a single question/);
  assert.match(out, /SAMPLE1\[email\]:You already know what to do/);
  assert.match(out, /AVOID:Too corporate and buzzword-heavy/);
});

check("omits empty sections gracefully", () => {
  const out = buildClientContext({ name: "Bare Client", industry: null });
  assert.match(out, /CLIENT:Bare Client/);
  assert.doesNotMatch(out, /VOICE:/);
  assert.doesNotMatch(out, /USE:/);
});

console.log(`\n${passed} checks passed.`);
