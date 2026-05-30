import type { MemoryContext } from "./types";

/**
 * Compact serializer for client voice context. Strict output order, no JSON, no long
 * labels. Every section fits on one line. Hard cap ~2,400 characters.
 * Samples are appended last so they carry the highest contextual weight.
 */
export function buildClientContext(m: MemoryContext): string {
  const parts: string[] = [];

  // Identity
  parts.push(`CLIENT:${m.name}${m.industry ? `|${m.industry}` : ""}`);

  // Voice (max 80 chars)
  if (m.brand_voice?.trim()) {
    parts.push(`VOICE:${m.brand_voice.trim().slice(0, 80)}`);
  }

  // Vocabulary — highest-signal section
  if (m.vocab_use?.length) {
    parts.push(`USE:${m.vocab_use.slice(0, 8).join("·")}`);
  }
  if (m.vocab_avoid?.length) {
    parts.push(`NEVER:${m.vocab_avoid.slice(0, 8).join("·")}`);
  }

  // Sentence mechanics (binary flags only — no booleans as JSON)
  if (m.sentence_style && Object.keys(m.sentence_style).length > 0) {
    const s = m.sentence_style;
    const flags: string[] = [
      s.avg_length ? `sentences:${s.avg_length}` : "",
      s.uses_emdash ? "uses-emdash" : "",
      s.opens_with_question ? "opens-with-question" : "",
      s.oxford_comma === false ? "no-oxford-comma" : "",
      s.exclamation_points === false ? "no-exclamation-points" : "",
      s.first_person ? "first-person" : "",
    ].filter(Boolean);
    if (flags.length) parts.push(`STYLE:${flags.join("·")}`);
  }

  // Structure
  if (m.structure && Object.keys(m.structure).length > 0) {
    const st = m.structure;
    const flags: string[] = [
      st.uses_bullets === false ? "prose-only" : "",
      st.uses_bullets === true ? "uses-bullets" : "",
      st.paragraph_length ? `paragraphs:${st.paragraph_length}` : "",
      st.email_signoff ? `signoff:${st.email_signoff}` : "",
      st.cta_style ? `cta:${st.cta_style}` : "",
    ].filter(Boolean);
    if (flags.length) parts.push(`FORMAT:${flags.join("·")}`);
  }

  // Audience
  if (m.audience_profile?.trim()) {
    parts.push(`AUDIENCE:${m.audience_profile.trim().slice(0, 100)}`);
  }

  // Standing decisions (settled rules — never ask again)
  if (m.decisions?.length) {
    const notes = m.decisions
      .slice(0, 5)
      .map((d) => (d.detail ?? "").trim())
      .filter(Boolean);
    if (notes.length) parts.push(`RULES:${notes.join("·")}`);
  }

  // Rejection reasons (more useful than the rejected copy itself)
  if (m.rejections?.length) {
    const reasons = m.rejections
      .slice(0, 3)
      .map((r) => (r.reason ?? "").trim())
      .filter(Boolean);
    if (reasons.length) parts.push(`AVOID:${reasons.join("·")}`);
  }

  // Samples — appended last, highest weight
  // Prefer two samples of different types
  if (m.samples?.length) {
    const seen = new Set<string>();
    const picks = m.samples
      .filter((s) => {
        if (seen.has(s.type)) return false;
        seen.add(s.type);
        return true;
      })
      .slice(0, 2);

    // Fall back to first two if all same type
    const final = picks.length >= 2 ? picks : m.samples.slice(0, 2);
    final.forEach((s, i) => {
      parts.push(`SAMPLE${i + 1}[${s.type}]:${s.text.slice(0, 300)}`);
    });
  }

  const result = parts.join("\n");
  // Hard cap ~2,400 characters
  if (result.length <= 2400) return result;

  const trimmed = result.slice(0, 2400);
  const cut = trimmed.lastIndexOf("\n");
  return cut > 800 ? trimmed.slice(0, cut) : trimmed;
}
