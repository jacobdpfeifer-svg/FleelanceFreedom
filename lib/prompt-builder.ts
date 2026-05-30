import type { Client, ClientMemory, TaskType } from "./types";

export const TASK_DIRECTIVES: Record<TaskType, string> = {
  general: "Help the freelancer with whatever copy or messaging task they bring.",
  social_post:
    "Write short, scroll-stopping social posts. Lead with a hook. Respect platform brevity.",
  email:
    "Write email copy with a clear subject line, a compelling open, one core idea, and a single call to action.",
  blog:
    "Write long-form blog/article copy with a strong headline, scannable structure, and a natural narrative.",
  ad_copy:
    "Write conversion-focused ad copy. Be punchy, benefit-led, and end with a strong call to action.",
  landing_page:
    "Write landing-page copy: headline, subhead, benefit bullets, social proof framing, and CTA.",
};

export function getTaskDirective(taskType: TaskType): string {
  return TASK_DIRECTIVES[taskType] ?? TASK_DIRECTIVES.general;
}

function bulletList(items: string[]): string {
  return items
    .map((i) => i.trim())
    .filter(Boolean)
    .map((i) => `- ${i}`)
    .join("\n");
}

/**
 * Builds writing instructions from a client's persistent memory. This is the
 * core product mechanic: every generation is grounded in brand voice, tone rules,
 * prior decisions, approved samples, and anti-rules so the freelancer never
 * re-explains context.
 */
export function buildSystemPrompt(args: {
  client: Pick<Client, "name" | "industry">;
  memory: Partial<ClientMemory> | null;
  taskType: TaskType;
}): string {
  const { client, memory, taskType } = args;
  const sections: string[] = [];

  sections.push(
    `You are an expert copywriter and brand voice specialist working on behalf of the client "${client.name}"${
      client.industry ? ` in the ${client.industry} industry` : ""
    }. Produce copy that sounds exactly like this client, as if their in-house team wrote it.`
  );

  sections.push(`# Task\n${getTaskDirective(taskType)}`);

  if (memory?.brand_voice && memory.brand_voice.trim()) {
    sections.push(`# Brand Voice\n${memory.brand_voice.trim()}`);
  }

  if (memory?.audience_profile && memory.audience_profile.trim()) {
    sections.push(`# Target Audience\n${memory.audience_profile.trim()}`);
  }

  const toneRules = memory?.tone_rules ?? [];
  if (toneRules.length > 0) {
    sections.push(`# Tone & Style Rules (follow strictly)\n${bulletList(toneRules)}`);
  }

  const decisions = memory?.decisions ?? [];
  if (decisions.length > 0) {
    const decisionBullets = decisions
      .map((d) => {
        const topic = (d.topic ?? "").trim();
        const detail = (d.detail ?? "").trim();
        if (topic && detail) return `${topic}: ${detail}`;
        return detail || topic;
      })
      .filter(Boolean);
    sections.push(
      `# Standing Decisions (already settled — never ask about these again)\n${bulletList(
        decisionBullets
      )}`
    );
  }

  if (memory?.sample_copy && memory.sample_copy.trim()) {
    sections.push(
      `# Approved Sample Copy (match this voice, rhythm, and vocabulary verbatim as a reference)\n"""\n${memory.sample_copy.trim()}\n"""`
    );
  }

  if (memory?.negative_examples && memory.negative_examples.trim()) {
    sections.push(
      `# Anti-Rules / Rejected Work (NEVER write like this)\n"""\n${memory.negative_examples.trim()}\n"""`
    );
  }

  sections.push(
    `# Output Rules\n- Stay 100% on-brand with everything above; the rules and anti-rules override generic best practices.\n- Do not invent facts about the client. If you lack a needed detail, ask one concise question.\n- Return only the requested copy unless the user asks for explanation.`
  );

  return sections.join("\n\n");
}
