import type { ClientMemory, Decision, Rejection, Sample } from "./types";

interface ExportArgs {
  clientName: string;
  industry: string;
  brandVoice: string;
  audienceProfile: string;
  toneRules: string[];
  vocabUse: string[];
  vocabAvoid: string[];
  samples: Sample[];
  decisions: Decision[];
  rejections: Rejection[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportMemoryPdf(args: ExportArgs): void {
  const sections: string[] = [
    `<h1>${escapeHtml(args.clientName)}</h1>`,
    args.industry ? `<p><strong>Industry:</strong> ${escapeHtml(args.industry)}</p>` : "",
    args.brandVoice
      ? `<h2>Brand voice</h2><p>${escapeHtml(args.brandVoice)}</p>`
      : "",
    args.audienceProfile
      ? `<h2>Audience</h2><p>${escapeHtml(args.audienceProfile)}</p>`
      : "",
    args.toneRules.length
      ? `<h2>Tone rules</h2><ul>${args.toneRules.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
      : "",
    args.vocabUse.length
      ? `<h2>Always use</h2><p>${escapeHtml(args.vocabUse.join(", "))}</p>`
      : "",
    args.vocabAvoid.length
      ? `<h2>Never say</h2><p>${escapeHtml(args.vocabAvoid.join(", "))}</p>`
      : "",
    args.samples.length
      ? `<h2>Samples</h2>${args.samples
          .map(
            (s) =>
              `<h3>${escapeHtml(s.type)}</h3><pre>${escapeHtml(s.text)}</pre>`
          )
          .join("")}`
      : "",
    args.decisions.length
      ? `<h2>Standing decisions</h2><ul>${args.decisions
          .map((d) => `<li>${escapeHtml(d.detail)}</li>`)
          .join("")}</ul>`
      : "",
    args.rejections.length
      ? `<h2>Rejected work</h2>${args.rejections
          .map(
            (r) =>
              `<p><em>${escapeHtml(r.sample)}</em><br/>↳ ${escapeHtml(r.reason)}</p>`
          )
          .join("")}`
      : "",
  ].filter(Boolean);

  const html = `<!DOCTYPE html><html><head><title>${escapeHtml(args.clientName)} — Memory</title>
<style>
  body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #555; margin-top: 24px; }
  h3 { font-size: 12px; color: #666; }
  pre { white-space: pre-wrap; background: #f5f5f0; padding: 12px; border-radius: 6px; font-size: 13px; }
  p, li { font-size: 14px; }
</style></head><body>${sections.join("")}</body></html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Enable pop-ups to export the memory PDF."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
