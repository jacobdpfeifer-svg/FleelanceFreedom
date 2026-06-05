"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button, ConfirmSheet, Meter, Toast } from "@/components/ui";
import { useTabIndicator } from "@/components/ui/hooks";
import { useToast } from "@/components/ui/Toast";
import { buildClientContext } from "@/lib/buildClientContext";
import { exportMemoryPdf } from "@/lib/exportMemoryPdf";
import {
  CONTEXT_CHAR_MAX,
  CONTEXT_CHAR_WARN,
} from "@/lib/memoryConstants";
import { MIN_SAMPLE_CHARS } from "@/lib/sampleConstants";
import { saveClientMeta, saveMemory, deleteClient } from "./actions";
import type {
  AnalysisResult,
  ClientMemory,
  Decision,
  Plan,
  Rejection,
  Sample,
  SampleType,
  SentenceStyle,
  Structure,
} from "@/lib/types";

// ── shared primitives ─────────────────────────────────────────────────────────

export interface VoiceEditorState {
  name: string;
  industry: string;
  brandVoice: string;
  toneRules: string[];
  vocabUse: string[];
  vocabAvoid: string[];
  sentenceStyle: SentenceStyle;
  samplesCount: number;
}

interface Props {
  clientId: string;
  clientName: string;
  clientIndustry: string;
  memory: ClientMemory | null;
  userPlan: Plan;
  onStateChange?: (state: VoiceEditorState) => void;
}

function buildSnapshot(data: {
  name: string;
  industry: string;
  brandVoice: string;
  audienceProfile: string;
  toneRules: string[];
  vocabUse: string[];
  vocabAvoid: string[];
  sentenceStyle: SentenceStyle;
  structure: Structure;
  samples: Sample[];
  decisions: Decision[];
  rejections: Rejection[];
}) {
  return JSON.stringify(data);
}

function TagInput({
  tags,
  onChange,
  placeholder,
  colorClass = "bg-raised text-text-primary",
}: {
  tags: string[];
  onChange: (t: string[]) => void;
  placeholder?: string;
  colorClass?: string;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const t = draft.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setDraft("");
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-pill ${colorClass}`}
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="opacity-60 hover:opacity-100 leading-none"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-page border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
        />
        <button
          type="button"
          onClick={add}
          className="bg-raised hover:bg-border text-text-primary text-sm px-3 py-2 rounded-md transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-[10px] p-5">
      <div className="mb-3">
        <h3 className="font-medium text-sm">{title}</h3>
        {hint && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-page border border-border rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed transition-colors"
    />
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={!!value}
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-pill transition-colors flex-shrink-0 ${
          value ? "bg-accent" : "bg-raised"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-pill bg-card transition-transform ${
            value ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-sm text-text-primary group-hover:text-text-primary transition-colors">
        {label}
      </span>
    </label>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function MemoryEditor({
  clientId,
  clientName,
  clientIndustry,
  memory,
  userPlan,
  onStateChange,
}: Props) {
  type ActiveTab = "voice" | "samples" | "rules";
  const SECTION_IDS: ActiveTab[] = ["voice", "samples", "rules"];
  const [activeTab, setActiveTab] = useState<ActiveTab>("voice");
  const tabsRef = useRef<HTMLDivElement>(null);
  const indicator = useTabIndicator(SECTION_IDS.indexOf(activeTab), tabsRef);

  const [name, setName] = useState(clientName);
  const [industry, setIndustry] = useState(clientIndustry);

  const [brandVoice, setBrandVoice] = useState(memory?.brand_voice ?? "");
  const [audienceProfile, setAudienceProfile] = useState(
    memory?.audience_profile ?? ""
  );
  const [toneRules, setToneRules] = useState<string[]>(memory?.tone_rules ?? []);

  const [vocabUse, setVocabUse] = useState<string[]>(memory?.vocab_use ?? []);
  const [vocabAvoid, setVocabAvoid] = useState<string[]>(memory?.vocab_avoid ?? []);
  const [sentenceStyle, setSentenceStyle] = useState<SentenceStyle>(
    memory?.sentence_style ?? {}
  );
  const [structure, setStructure] = useState<Structure>(memory?.structure ?? {});

  // Samples
  const [samples, setSamples] = useState<Sample[]>(memory?.samples ?? []);
  const [addingSample, setAddingSample] = useState(false);
  const [newSampleText, setNewSampleText] = useState("");
  const [newSampleType, setNewSampleType] = useState<SampleType>("email");
  const [pendingAnalysis, setPendingAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Rules
  const [decisions, setDecisions] = useState<Decision[]>(memory?.decisions ?? []);
  const [rejections, setRejections] = useState<Rejection[]>(memory?.rejections ?? []);
  const [newDecision, setNewDecision] = useState("");
  const [newRejectionSample, setNewRejectionSample] = useState("");
  const [newRejectionReason, setNewRejectionReason] = useState("");

  // Save state
  const [isSaving, startSaveTransition] = useTransition();
  const [isSavingMeta, startMetaTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPdfUpgrade, setShowPdfUpgrade] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    buildSnapshot({
      name: clientName,
      industry: clientIndustry,
      brandVoice: memory?.brand_voice ?? "",
      audienceProfile: memory?.audience_profile ?? "",
      toneRules: memory?.tone_rules ?? [],
      vocabUse: memory?.vocab_use ?? [],
      vocabAvoid: memory?.vocab_avoid ?? [],
      sentenceStyle: memory?.sentence_style ?? {},
      structure: memory?.structure ?? {},
      samples: memory?.samples ?? [],
      decisions: memory?.decisions ?? [],
      rejections: memory?.rejections ?? [],
    })
  );

  const isProPlus = userPlan === "pro" || userPlan === "agency";

  const newSampleTrimmed = newSampleText.trim();
  const newSampleTooShort =
    newSampleTrimmed.length > 0 && newSampleTrimmed.length < MIN_SAMPLE_CHARS;

  const currentSnapshot = useMemo(
    () =>
      buildSnapshot({
        name,
        industry,
        brandVoice,
        audienceProfile,
        toneRules,
        vocabUse,
        vocabAvoid,
        sentenceStyle,
        structure,
        samples,
        decisions,
        rejections,
      }),
    [
      name,
      industry,
      brandVoice,
      audienceProfile,
      toneRules,
      vocabUse,
      vocabAvoid,
      sentenceStyle,
      structure,
      samples,
      decisions,
      rejections,
    ]
  );

  const isDirty = currentSnapshot !== savedSnapshot;

  const contextPreview = useMemo(
    () =>
      buildClientContext({
        name,
        industry: industry || null,
        brand_voice: brandVoice || null,
        audience_profile: audienceProfile || null,
        tone_rules: toneRules,
        vocab_use: vocabUse,
        vocab_avoid: vocabAvoid,
        sentence_style: sentenceStyle,
        structure,
        decisions,
        rejections,
        samples,
      }),
    [
      name,
      industry,
      brandVoice,
      audienceProfile,
      toneRules,
      vocabUse,
      vocabAvoid,
      sentenceStyle,
      structure,
      decisions,
      rejections,
      samples,
    ]
  );

  useEffect(() => {
    onStateChange?.({
      name,
      industry,
      brandVoice,
      toneRules,
      vocabUse,
      vocabAvoid,
      sentenceStyle,
      samplesCount: samples.length,
    });
  }, [onStateChange, name, industry, brandVoice, toneRules, vocabUse, vocabAvoid, sentenceStyle, samples]);

  // ── helpers ───────────────────────────────────────────────────────────────

  function patchStyle(patch: Partial<SentenceStyle>) {
    setSentenceStyle((prev) => ({ ...prev, ...patch }));
  }
  function patchStructure(patch: Partial<Structure>) {
    setStructure((prev) => ({ ...prev, ...patch }));
  }

  function handleMetaSave() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("industry", industry);
    startMetaTransition(async () => {
      const r = await saveClientMeta(clientId, fd);
      if (r?.error) {
        setErrorMsg(r.error);
      } else {
        setSavedSnapshot(
          buildSnapshot({
            name,
            industry,
            brandVoice,
            audienceProfile,
            toneRules,
            vocabUse,
            vocabAvoid,
            sentenceStyle,
            structure,
            samples,
            decisions,
            rejections,
          })
        );
      }
    });
  }

  function handleSave() {
    startSaveTransition(async () => {
      const result = await saveMemory(clientId, {
        brand_voice: brandVoice || null,
        audience_profile: audienceProfile || null,
        tone_rules: toneRules,
        vocab_use: vocabUse,
        vocab_avoid: vocabAvoid,
        sentence_style: sentenceStyle,
        structure,
        decisions,
        rejections,
        samples,
      });
      if (result.error) {
        setErrorMsg(result.error);
        addToast(result.error ?? "Save failed", "danger");
      } else {
        setSavedSnapshot(currentSnapshot);
        addToast("Memory saved", "success");
        setErrorMsg(null);
      }
    });
  }

  function handleExportPdf() {
    if (!isProPlus) {
      setShowPdfUpgrade(true);
      return;
    }
    exportMemoryPdf({
      clientName: name,
      industry,
      brandVoice,
      audienceProfile,
      toneRules,
      vocabUse,
      vocabAvoid,
      samples,
      decisions,
      rejections,
    });
  }

  // ── sample analysis ───────────────────────────────────────────────────────

  async function handleAnalyzeSample() {
    const trimmed = newSampleText.trim();
    if (!trimmed) return;
    if (trimmed.length < MIN_SAMPLE_CHARS) {
      setErrorMsg(
        `Paste at least ${MIN_SAMPLE_CHARS} characters of copy to analyze.`
      );
      return;
    }
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/analyze-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newSampleText }),
      });
      const json = (await res.json()) as AnalysisResult & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      setPendingAnalysis(json);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function confirmAddSample() {
    if (!newSampleText.trim()) return;
    setSamples((prev) => [
      ...prev,
      { type: newSampleType, text: newSampleText.trim() },
    ]);
    if (pendingAnalysis) {
      setSentenceStyle((prev) => ({ ...prev, ...pendingAnalysis.sentence_style }));
      setVocabUse((prev) =>
        Array.from(new Set([...prev, ...pendingAnalysis.vocab_use])).slice(0, 12)
      );
      setVocabAvoid((prev) =>
        Array.from(new Set([...prev, ...pendingAnalysis.vocab_avoid])).slice(0, 10)
      );
    }
    setNewSampleText("");
    setNewSampleType("email");
    setPendingAnalysis(null);
    setAddingSample(false);
  }

  // ── tab content ──────────────────────────────────────────────────────────

  const SAMPLE_TYPES: { value: SampleType; label: string }[] = [
    { value: "email", label: "Email" },
    { value: "social", label: "Social" },
    { value: "longform", label: "Long-form" },
  ];

  const voiceTab = (
    <div className="space-y-4">
      <SectionCard title="Client Info">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleMetaSave}
              className="w-full bg-page border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Industry</label>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              onBlur={handleMetaSave}
              placeholder="e.g. SaaS, fintech…"
              className="w-full bg-page border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Brand Voice"
        hint="Describe how this client writes — adjectives, references, personality."
      >
        <Textarea
          value={brandVoice}
          onChange={setBrandVoice}
          placeholder="e.g. Warm, direct, never salesy. Like a trusted friend who happens to be an expert."
          rows={3}
        />
      </SectionCard>

      <SectionCard
        title="Target Audience"
        hint="Describe the ideal reader in one or two sentences."
      >
        <Textarea
          value={audienceProfile}
          onChange={setAudienceProfile}
          placeholder="e.g. Solo founders aged 28–40 who value clarity over jargon."
          rows={2}
        />
      </SectionCard>

      <SectionCard
        title="Tone Rules"
        hint="Standing tone instructions — press Enter or comma to add."
      >
        <TagInput
          tags={toneRules}
          onChange={setToneRules}
          placeholder='e.g. Never use exclamation points, Always lead with a stat'
          colorClass="bg-raised text-text-primary"
        />
      </SectionCard>

      <SectionCard
        title="Characteristic Vocabulary"
        hint="Words and phrases this client always uses. Press Enter or comma to add."
      >
        <TagInput
          tags={vocabUse}
          onChange={setVocabUse}
          placeholder="e.g. no-brainer, let's be honest, quietly"
          colorClass="bg-raised text-text-primary"
        />
      </SectionCard>

      <SectionCard
        title="Words to Never Use"
        hint="We'll never use these words in copy for this client."
      >
        <TagInput
          tags={vocabAvoid}
          onChange={setVocabAvoid}
          placeholder="e.g. synergy, leverage, game-changer"
          colorClass="bg-danger/15 text-danger"
        />
      </SectionCard>

      <SectionCard
        title="Sentence Mechanics"
        hint="Toggle each trait on or off. Auto-detected from samples — override freely."
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {(["short", "medium", "long"] as const).map((len) => (
              <button
                key={len}
                type="button"
                onClick={() =>
                  patchStyle({
                    avg_length: sentenceStyle.avg_length === len ? undefined : len,
                  })
                }
                className={`py-2 rounded-lg text-sm capitalize transition-colors ${
                  sentenceStyle.avg_length === len
                    ? "bg-accent text-text-primary"
                    : "bg-raised text-text-muted hover:text-text-primary"
                }`}
              >
                {len} sentences
              </button>
            ))}
          </div>
          <div className="space-y-2.5 pt-1">
            <Toggle
              label="Uses em-dashes — like this"
              value={sentenceStyle.uses_emdash}
              onChange={(v) => patchStyle({ uses_emdash: v })}
            />
            <Toggle
              label="Opens copy with a question"
              value={sentenceStyle.opens_with_question}
              onChange={(v) => patchStyle({ opens_with_question: v })}
            />
            <Toggle
              label="Oxford comma"
              value={sentenceStyle.oxford_comma}
              onChange={(v) => patchStyle({ oxford_comma: v })}
            />
            <Toggle
              label="Exclamation points"
              value={sentenceStyle.exclamation_points}
              onChange={(v) => patchStyle({ exclamation_points: v })}
            />
            <Toggle
              label="First-person voice (I / we)"
              value={sentenceStyle.first_person}
              onChange={(v) => patchStyle({ first_person: v })}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Structure & Formatting"
        hint="How this client organises their copy."
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Toggle
              label="Uses bullet points"
              value={structure.uses_bullets}
              onChange={(v) => patchStructure({ uses_bullets: v })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {(["short", "medium", "long"] as const).map((len) => (
              <button
                key={len}
                type="button"
                onClick={() =>
                  patchStructure({
                    paragraph_length:
                      structure.paragraph_length === len ? undefined : len,
                  })
                }
                className={`py-2 rounded-lg text-sm capitalize transition-colors ${
                  structure.paragraph_length === len
                    ? "bg-accent text-text-primary"
                    : "bg-raised text-text-muted hover:text-text-primary"
                }`}
              >
                {len} paragraphs
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">
              Email sign-off
            </label>
            <input
              value={structure.email_signoff ?? ""}
              onChange={(e) => patchStructure({ email_signoff: e.target.value })}
              placeholder="e.g. Warmly, / Talk soon, / — Jacob"
              className="w-full bg-page border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">CTA style</label>
            <input
              value={structure.cta_style ?? ""}
              onChange={(e) => patchStructure({ cta_style: e.target.value })}
              placeholder="e.g. End with a question / Single imperative button"
              className="w-full bg-page border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const samplesTab = (
    <div className="space-y-4">
      {samples.length === 0 && !addingSample && (
        <div className="text-center py-16 border border-dashed border-border rounded-[10px]">
          <p className="text-text-muted text-sm mb-3">
            No samples yet. Samples are the highest-weight signal in the context.
          </p>
          <Button variant="secondary" onClick={() => setAddingSample(true)}>
            Add first sample
          </Button>
        </div>
      )}

      {samples.map((s, i) => (
        <div key={i} className="border border-border rounded-[10px] p-4">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-pill font-medium ${
                s.type === "email"
                  ? "bg-accent/15 text-accent"
                  : s.type === "social"
                  ? "bg-raised text-text-muted"
                  : "bg-warn/15 text-warn"
              }`}
            >
              {s.type}
            </span>
            <button
              type="button"
              onClick={() => setSamples((prev) => prev.filter((_, j) => j !== i))}
              className="text-text-muted hover:text-danger text-sm transition-colors"
            >
              Remove
            </button>
          </div>
          <p className="text-sm text-text-muted leading-relaxed line-clamp-4">
            {s.text}
          </p>
        </div>
      ))}

      {addingSample ? (
        <div className="border border-border rounded-[10px] p-5 space-y-4">
          {/* Keyframes for scan sweep + chip entrance */}
          <style>{`
            @keyframes scanLine {
              0%   { transform: translateY(0); opacity: 1; }
              88%  { opacity: 1; }
              100% { transform: translateY(260px); opacity: 0; }
            }
            @keyframes chipIn {
              from { opacity: 0; transform: translateY(8px) scale(.96); }
              to   { opacity: 1; transform: translateY(0)   scale(1);   }
            }
            @media (prefers-reduced-motion: reduce) {
              .me-scan-line { display: none !important; }
            }
          `}</style>

          <p className="text-sm font-medium">New sample</p>
          <div className="flex gap-2">
            {SAMPLE_TYPES.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setNewSampleType(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  newSampleType === o.value
                    ? "bg-accent text-text-primary"
                    : "bg-raised text-text-muted hover:text-text-primary"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Textarea + scan-line overlay */}
          <div className="relative overflow-hidden rounded-lg">
            <textarea
              value={newSampleText}
              onChange={(e) => setNewSampleText(e.target.value)}
              rows={7}
              placeholder="Paste their copy here…"
              disabled={isAnalyzing}
              className={`w-full bg-page border border-border rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors resize-none leading-relaxed${isAnalyzing ? " opacity-50 pointer-events-none" : ""}`}
            />
            {isAnalyzing && (
              <span
                aria-hidden="true"
                className="me-scan-line pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-accent"
                style={{ animation: "scanLine 1.1s linear infinite" }}
              />
            )}
          </div>

          {newSampleTooShort && (
            <p className="text-xs text-warn">
              Paste at least {MIN_SAMPLE_CHARS} characters to analyze patterns.
            </p>
          )}

          {pendingAnalysis && (
            <div className="bg-card/90 border border-border rounded-[10px] p-4 space-y-2">
              <p className="text-xs font-medium text-text-muted">
                Detected — will be merged into Voice tab:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ...(pendingAnalysis.sentence_style.avg_length
                    ? [
                        {
                          key: "avg-length",
                          className:
                            "text-xs bg-raised text-text-primary px-2 py-0.5 rounded-pill",
                          label: `sentences: ${pendingAnalysis.sentence_style.avg_length}`,
                        },
                      ]
                    : []),
                  ...pendingAnalysis.vocab_use.map((v) => ({
                    key: `use-${v}`,
                    className:
                      "text-xs bg-raised text-text-primary px-2 py-0.5 rounded",
                    label: v,
                  })),
                  ...pendingAnalysis.vocab_avoid.map((v) => ({
                    key: `avoid-${v}`,
                    className: "text-xs bg-danger/15 text-danger px-2 py-0.5 rounded",
                    label: `✗ ${v}`,
                  })),
                ].map((chip, i) => (
                  <span
                    key={chip.key}
                    className="inline-block"
                    style={{
                      animation: `chipIn var(--dur-base) var(--ease-spring) ${i * 60}ms both`,
                    }}
                  >
                    <span className={chip.className}>{chip.label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 items-center">
            {!pendingAnalysis ? (
              <Button
                variant="secondary"
                onClick={handleAnalyzeSample}
                disabled={isAnalyzing || !newSampleTrimmed || newSampleTooShort}
              >
                {isAnalyzing ? "Analyzing…" : "Analyze →"}
              </Button>
            ) : (
              <Button variant="secondary" onClick={confirmAddSample}>
                Confirm & save sample
              </Button>
            )}
            <button
              type="button"
              onClick={() => {
                if (newSampleText.trim() && !pendingAnalysis) {
                  confirmAddSample();
                } else {
                  setAddingSample(false);
                  setNewSampleText("");
                  setPendingAnalysis(null);
                }
              }}
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              {newSampleText.trim() && !pendingAnalysis ? "Skip analysis & save" : "Cancel"}
            </button>
          </div>
        </div>
      ) : (
        samples.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => setAddingSample(true)}
            className="w-full justify-center border-dashed"
          >
            + Add another sample
          </Button>
        )
      )}
    </div>
  );

  const rulesTab = (
    <div className="space-y-4">
      <SectionCard
        title="Standing Decisions"
        hint="Standing rules we follow automatically — no need to repeat them each time."
      >
        <div className="space-y-2 mb-3">
          {decisions.length === 0 && (
            <p className="text-xs text-text-muted">No decisions yet.</p>
          )}
          {decisions.map((d, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-raised rounded-lg px-3 py-2.5 text-sm"
            >
              <span className="flex-1 text-text-primary leading-relaxed">{d.detail}</span>
              <button
                type="button"
                onClick={() => setDecisions((prev) => prev.filter((_, j) => j !== i))}
                className="text-text-muted hover:text-danger transition-colors flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newDecision}
            onChange={(e) => setNewDecision(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const note = newDecision.trim();
                if (note) {
                  setDecisions((prev) => [
                    ...prev,
                    { topic: "Manual", detail: note, recorded_at: new Date().toISOString() },
                  ]);
                  setNewDecision("");
                }
              }
            }}
            placeholder="Add a standing decision…"
            className="flex-1 bg-page border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
          />
          <Button
            variant="secondary"
            onClick={() => {
              const note = newDecision.trim();
              if (note) {
                setDecisions((prev) => [
                  ...prev,
                  { topic: "Manual", detail: note, recorded_at: new Date().toISOString() },
                ]);
                setNewDecision("");
              }
            }}
          >
            Add
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Rejected Work"
        hint="Why it was rejected matters more than the rejected text alone."
      >
        <div className="space-y-2 mb-3">
          {rejections.length === 0 && (
            <p className="text-xs text-text-muted">No rejections recorded.</p>
          )}
          {rejections.map((r, i) => (
            <div
              key={i}
              className="bg-raised rounded-lg px-3 py-2.5 text-sm flex gap-2 items-start"
            >
              <div className="flex-1 min-w-0">
                <p className="text-text-muted text-xs line-clamp-2 mb-1">{r.sample}</p>
                <p className="text-danger text-xs">↳ {r.reason}</p>
              </div>
              <button
                type="button"
                onClick={() => setRejections((prev) => prev.filter((_, j) => j !== i))}
                className="text-text-muted hover:text-danger transition-colors flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <textarea
            value={newRejectionSample}
            onChange={(e) => setNewRejectionSample(e.target.value)}
            rows={2}
            placeholder="Paste rejected copy…"
            className="w-full bg-page border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors resize-none"
          />
          <div className="flex gap-2">
            <input
              value={newRejectionReason}
              onChange={(e) => setNewRejectionReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (newRejectionSample.trim() && newRejectionReason.trim()) {
                    setRejections((prev) => [
                      ...prev,
                      { sample: newRejectionSample.trim(), reason: newRejectionReason.trim() },
                    ]);
                    setNewRejectionSample("");
                    setNewRejectionReason("");
                  }
                }
              }}
              placeholder="Why was it rejected? (one sentence)"
              className="flex-1 bg-page border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (newRejectionSample.trim() && newRejectionReason.trim()) {
                  setRejections((prev) => [
                    ...prev,
                    { sample: newRejectionSample.trim(), reason: newRejectionReason.trim() },
                  ]);
                  setNewRejectionSample("");
                  setNewRejectionReason("");
                }
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  return (
    <div>
      {/* Section nav — underline tab bar */}
      <nav className="sticky top-0 z-10 bg-transparent border-b border-border mb-6">
        <div ref={tabsRef} className="relative flex">
          {(
            [
              { id: "voice" as ActiveTab, label: "Voice" },
              {
                id: "samples" as ActiveTab,
                label: samples.length > 0 ? `Samples · ${samples.length}` : "Samples",
              },
              { id: "rules" as ActiveTab, label: "Rules" },
            ]
          ).map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setActiveTab(s.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === s.id
                  ? "text-accent"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {s.label}
            </a>
          ))}
          {/* Sliding underline indicator */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 bg-accent"
            style={{
              height: "1.5px",
              left: indicator.left,
              width: indicator.width,
              transition: `left var(--dur-base) var(--ease-spring), width var(--dur-base) var(--ease-spring)`,
            }}
          />
        </div>
      </nav>

      {/* Voice section */}
      <section id="voice" className="scroll-mt-14">
        {voiceTab}
      </section>

      <hr className="border-border/40 my-8" />

      {/* Samples section */}
      <section id="samples" className="scroll-mt-14">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">
          Samples
        </h2>
        {samplesTab}
      </section>

      <hr className="border-border/40 my-8" />

      {/* Rules section */}
      <section id="rules" className="scroll-mt-14">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">
          Rules
        </h2>
        {rulesTab}
      </section>

      {showPdfUpgrade && (
        <div className="mt-3 bg-raised border border-warn/30 rounded-[10px] px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm">
            PDF export is available on Pro and Agency plans.
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/pricing"
              className="bg-accent text-[#041A12] text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-accent-press transition-colors"
            >
              Upgrade →
            </Link>
            <button
              type="button"
              onClick={() => setShowPdfUpgrade(false)}
              className="text-warn hover:text-text-primary text-sm"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="bg-danger/15 text-danger text-xs border border-border rounded-lg px-3 py-2 mt-3">
          {errorMsg}
        </p>
      )}

      <div className="mt-6 space-y-3">
        <Meter
          value={contextPreview.length}
          max={CONTEXT_CHAR_MAX}
          warn={CONTEXT_CHAR_WARN}
          label="Memory"
        />
        <details className="rounded-[10px] border border-border bg-card/90">
          <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
            Preview context prompt
          </summary>
          <pre className="border-t border-border p-4 text-xs text-text-muted font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto scrollbar-thin">
            {contextPreview || "(add client details above to preview context)"}
          </pre>
        </details>
      </div>

      {/* Save / delete row */}
      <div className="flex items-center justify-between pt-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            disabled={isDeleting}
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-text-muted hover:text-danger"
          >
            {isDeleting ? "Deleting…" : "Delete client"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleExportPdf}
            className="text-xs border border-border hover:border-accent"
          >
            Export PDF
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={isSaving || isSavingMeta || !isDirty}
          >
            {isSaving ? "Saving…" : "Save memory"}
          </Button>
        </div>
      </div>

      {/* Sticky save bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-[var(--dur-base)] ${
          isDirty ? "translate-y-0" : "translate-y-full"
        } bg-card/95 backdrop-blur border-t border-border px-6 py-3 flex items-center justify-between shadow-lift`}
      >
        <span className="text-sm text-warn font-medium">Unsaved changes</span>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Discard
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save memory"}
          </Button>
        </div>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />

      <ConfirmSheet
        open={showDeleteConfirm}
        title="Delete this client?"
        description="This removes all memory and cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          startDeleteTransition(async () => {
            const result = await deleteClient(clientId);
            if (result?.error) addToast(result.error, "danger");
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
