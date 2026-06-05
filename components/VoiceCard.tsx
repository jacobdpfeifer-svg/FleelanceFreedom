"use client";

import type { SentenceStyle } from "@/lib/types";

export interface VoiceCardProps {
  name: string;
  industry: string;
  brandVoice: string;
  toneRules: string[];
  vocabUse: string[];
  vocabAvoid: string[];
  sentenceStyle: SentenceStyle;
  samplesCount: number;
}

const STYLE_LABELS: Array<[keyof SentenceStyle, string]> = [
  ["uses_emdash", "Em-dashes"],
  ["opens_with_question", "Opens w/ question"],
  ["oxford_comma", "Oxford comma"],
  ["exclamation_points", "Exclamation pts"],
  ["first_person", "First person"],
];

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">
      {children}
    </p>
  );
}

function CardBody({
  name,
  industry,
  brandVoice,
  toneRules,
  vocabUse,
  vocabAvoid,
  sentenceStyle,
  samplesCount,
}: VoiceCardProps) {
  const activeStyleLabels = STYLE_LABELS.filter(
    ([k]) => sentenceStyle[k] === true
  );

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-text-primary">{name}</p>
        {industry && (
          <p className="text-xs text-text-muted mt-0.5">{industry}</p>
        )}
      </div>

      {/* Brand voice excerpt */}
      {brandVoice && (
        <p className="text-xs italic text-text-muted leading-relaxed">
          &ldquo;{brandVoice.slice(0, 120)}
          {brandVoice.length > 120 ? "…" : ""}&rdquo;
        </p>
      )}

      {/* Tone rules */}
      {toneRules.length > 0 && (
        <div>
          <SectionLabel>Tone</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {toneRules.map((r, i) => (
              <span
                key={r}
                className="text-xs bg-raised text-text-primary/80 px-2 py-0.5 rounded-full animate-stamp-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Vocab use */}
      {vocabUse.length > 0 && (
        <div>
          <SectionLabel>Use</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {vocabUse.map((v, i) => (
              <span
                key={v}
                className="text-xs bg-badge-longform-bg text-badge-longform-text px-2 py-0.5 rounded-full animate-stamp-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Vocab avoid */}
      {vocabAvoid.length > 0 && (
        <div>
          <SectionLabel>Avoid</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {vocabAvoid.map((v, i) => (
              <span
                key={v}
                className="text-xs bg-danger/15 text-danger px-2 py-0.5 rounded-full animate-stamp-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                ✗ {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active sentence-style badges */}
      {activeStyleLabels.length > 0 && (
        <div>
          <SectionLabel>Style</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {activeStyleLabels.map(([k, label]) => (
              <span
                key={k}
                className="text-xs bg-raised text-text-primary/80 px-2 py-0.5 rounded-full"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sample count */}
      <p className="text-xs text-text-muted pt-1">
        {samplesCount === 0
          ? "No samples yet"
          : `${samplesCount} sample${samplesCount !== 1 ? "s" : ""} trained`}
      </p>
    </div>
  );
}

export default function VoiceCard(props: VoiceCardProps) {
  const sharedCardClass =
    "bg-card border border-border rounded-[10px]";

  return (
    <>
      {/* Desktop: always visible */}
      <div className={`hidden md:block ${sharedCardClass}`}>
        <p className="px-4 pt-4 text-[9px] font-bold tracking-widest uppercase text-accent">
          Voice Dossier
        </p>
        <CardBody {...props} />
      </div>

      {/* Mobile: collapsed disclosure */}
      <details className={`md:hidden ${sharedCardClass}`}>
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
          View Voice Card
        </summary>
        <CardBody {...props} />
      </details>
    </>
  );
}
