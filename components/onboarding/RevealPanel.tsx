"use client";

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
      <div className="rv-panel">
        {phase === "reveal" && (
          <div className="rv-reveal">
            <div className="rv-check">✓</div>
            <p className="rv-name">{clientName}</p>
            <p className="rv-sub">Voice fingerprint ready</p>

            <div className="rv-output-box">
              <p className="rv-output-label">{revealLabel}</p>
              {revealLoading ? (
                <div className="rv-loading">
                  <div className="rv-spinner" />
                  <span>Generating in their voice…</span>
                </div>
              ) : revealError ? (
                <p className="rv-error-text">{revealError}</p>
              ) : (
                <p className="rv-output-text">&ldquo;{revealOutput}&rdquo;</p>
              )}
            </div>

            <div className="rv-actions">
              <button
                type="button"
                className="rv-btn-primary"
                onClick={onOpenChat}
                disabled={revealLoading}
              >
                Open chat →
              </button>
              <button
                type="button"
                className="rv-btn-fix"
                onClick={onSomethingOff}
                disabled={revealLoading}
              >
                Something&apos;s off
              </button>
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
              {DIAGNOSE_OPTIONS.map((opt) => (
                <button
                  key={opt.stepId}
                  type="button"
                  className="rv-diag-option"
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
              <button
                type="button"
                className="rv-btn-primary"
                onClick={onRegenerate}
                disabled={!editValue.trim() || regenLoading}
              >
                {regenLoading ? "Regenerating…" : "Save & regenerate"}
              </button>
              <button
                type="button"
                className="rv-btn-secondary"
                onClick={onCancelEdit}
                disabled={regenLoading}
              >
                Cancel
              </button>
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
