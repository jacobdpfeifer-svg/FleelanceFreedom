"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
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

interface Props {
  clientId: string;
  clientName: string;
  clientIndustry: string;
  memory: ClientMemory | null;
  userPlan: Plan;
}

type Tab = "voice" | "samples" | "rules";

const TABS: { id: Tab; label: string }[] = [
  { id: "voice", label: "Voice" },
  { id: "samples", label: "Samples" },
  { id: "rules", label: "Rules" },
];

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
  colorClass = "bg-warm-taupe/50 text-warm-olive",
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
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${colorClass}`}
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
          className="flex-1 bg-warm-cream border border-warm-taupe rounded-lg px-3 py-2 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 text-sm bg-warm-taupe/50 hover:bg-warm-taupe text-warm-olive rounded-lg transition-colors"
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
    <div className="border border-warm-taupe rounded-xl p-5">
      <div className="mb-3">
        <h3 className="font-medium text-sm">{title}</h3>
        {hint && <p className="text-xs text-warm-olive/50 mt-0.5">{hint}</p>}
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
      className="w-full bg-warm-cream border border-warm-taupe rounded-lg px-3 py-2.5 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors resize-none leading-relaxed"
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
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
          value ? "bg-warm-olive" : "bg-warm-taupe/50"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            value ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-sm text-warm-olive/90 group-hover:text-warm-olive transition-colors">
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
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("voice");

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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPdfUpgrade, setShowPdfUpgrade] = useState(false);

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

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const t = setTimeout(() => setSaveStatus("idle"), 2000);
    return () => clearTimeout(t);
  }, [saveStatus]);

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
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor || anchor.target === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (
        !window.confirm(
          "You have unsaved memory changes. Leave without saving?"
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty]);

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
        setSaveStatus("error");
      } else {
        setSavedSnapshot(currentSnapshot);
        setSaveStatus("saved");
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
    setActiveTab("voice");
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
            <label className="block text-xs text-warm-olive/60 mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleMetaSave}
              className="w-full bg-warm-cream border border-warm-taupe rounded-lg px-3 py-2 text-sm text-warm-olive focus:outline-none focus:border-warm-olive transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-warm-olive/60 mb-1.5">Industry</label>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              onBlur={handleMetaSave}
              placeholder="e.g. SaaS, fintech…"
              className="w-full bg-warm-cream border border-warm-taupe rounded-lg px-3 py-2 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors"
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
          colorClass="bg-warm-taupe/40 text-warm-olive"
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
          colorClass="bg-warm-cream text-warm-olive"
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
          colorClass="bg-red-100 text-red-800"
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
                    ? "bg-warm-olive text-warm-ivory"
                    : "bg-warm-cream text-warm-olive/60 hover:text-warm-olive"
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
                    ? "bg-warm-olive text-warm-ivory"
                    : "bg-warm-cream text-warm-olive/60 hover:text-warm-olive"
                }`}
              >
                {len} paragraphs
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs text-warm-olive/60 mb-1.5">
              Email sign-off
            </label>
            <input
              value={structure.email_signoff ?? ""}
              onChange={(e) => patchStructure({ email_signoff: e.target.value })}
              placeholder="e.g. Warmly, / Talk soon, / — Jacob"
              className="w-full bg-warm-cream border border-warm-taupe rounded-lg px-3 py-2 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-warm-olive/60 mb-1.5">CTA style</label>
            <input
              value={structure.cta_style ?? ""}
              onChange={(e) => patchStructure({ cta_style: e.target.value })}
              placeholder="e.g. End with a question / Single imperative button"
              className="w-full bg-warm-cream border border-warm-taupe rounded-lg px-3 py-2 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const samplesTab = (
    <div className="space-y-4">
      {samples.length === 0 && !addingSample && (
        <div className="text-center py-16 border border-dashed border-warm-taupe rounded-xl">
          <p className="text-warm-olive/50 text-sm mb-3">
            No samples yet. Samples are the highest-weight signal in the context.
          </p>
          <button
            type="button"
            onClick={() => setAddingSample(true)}
            className="bg-warm-olive hover:bg-brand-dark text-warm-ivory px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Add first sample
          </button>
        </div>
      )}

      {samples.map((s, i) => (
        <div key={i} className="border border-warm-taupe rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                s.type === "email"
                  ? "bg-blue-900/40 text-blue-300"
                  : s.type === "social"
                  ? "bg-purple-900/40 text-purple-300"
                  : "bg-amber-900/40 text-amber-300"
              }`}
            >
              {s.type}
            </span>
            <button
              type="button"
              onClick={() => setSamples((prev) => prev.filter((_, j) => j !== i))}
              className="text-warm-olive/50 hover:text-red-400 text-sm transition-colors"
            >
              Remove
            </button>
          </div>
          <p className="text-sm text-warm-olive/60 leading-relaxed line-clamp-4">
            {s.text}
          </p>
        </div>
      ))}

      {addingSample ? (
        <div className="border border-warm-taupe rounded-xl p-5 space-y-4">
          <p className="text-sm font-medium">New sample</p>
          <div className="flex gap-2">
            {SAMPLE_TYPES.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setNewSampleType(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  newSampleType === o.value
                    ? "bg-warm-olive text-warm-ivory"
                    : "bg-warm-cream text-warm-olive/60 hover:text-warm-olive"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <textarea
            value={newSampleText}
            onChange={(e) => setNewSampleText(e.target.value)}
            rows={7}
            placeholder="Paste their copy here…"
            className="w-full bg-warm-cream border border-warm-taupe rounded-lg px-3 py-2.5 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors resize-none leading-relaxed"
          />

          {newSampleTooShort && (
            <p className="text-xs text-amber-800">
              Paste at least {MIN_SAMPLE_CHARS} characters to analyze patterns.
            </p>
          )}

          {pendingAnalysis && (
            <div className="bg-white/90 border border-warm-taupe rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-warm-olive/60">
                Detected — will be merged into Voice tab:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {pendingAnalysis.sentence_style.avg_length && (
                  <span className="text-xs bg-warm-cream text-warm-olive/90 px-2 py-0.5 rounded-full">
                    sentences: {pendingAnalysis.sentence_style.avg_length}
                  </span>
                )}
                {pendingAnalysis.vocab_use.map((v) => (
                  <span
                    key={v}
                    className="text-xs bg-warm-cream text-warm-olive px-2 py-0.5 rounded"
                  >
                    {v}
                  </span>
                ))}
                {pendingAnalysis.vocab_avoid.map((v) => (
                  <span
                    key={v}
                    className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded"
                  >
                    ✗ {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {!pendingAnalysis ? (
              <button
                type="button"
                onClick={handleAnalyzeSample}
                disabled={
                  isAnalyzing || !newSampleTrimmed || newSampleTooShort
                }
                className="bg-warm-olive hover:bg-brand-dark disabled:opacity-40 text-warm-ivory px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isAnalyzing ? "Analyzing…" : "Analyze →"}
              </button>
            ) : (
              <button
                type="button"
                onClick={confirmAddSample}
                className="bg-warm-olive hover:bg-brand-dark text-warm-ivory px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Confirm & save sample
              </button>
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
              className="text-sm text-warm-olive/50 hover:text-warm-olive/90 transition-colors"
            >
              {newSampleText.trim() && !pendingAnalysis ? "Skip analysis & save" : "Cancel"}
            </button>
          </div>
        </div>
      ) : (
        samples.length > 0 && (
          <button
            type="button"
            onClick={() => setAddingSample(true)}
            className="w-full border border-dashed border-warm-taupe hover:border-warm-olive/40 text-warm-olive/50 hover:text-warm-olive/90 rounded-xl py-3 text-sm transition-colors"
          >
            + Add another sample
          </button>
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
            <p className="text-xs text-warm-olive/50">No decisions yet.</p>
          )}
          {decisions.map((d, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-warm-cream rounded-lg px-3 py-2.5 text-sm"
            >
              <span className="flex-1 text-warm-olive leading-relaxed">{d.detail}</span>
              <button
                type="button"
                onClick={() => setDecisions((prev) => prev.filter((_, j) => j !== i))}
                className="text-warm-olive/50 hover:text-red-400 transition-colors flex-shrink-0"
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
            className="flex-1 bg-warm-cream border border-warm-taupe rounded-lg px-3 py-2 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors"
          />
          <button
            type="button"
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
            className="px-3 py-2 text-sm bg-warm-taupe/50 hover:bg-warm-taupe text-warm-olive rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Rejected Work"
        hint="Why it was rejected matters more than the rejected text alone."
      >
        <div className="space-y-2 mb-3">
          {rejections.length === 0 && (
            <p className="text-xs text-warm-olive/50">No rejections recorded.</p>
          )}
          {rejections.map((r, i) => (
            <div
              key={i}
              className="bg-warm-cream rounded-lg px-3 py-2.5 text-sm flex gap-2 items-start"
            >
              <div className="flex-1 min-w-0">
                <p className="text-warm-olive/60 text-xs line-clamp-2 mb-1">{r.sample}</p>
                <p className="text-red-400 text-xs">↳ {r.reason}</p>
              </div>
              <button
                type="button"
                onClick={() => setRejections((prev) => prev.filter((_, j) => j !== i))}
                className="text-warm-olive/50 hover:text-red-400 transition-colors flex-shrink-0"
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
            className="w-full bg-warm-cream border border-warm-taupe rounded-lg px-3 py-2 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors resize-none"
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
              className="flex-1 bg-warm-cream border border-warm-taupe rounded-lg px-3 py-2 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors"
            />
            <button
              type="button"
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
              className="px-3 py-2 text-sm bg-warm-taupe/50 hover:bg-warm-taupe text-warm-olive rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div className="flex gap-1 bg-white/90 border border-warm-taupe rounded-xl p-1 mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id
                ? "bg-warm-olive text-warm-ivory"
                : "text-warm-olive/60 hover:text-warm-olive"
            }`}
          >
            {t.label}
            {t.id === "samples" && samples.length > 0 && (
              <span className="ml-1.5 text-xs text-warm-olive/50">
                {samples.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === "voice" && voiceTab}
        {activeTab === "samples" && samplesTab}
        {activeTab === "rules" && rulesTab}
      </div>

      <div className="mt-6 bg-white/90 border border-warm-taupe rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-warm-taupe">
          <span className="text-xs font-medium text-warm-olive/60">
            Context size
          </span>
          <span
            className={`text-xs font-mono ${
              contextPreview.length >= CONTEXT_CHAR_WARN
                ? "text-amber-600"
                : "text-warm-olive/50"
            }`}
          >
            {contextPreview.length}/{CONTEXT_CHAR_MAX}
          </span>
        </div>
        <pre className="text-xs text-warm-olive/60 font-mono whitespace-pre-wrap leading-relaxed p-4 max-h-36 overflow-y-auto scrollbar-thin">
          {contextPreview || "(add client details above to preview context)"}
        </pre>
      </div>

      {showPdfUpgrade && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-900">
            PDF export is available on Pro and Agency plans.
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/pricing"
              className="bg-amber-500 hover:bg-amber-400 text-warm-olive px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              Upgrade →
            </Link>
            <button
              type="button"
              onClick={() => setShowPdfUpgrade(false)}
              className="text-amber-700 hover:text-amber-900 text-sm"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="text-red-800 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
          {errorMsg}
        </p>
      )}

      {/* Save / delete row */}
      <div className="flex items-center justify-between pt-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              if (
                confirm(
                  "Delete this client and all their memory? This cannot be undone."
                )
              ) {
                startDeleteTransition(async () => {
                  const result = await deleteClient(clientId);
                  if (result?.error) {
                    setErrorMsg(result.error);
                  }
                });
              }
            }}
            className="text-xs text-warm-olive/50 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete client"}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="text-xs text-warm-olive/60 hover:text-warm-olive border border-warm-taupe hover:border-warm-olive/40 px-3 py-1.5 rounded-lg transition-colors"
          >
            Export PDF
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-amber-700">Unsaved changes</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isSavingMeta || !isDirty}
            className="bg-warm-olive hover:bg-brand-dark disabled:opacity-50 text-warm-ivory px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {isSaving
              ? "Saving…"
              : saveStatus === "saved"
              ? "Saved ✓"
              : "Save memory"}
          </button>
        </div>
      </div>
    </div>
  );
}
