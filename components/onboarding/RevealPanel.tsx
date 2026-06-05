"use client";

import type { CSSProperties } from "react";
import { Button } from "@/components/ui";
import BlurText from "@/components/bits/BlurText";
import type { StepId } from "./helpers";
import {
  DIAGNOSE_OPTIONS,
  REVEAL_LABELS,
  STEP_META,
  type CorrectPhase,
  type FreelancerType,
} from "./reveal";

interface Props {
  clientName: string;
  freelancerType: FreelancerType;
  phase: CorrectPhase;
  revealOutput: string;
  revealLoading: boolean;
  revealError: string;
  editingStep: StepId | null;
  editValue: string;
  regenLoading: boolean;
  answersMap: Partial<Record<StepId, string>>;
  onOpenChat: () => void;
  onSomethingOff: () => void;
  onBackToReveal: () => void;
  onBackToDiagnose: () => void;
  onDiagnose: (stepId: StepId) => void;
  onEditValueChange: (value: string) => void;
  onRegenerate: () => void;
  onCancelEdit: () => void;
}

/* Stagger helpers — same spring values as MemoryEditor chipIn */
const STAGGER = 60; /* ms per item */
function staggerStyle(i: number): CSSProperties {
  return {
    animation: `rvChipIn var(--dur-base) var(--ease-spring) ${i * STAGGER}ms both`,
  };
}

export default function RevealPanel({
  clientName,
  freelancerType,
  phase,
  revealOutput,
  revealLoading,
  revealError,
  editingStep,
  editValue,
  regenLoading,
  answersMap,
  onOpenChat,
  onSomethingOff,
  onBackToReveal,
  onBackToDiagnose,
  onDiagnose,
  onEditValueChange,
  onRegenerate,
  onCancelEdit,
}: Props) {
  const revealLabel = REVEAL_LABELS[freelancerType];

  return (
    <div className="rv-overlay">
      {/* Inline keyframes — suppressed by global prefers-reduced-motion guard */}
      <style>{`
        @keyframes rvScanLine {
          0%   { transform: translateY(0); opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateY(200px); opacity: 0; }
        }
        @keyframes rvChipIn {
          from { opacity: 0; transform: translateY(8px) scale(.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);   }
        }
        @media (prefers-reduced-motion: reduce) {
          .rv-scan-line { display: none !important; }
        }
      `}</style>

      <div className="rv-panel">
        {phase === "reveal" && (
          <div className="rv-reveal">
            {/* Staggered entrance — each element stamps in 60 ms after the previous */}
            <div className="rv-check" style={staggerStyle(0)}>✓</div>
            <p className="rv-name" style={staggerStyle(1)}>{clientName}</p>
            <p className="rv-sub"  style={staggerStyle(2)}>Voice fingerprint ready</p>

            <div className="rv-output-box" style={staggerStyle(3)}>
              <p className="rv-output-label">{revealLabel}</p>
              {revealLoading ? (
                <>
                  <div className="rv-loading">
                    <div className="rv-spinner" />
                    <span>Generating in their voice…</span>
                  </div>
                  {/* Scan-line sweep — same pattern as MemoryEditor analyze */}
                  <span
                    aria-hidden="true"
                    className="rv-scan-line pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-accent"
                    style={{ animation: "rvScanLine 1.1s linear infinite" }}
                  />
                </>
              ) : revealError ? (
                <p className="rv-error-text">{revealError}</p>
              ) : (
                /* BlurText reveal — re-animates on each new revealOutput */
                <div
                  key={revealOutput.slice(0, 20)}
                  className="rv-output-text"
                >
                  <BlurText
                    text={`\u201C${revealOutput}\u201D`}
                    delay={80}
                    animateBy="words"
                    direction="top"
                    className="text-text-primary text-sm leading-relaxed"
                  />
                </div>
              )}
            </div>

            <div className="rv-actions" style={staggerStyle(4)}>
              <Button
                variant="primary"
                onClick={onOpenChat}
                disabled={revealLoading}
              >
                Open chat →
              </Button>
              <Button
                variant="ghost"
                onClick={onSomethingOff}
                disabled={revealLoading}
                className="text-sm text-text-primary/70 hover:text-text-primary border border-white/10"
              >
                Something&apos;s off
              </Button>
            </div>
          </div>
        )}

        {phase === "diagnose" && (
          <div className="rv-diagnose">
            <button type="button" className="rv-back" onClick={onBackToReveal}>
              ← back
            </button>
            <p className="rv-diag-title">What was off?</p>
            <p className="rv-diag-sub">
              Pick the closest match — we&apos;ll take you straight to the fix.
            </p>
            <div className="rv-diag-options">
              {DIAGNOSE_OPTIONS.map((opt, index) => (
                <button
                  key={opt.stepId}
                  type="button"
                  className="rv-diag-option animate-stampIn opacity-0 animation-fill-forwards"
                  style={{ animationDelay: `${index * 80}ms` }}
                  onClick={() => onDiagnose(opt.stepId)}
                >
                  <span className="rv-diag-label">{opt.label}</span>
                  <span className="rv-diag-hint">{opt.sub} →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "edit" && editingStep && (
          <div className="rv-edit">
            <button type="button" className="rv-back" onClick={onBackToDiagnose}>
              ← back
            </button>
            <p className="rv-edit-step">{STEP_META[editingStep].label}</p>
            <p className="rv-edit-q">{STEP_META[editingStep].question}</p>

            {answersMap[editingStep] && (
              <div className="rv-original">
                <p className="rv-original-label">Your original answer</p>
                <p className="rv-original-text">{answersMap[editingStep]}</p>
              </div>
            )}

            <textarea
              className="rv-edit-area"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              rows={4}
              placeholder="Refine your answer…"
              autoFocus
            />

            <div className="rv-edit-actions">
              <Button
                variant="primary"
                onClick={onRegenerate}
                disabled={!editValue.trim() || regenLoading}
              >
                {regenLoading ? "Regenerating…" : "Save & regenerate"}
              </Button>
              <Button
                variant="ghost"
                onClick={onCancelEdit}
                disabled={regenLoading}
                className="text-sm text-text-primary/60 hover:text-text-primary"
              >
                Cancel
              </Button>
            </div>

            {revealError && (
              <p className="rv-error-text rv-error-text--spaced">{revealError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
