"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { saveMemory } from "@/app/clients/[id]/actions";
import {
  applyAnswer,
  parseExtractions,
  profileToMemoryPayload,
  EMPTY_PROFILE,
  type Extraction,
  type ProfileState,
  type StepId,
} from "./onboarding/helpers";
import { ONBOARDING_STEPS, TOTAL_STEPS } from "./onboarding/steps";
import RevealPanel from "./onboarding/RevealPanel";
import type { CorrectPhase, FreelancerType } from "./onboarding/reveal";
import "./ClientOnboarding.css";

interface Props {
  clientId: string;
  clientName: string;
  freelancerType?: FreelancerType;
}

interface ChatMessage {
  role: "assistant" | "user";
  text?: string;
  extractions?: Extraction[];
  capability?: string;
  stepHeader?: string;
}

const TYPEWRITER_MS = 14;
const PAUSE_BEFORE_EXTRACTIONS_MS = 500;
const EXTRACTION_BASE_DELAY_MS = 900;
const EXTRACTION_PER_ITEM_MS = 120;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function AssistantAvatar() {
  return (
    <div className="ob-avatar" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="6" cy="6" r="2" fill="currentColor" />
      </svg>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const hasExtractions = Boolean(message.extractions?.length);
  const showTextBlock =
    Boolean(message.text) ||
    Boolean(message.stepHeader) ||
    Boolean(message.capability && !hasExtractions);

  return (
    <div className={`ob-bubble ob-bubble--${message.role === "assistant" ? "ai" : "user"}`}>
      {hasExtractions && (
        <div className="ob-extractions">
          {message.extractions!.map((ex, i) => (
            <div
              key={i}
              className="ob-extraction"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span className="ob-ex-check">✓</span>
              <span className="ob-ex-label">{ex.label}:</span>
              <span className="ob-ex-value">{ex.value}</span>
            </div>
          ))}
          {message.capability && (
            <div className="ob-capability">{message.capability}</div>
          )}
        </div>
      )}
      {showTextBlock && (
        <p className="ob-msg-text">
          {message.capability && !hasExtractions && (
            <>
              <span className="ob-capability-inline">{message.capability}</span>
              <br />
              <br />
            </>
          )}
          {message.stepHeader && (
            <>
              <span className="ob-step-tag">{message.stepHeader}</span>
              <br />
            </>
          )}
          {message.text}
        </p>
      )}
    </div>
  );
}

function ProfilePanel({
  clientName,
  profile,
  currentStep,
}: {
  clientName: string;
  profile: ProfileState;
  currentStep: number;
}) {
  return (
    <aside className="ob-profile">
      <div className="ob-profile-inner">
        <div className="ob-profile-header">
          <p className="ob-profile-title">{clientName}</p>
          <p className="ob-profile-sub">Building profile…</p>
        </div>

        <ProfileField label="Voice" value={profile.voice} />
        <ProfileField label="Audience" value={profile.audienceProfile} />

        <div className="ob-profile-section">
          <p className="ob-profile-label">Always use</p>
          {profile.vocabUse.length > 0 ? (
            <div className="ob-tags">
              {profile.vocabUse.slice(0, 5).map((word) => (
                <span key={word} className="ob-tag ob-tag--use">
                  {word}
                </span>
              ))}
            </div>
          ) : (
            <p className="ob-profile-value ob-profile-value--empty">—</p>
          )}
        </div>

        <div className="ob-profile-section">
          <p className="ob-profile-label">Never say</p>
          {profile.vocabAvoid.length > 0 ? (
            <div className="ob-tags">
              {profile.vocabAvoid.slice(0, 5).map((word) => (
                <span key={word} className="ob-tag ob-tag--avoid">
                  {word}
                </span>
              ))}
            </div>
          ) : (
            <p className="ob-profile-value ob-profile-value--empty">—</p>
          )}
        </div>

        <div className="ob-profile-section">
          <p className="ob-profile-label">Sample</p>
          {profile.sampleCopy ? (
            <p className="ob-profile-value ob-profile-value--active ob-profile-value--sample">
              &ldquo;{profile.sampleCopy.slice(0, 90)}
              {profile.sampleCopy.length > 90 ? "…" : ""}&rdquo;
            </p>
          ) : (
            <p className="ob-profile-value ob-profile-value--empty">—</p>
          )}
        </div>

        <div className="ob-divider" />

        <div className="ob-capabilities">
          <p className="ob-profile-label">Capabilities</p>
          {ONBOARDING_STEPS.map((s, i) => {
            const status =
              i < currentStep ? "done" : i === currentStep ? "active" : "locked";
            return (
              <div key={s.id} className={`ob-cap-row ob-cap-row--${status}`}>
                <span className="ob-cap-icon">{i < currentStep ? "✓" : "·"}</span>
                <span className="ob-cap-text">{s.capability}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="ob-profile-section">
      <p className="ob-profile-label">{label}</p>
      {value ? (
        <p className="ob-profile-value ob-profile-value--active">
          {value.slice(0, 80)}
        </p>
      ) : (
        <p className="ob-profile-value ob-profile-value--empty">—</p>
      )}
    </div>
  );
}

export default function ClientOnboarding({
  clientId,
  clientName,
  freelancerType = "general",
}: Props) {
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [profile, setProfile] = useState<ProfileState>(EMPTY_PROFILE);
  const [answersMap, setAnswersMap] = useState<Partial<Record<StepId, string>>>({});
  const [saveError, setSaveError] = useState("");

  const [showReveal, setShowReveal] = useState(false);
  const [revealOutput, setRevealOutput] = useState("");
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealError, setRevealError] = useState("");

  const [correctPhase, setCorrectPhase] = useState<CorrectPhase>("reveal");
  const [editingStep, setEditingStep] = useState<StepId | null>(null);
  const [editValue, setEditValue] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const step = ONBOARDING_STEPS[currentStep];
  const progress = Math.round(
    ((currentStep + (showReveal ? 1 : 0)) / TOTAL_STEPS) * 100
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([
        { role: "assistant", text: ONBOARDING_STEPS[0].question(clientName) },
      ]);
    }, 500);
    return () => clearTimeout(timer);
  }, [clientName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, showReveal]);

  useEffect(() => {
    if (!showReveal && !isTyping) inputRef.current?.focus();
  }, [isTyping, showReveal]);

  const typeAssistantMessage = useCallback(
    async (message: Omit<ChatMessage, "role">) => {
      const fullText = message.text ?? "";
      setMessages((prev) => [...prev, { role: "assistant", ...message, text: "" }]);

      for (let i = 0; i <= fullText.length; i++) {
        await delay(TYPEWRITER_MS);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            ...message,
            text: fullText.slice(0, i),
          };
          return updated;
        });
      }
    },
    []
  );

  const fetchRevealOutput = useCallback(async () => {
    setRevealLoading(true);
    setRevealError("");
    try {
      const res = await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = (await res.json()) as {
        output?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setRevealOutput(data.output ?? "");
    } catch (err: unknown) {
      setRevealError(
        err instanceof Error ? err.message : "Could not generate preview."
      );
    } finally {
      setRevealLoading(false);
    }
  }, [clientId]);

  const persistProfile = useCallback(
    async (finalProfile: ProfileState) => {
      setSaveError("");
      const result = await saveMemory(clientId, profileToMemoryPayload(finalProfile));
      if (result.error) throw new Error(result.error);
      return finalProfile;
    },
    [clientId]
  );

  const saveAndReveal = useCallback(
    async (finalProfile: ProfileState) => {
      try {
        await persistProfile(finalProfile);
        setShowReveal(true);
        setCorrectPhase("reveal");
        await fetchRevealOutput();
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : "Failed to save.");
      }
    },
    [persistProfile, fetchRevealOutput]
  );

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping || showReveal) return;

    const activeStep = ONBOARDING_STEPS[currentStep];
    setInput("");
    setIsTyping(true);

    setMessages((prev) => [...prev, { role: "user", text }]);
    setAnswersMap((prev) => ({ ...prev, [activeStep.id]: text }));

    const updatedProfile = applyAnswer(profile, activeStep.id, text);
    setProfile(updatedProfile);

    await delay(PAUSE_BEFORE_EXTRACTIONS_MS);

    const extractions = parseExtractions(activeStep.id, text);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        extractions,
        capability: activeStep.capability,
      },
    ]);

    await delay(EXTRACTION_BASE_DELAY_MS + extractions.length * EXTRACTION_PER_ITEM_MS);

    const nextStep = ONBOARDING_STEPS[currentStep + 1];

    if (!nextStep) {
      await typeAssistantMessage({
        capability: activeStep.capability,
        text: `${clientName}'s profile is complete. Building voice fingerprint…`,
      });
      setIsTyping(false);
      await saveAndReveal(updatedProfile);
      return;
    }

    await typeAssistantMessage({
      capability: activeStep.capability,
      stepHeader: `${nextStep.stepLabel} · Step ${nextStep.stepNum} of ${TOTAL_STEPS}`,
      text: nextStep.question(clientName),
    });

    setIsTyping(false);
    setCurrentStep((prev) => prev + 1);
  };

  const handleDiagnose = (stepId: StepId) => {
    setEditingStep(stepId);
    setEditValue(answersMap[stepId] || "");
    setCorrectPhase("edit");
    setRevealError("");
  };

  const handleRegenerate = async () => {
    if (!editingStep || !editValue.trim()) return;

    setRegenLoading(true);
    setRevealError("");

    try {
      const updatedProfile = applyAnswer(profile, editingStep, editValue.trim());
      setProfile(updatedProfile);
      setAnswersMap((prev) => ({ ...prev, [editingStep]: editValue.trim() }));
      await persistProfile(updatedProfile);
      setCorrectPhase("reveal");
      await fetchRevealOutput();
    } catch (err: unknown) {
      setRevealError(err instanceof Error ? err.message : "Failed to update.");
    } finally {
      setRegenLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ob-root">
      {showReveal && (
        <RevealPanel
          clientName={clientName}
          freelancerType={freelancerType}
          phase={correctPhase}
          revealOutput={revealOutput}
          revealLoading={revealLoading}
          revealError={revealError}
          editingStep={editingStep}
          editValue={editValue}
          regenLoading={regenLoading}
          answersMap={answersMap}
          onOpenChat={() => router.push(`/clients/${clientId}/chat`)}
          onSomethingOff={() => setCorrectPhase("diagnose")}
          onBackToReveal={() => setCorrectPhase("reveal")}
          onBackToDiagnose={() => setCorrectPhase("diagnose")}
          onDiagnose={handleDiagnose}
          onEditValueChange={setEditValue}
          onRegenerate={handleRegenerate}
          onCancelEdit={() => setCorrectPhase("diagnose")}
        />
      )}

      <header className="ob-header">
        <div className="ob-header-inner">
          <div className="ob-header-left">
            <span className="ob-logo">Freelance Freedom</span>
            <span className="ob-sep">/</span>
            <span className="ob-client-name">{clientName}</span>
          </div>
          <div className="ob-header-right">
            {!showReveal && <span className="ob-step-label">{step.stepLabel}</span>}
            <div className="ob-progress-track">
              <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="ob-progress-pct">{progress}%</span>
          </div>
        </div>
      </header>

      <div className="ob-body">
        <div className="ob-chat">
          <div className="ob-chat-inner">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`ob-msg ob-msg--${msg.role === "assistant" ? "ai" : "user"}`}
              >
                {msg.role === "assistant" && <AssistantAvatar />}
                <MessageBubble message={msg} />
              </div>
            ))}

            {isTyping && (
              <div className="ob-msg ob-msg--ai">
                <AssistantAvatar />
                <div className="ob-bubble ob-bubble--ai">
                  <div className="ob-typing">
                    <div className="ob-dot" />
                    <div className="ob-dot" />
                    <div className="ob-dot" />
                  </div>
                </div>
              </div>
            )}

            {saveError && (
              <div className="ob-error">
                {saveError}
                <button
                  type="button"
                  className="ob-retry"
                  onClick={() => saveAndReveal(profile)}
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {!showReveal && (
            <div className="ob-input-area">
              <p className="ob-hint">{step.hint}</p>
              <div className="ob-input-row">
                <textarea
                  ref={inputRef}
                  className="ob-textarea"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer…"
                  rows={3}
                  disabled={isTyping}
                  aria-label="Your answer"
                />
                <button
                  type="button"
                  className="ob-send"
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  aria-label="Send answer"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path
                      d="M13 7.5L2 2l2 5.5L2 13l11-5.5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <p className="ob-meta">Enter to send · Shift+Enter for new line</p>
            </div>
          )}
        </div>

        <ProfilePanel
          clientName={clientName}
          profile={profile}
          currentStep={currentStep}
        />
      </div>
    </div>
  );
}
