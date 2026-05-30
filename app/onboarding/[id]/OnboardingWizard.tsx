"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMemory } from "@/app/clients/[id]/actions";
import { MIN_SAMPLE_CHARS } from "@/lib/sampleConstants";
import type {
  AnalysisResult,
  Decision,
  Rejection,
  Sample,
  SampleType,
  SentenceStyle,
  Structure,
} from "@/lib/types";

interface Props {
  clientId: string;
  clientName: string;
  clientIndustry: string;
}

type AvgLength = "short" | "medium" | "long";

interface WizardData {
  samples: Sample[];
  vocab_use: string[];
  vocab_avoid: string[];
  sentence_style: SentenceStyle;
  structure: Structure;
  audience_profile: string;
  rejections: Rejection[];
  decisions: Decision[];
}

const STEP_LABELS = [
  "First sample",
  "Second sample",
  "Vocabulary",
  "Audience",
  "Rejection",
  "Standing rule",
];

// ── small helpers ────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-warm-olive/60">
          Step {step} of {total}
        </span>
        <span className="text-xs text-warm-olive/50">{STEP_LABELS[step - 1]}</span>
      </div>
      <div className="h-1 bg-warm-cream rounded-full">
        <div
          className="h-1 bg-warm-olive rounded-full transition-all duration-500"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function StyleFlag({ label, value }: { label: string; value: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-mono ${
        value
          ? "bg-emerald-100 text-emerald-800"
          : "bg-warm-cream text-warm-olive/50"
      }`}
    >
      {value ? "✓" : "—"} {label}
    </span>
  );
}

function AnalysisPreview({ result }: { result: AnalysisResult }) {
  const s = result.sentence_style;
  return (
    <div className="bg-white/90 border border-warm-taupe rounded-xl p-4 mt-4 space-y-3">
      <p className="text-xs font-medium text-warm-olive/60 uppercase tracking-wide">
        What we noticed
      </p>
      <div className="flex flex-wrap gap-2">
        {s.avg_length && (
          <StyleFlag label={`sentences: ${s.avg_length}`} value={true} />
        )}
        <StyleFlag label="em-dash" value={!!s.uses_emdash} />
        <StyleFlag label="opens with question" value={!!s.opens_with_question} />
        <StyleFlag label="oxford comma" value={s.oxford_comma !== false} />
        <StyleFlag label="exclamation points" value={!!s.exclamation_points} />
        <StyleFlag label="first person" value={!!s.first_person} />
      </div>
      {result.vocab_use.length > 0 && (
        <div>
          <p className="text-xs text-warm-olive/50 mb-1">Characteristic words</p>
          <div className="flex flex-wrap gap-1.5">
            {result.vocab_use.map((v) => (
              <span
                key={v}
                className="text-xs bg-warm-cream text-warm-olive px-2 py-0.5 rounded"
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
      {result.vocab_avoid.length > 0 && (
        <div>
          <p className="text-xs text-warm-olive/50 mb-1">Words to avoid</p>
          <div className="flex flex-wrap gap-1.5">
            {result.vocab_avoid.map((v) => (
              <span
                key={v}
                className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded"
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── main wizard ──────────────────────────────────────────────────────────────

export default function OnboardingWizard({
  clientId,
  clientName,
  clientIndustry,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Per-step inputs
  const [sampleText1, setSampleText1] = useState("");
  const [sampleType1, setSampleType1] = useState<SampleType>("email");
  const [analysis1, setAnalysis1] = useState<AnalysisResult | null>(null);

  const [sampleText2, setSampleText2] = useState("");
  const [sampleType2, setSampleType2] = useState<SampleType>("social");
  const [analysis2, setAnalysis2] = useState<AnalysisResult | null>(null);

  const [vocabUseDraft, setVocabUseDraft] = useState("");
  const [vocabAvoidDraft, setVocabAvoidDraft] = useState("");

  const [audience, setAudience] = useState("");

  const [rejectionSample, setRejectionSample] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const [decisionNote, setDecisionNote] = useState("");

  // Accumulated data
  const [data, setData] = useState<WizardData>({
    samples: [],
    vocab_use: [],
    vocab_avoid: [],
    sentence_style: {},
    structure: {},
    audience_profile: "",
    rejections: [],
    decisions: [],
  });

  async function runAnalysis(text: string): Promise<AnalysisResult | null> {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = (await res.json()) as AnalysisResult & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }

  function mergeAnalysis(a: AnalysisResult, b: AnalysisResult): AnalysisResult {
    return {
      sentence_style: { ...a.sentence_style, ...b.sentence_style },
      vocab_use: Array.from(new Set([...a.vocab_use, ...b.vocab_use])).slice(0, 10),
      vocab_avoid: Array.from(new Set([...a.vocab_avoid, ...b.vocab_avoid])).slice(0, 8),
    };
  }

  function splitVocab(raw: string): string[] {
    return raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ── Step handlers ──────────────────────────────────────────────────────────

  async function handleStep1Analyze() {
    if (!sampleText1.trim()) return;
    const result = await runAnalysis(sampleText1);
    if (result) setAnalysis1(result);
  }

  function confirmStep1() {
    if (analysis1) {
      setData((d) => ({
        ...d,
        samples: [{ type: sampleType1, text: sampleText1 }, ...d.samples],
        sentence_style: { ...d.sentence_style, ...analysis1.sentence_style },
        vocab_use: Array.from(new Set([...d.vocab_use, ...analysis1.vocab_use])),
        vocab_avoid: Array.from(new Set([...d.vocab_avoid, ...analysis1.vocab_avoid])),
      }));
    } else if (sampleText1.trim()) {
      setData((d) => ({
        ...d,
        samples: [{ type: sampleType1, text: sampleText1 }, ...d.samples],
      }));
    }
    setStep(2);
  }

  async function handleStep2Analyze() {
    if (!sampleText2.trim()) return;
    const result = await runAnalysis(sampleText2);
    if (result) setAnalysis2(result);
  }

  function confirmStep2() {
    if (!analysis2) {
      // Allow skipping analysis — just save the sample
      if (sampleText2.trim()) {
        setData((d) => ({
          ...d,
          samples: [...d.samples, { type: sampleType2, text: sampleText2 }],
        }));
      }
      setStep(3);
      return;
    }
    const merged = analysis1 ? mergeAnalysis(analysis1, analysis2) : analysis2;
    setData((d) => ({
      ...d,
      samples: [...d.samples, { type: sampleType2, text: sampleText2 }],
      sentence_style: merged.sentence_style,
      vocab_use: Array.from(new Set([...d.vocab_use, ...merged.vocab_use])),
      vocab_avoid: Array.from(new Set([...d.vocab_avoid, ...merged.vocab_avoid])),
    }));
    setStep(3);
  }

  function confirmStep3() {
    const use = splitVocab(vocabUseDraft);
    const avoid = splitVocab(vocabAvoidDraft);
    setData((d) => ({
      ...d,
      vocab_use: Array.from(new Set([...d.vocab_use, ...use])).slice(0, 12),
      vocab_avoid: Array.from(new Set([...d.vocab_avoid, ...avoid])).slice(0, 10),
    }));
    setStep(4);
  }

  function confirmStep4() {
    setData((d) => ({ ...d, audience_profile: audience.trim() }));
    setStep(5);
  }

  function confirmStep5() {
    if (rejectionSample.trim() && rejectionReason.trim()) {
      setData((d) => ({
        ...d,
        rejections: [
          ...d.rejections,
          { sample: rejectionSample.trim(), reason: rejectionReason.trim() },
        ],
      }));
    }
    setStep(6);
  }

  function confirmStep6() {
    const note = decisionNote.trim();
    const finalDecisions = note
      ? [
          ...data.decisions,
          {
            topic: "Onboarding",
            detail: note,
            recorded_at: new Date().toISOString(),
          },
        ]
      : data.decisions;

    startSaveTransition(async () => {
      const result = await saveMemory(clientId, {
        samples: data.samples,
        vocab_use: data.vocab_use,
        vocab_avoid: data.vocab_avoid,
        sentence_style: data.sentence_style,
        audience_profile: data.audience_profile,
        rejections: data.rejections,
        decisions: finalDecisions,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/clients/${clientId}/chat`);
    });
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  const sampleTypeOptions: { value: SampleType; label: string }[] = [
    { value: "email", label: "Email" },
    { value: "social", label: "Social post" },
    { value: "longform", label: "Long-form / blog" },
  ];

  function SampleStep({
    stepNum,
    title,
    hint,
    text,
    setText,
    type,
    setType,
    analysis,
    onAnalyze,
    onConfirm,
    canSkip,
  }: {
    stepNum: number;
    title: string;
    hint: string;
    text: string;
    setText: (v: string) => void;
    type: SampleType;
    setType: (v: SampleType) => void;
    analysis: AnalysisResult | null;
    onAnalyze: () => void;
    onConfirm: () => void;
    canSkip?: boolean;
  }) {
    const trimmed = text.trim();
    const tooShort = trimmed.length > 0 && trimmed.length < MIN_SAMPLE_CHARS;

    return (
      <div>
        <h2 className="text-xl font-bold mb-1">{title}</h2>
        <p className="text-warm-olive/60 text-sm mb-6">{hint}</p>

        <div className="flex gap-2 mb-3">
          {sampleTypeOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setType(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                type === o.value
                  ? "bg-warm-olive text-warm-ivory"
                  : "bg-warm-cream text-warm-olive/60 hover:text-warm-olive"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Paste their copy here…"
          className="w-full bg-white/90 border border-warm-taupe rounded-xl px-4 py-3 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors resize-none leading-relaxed"
        />

        {tooShort && (
          <p className="text-xs text-amber-800 mt-2">
            Paste at least {MIN_SAMPLE_CHARS} characters to analyze patterns.
          </p>
        )}

        {analysis && <AnalysisPreview result={analysis} />}

        <div className="flex items-center gap-3 mt-6">
          {!analysis ? (
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing || !trimmed || tooShort}
              className="bg-warm-olive hover:bg-brand-dark disabled:opacity-40 text-warm-ivory px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {isAnalyzing ? "Analyzing…" : "Analyze sample →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              className="bg-warm-olive hover:bg-brand-dark text-warm-ivory px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Confirm & continue →
            </button>
          )}
          {canSkip && (
            <button
              type="button"
              onClick={onConfirm}
              className="text-sm text-warm-olive/50 hover:text-warm-olive/90 transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-warm-ivory flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-warm-olive flex items-center justify-center text-warm-ivory font-bold text-xs">
              FF
            </div>
            <span className="text-sm text-warm-olive/60">
              Setting up voice for{" "}
              <span className="text-warm-olive">{clientName}</span>
              {clientIndustry ? ` · ${clientIndustry}` : ""}
            </span>
          </div>
          <ProgressBar step={step} total={6} />
        </div>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <SampleStep
            stepNum={1}
            title="Paste their best piece of copy."
            hint="Any format — email, post, article. The more representative, the better."
            text={sampleText1}
            setText={setSampleText1}
            type={sampleType1}
            setType={setSampleType1}
            analysis={analysis1}
            onAnalyze={handleStep1Analyze}
            onConfirm={confirmStep1}
            canSkip
          />
        )}

        {/* Step 2 */}
        {step === 2 && (
          <SampleStep
            stepNum={2}
            title="Paste a second sample."
            hint="A different format if possible — this cross-validates the patterns we detected."
            text={sampleText2}
            setText={setSampleText2}
            type={sampleType2}
            setType={setSampleType2}
            analysis={analysis2}
            onAnalyze={handleStep2Analyze}
            onConfirm={confirmStep2}
            canSkip
          />
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-1">
              List words they love and words they'd never use.
            </h2>
            <p className="text-warm-olive/60 text-sm mb-6">
              Comma or line-separated. These override anything we detect from your samples.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Words / phrases they always use
                  <span className="text-warm-olive/50 font-normal ml-2">(up to 12)</span>
                </label>
                <textarea
                  value={vocabUseDraft}
                  onChange={(e) => setVocabUseDraft(e.target.value)}
                  rows={3}
                  placeholder="e.g. no-brainer, let's be honest, the truth is, quietly, relentlessly"
                  className="w-full bg-white/90 border border-warm-taupe rounded-xl px-4 py-3 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Words they'd never use
                  <span className="text-warm-olive/50 font-normal ml-2">(up to 10)</span>
                </label>
                <textarea
                  value={vocabAvoidDraft}
                  onChange={(e) => setVocabAvoidDraft(e.target.value)}
                  rows={3}
                  placeholder="e.g. synergy, leverage, game-changer, disruptive, unlock"
                  className="w-full bg-white/90 border border-warm-taupe rounded-xl px-4 py-3 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors resize-none"
                />
              </div>
            </div>

            {/* Preview what we already have from analysis */}
            {(data.vocab_use.length > 0 || data.vocab_avoid.length > 0) && (
              <div className="mt-4 bg-white/90 border border-warm-taupe rounded-xl p-4">
                <p className="text-xs text-warm-olive/50 mb-2">
                  Already found in your samples — these will be merged:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.vocab_use.map((v) => (
                    <span key={v} className="text-xs bg-warm-cream text-warm-olive px-2 py-0.5 rounded">
                      {v}
                    </span>
                  ))}
                  {data.vocab_avoid.map((v) => (
                    <span key={v} className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                      ✗ {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={confirmStep3}
                className="bg-warm-olive hover:bg-brand-dark text-warm-ivory px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Continue →
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-sm text-warm-olive/50 hover:text-warm-olive/90 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Describe their reader in one sentence.</h2>
            <p className="text-warm-olive/60 text-sm mb-6">
              Who is the copy actually for? It will read as if written directly for this person.
            </p>
            <textarea
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              rows={3}
              placeholder="e.g. Solo founders aged 28–40 who are tired of over-engineered software and just want things to work."
              className="w-full bg-white/90 border border-warm-taupe rounded-xl px-4 py-3 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors resize-none leading-relaxed"
            />
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={confirmStep4}
                disabled={!audience.trim()}
                className="bg-warm-olive hover:bg-brand-dark disabled:opacity-40 text-warm-ivory px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Continue →
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="text-sm text-warm-olive/50 hover:text-warm-olive/90 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <div>
            <h2 className="text-xl font-bold mb-1">Paste something they rejected.</h2>
            <p className="text-warm-olive/60 text-sm mb-6">
              What didn't work teaches us more than guidelines alone.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-warm-olive/60 mb-1.5">Rejected copy</label>
                <textarea
                  value={rejectionSample}
                  onChange={(e) => setRejectionSample(e.target.value)}
                  rows={4}
                  placeholder="Paste the copy they shot down…"
                  className="w-full bg-white/90 border border-warm-taupe rounded-xl px-4 py-3 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors resize-none leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs text-warm-olive/60 mb-1.5">
                  Why they rejected it <span className="text-warm-olive/40">(one sentence)</span>
                </label>
                <input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Too corporate — felt like a press release, not a human."
                  className="w-full bg-white/90 border border-warm-taupe rounded-xl px-4 py-3 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={confirmStep5}
                disabled={!rejectionSample.trim() || !rejectionReason.trim()}
                className="bg-warm-olive hover:bg-brand-dark disabled:opacity-40 text-warm-ivory px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Continue →
              </button>
              <button
                type="button"
                onClick={() => setStep(6)}
                className="text-sm text-warm-olive/50 hover:text-warm-olive/90 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Step 6 */}
        {step === 6 && (
          <div>
            <h2 className="text-xl font-bold mb-1">
              What's one content rule you'll never break for this client?
            </h2>
            <p className="text-warm-olive/60 text-sm mb-6">
              This goes into standing decisions — we'll follow it automatically, no need to repeat it.
            </p>
            <input
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmStep6();
              }}
              placeholder="e.g. Always end every piece with a direct question to the reader."
              className="w-full bg-white/90 border border-warm-taupe rounded-xl px-4 py-3 text-sm text-warm-olive placeholder-warm-olive/40 focus:outline-none focus:border-warm-olive transition-colors"
            />

            {/* Summary of what will be saved */}
            <div className="mt-6 bg-white/90 border border-warm-taupe rounded-xl p-5 space-y-3">
              <p className="text-xs font-medium text-warm-olive/60 uppercase tracking-wide">
                What gets saved
              </p>
              <div className="space-y-1.5 text-sm text-warm-olive/90">
                <p>
                  <span className="text-warm-olive/50 w-28 inline-block">Samples</span>
                  {data.samples.length} piece{data.samples.length !== 1 ? "s" : ""}
                </p>
                <p>
                  <span className="text-warm-olive/50 w-28 inline-block">Use vocab</span>
                  {data.vocab_use.length > 0 ? data.vocab_use.join(", ") : "—"}
                </p>
                <p>
                  <span className="text-warm-olive/50 w-28 inline-block">Avoid vocab</span>
                  {data.vocab_avoid.length > 0 ? data.vocab_avoid.join(", ") : "—"}
                </p>
                <p>
                  <span className="text-warm-olive/50 w-28 inline-block">Audience</span>
                  {data.audience_profile || "—"}
                </p>
                <p>
                  <span className="text-warm-olive/50 w-28 inline-block">Rejections</span>
                  {data.rejections.length} item{data.rejections.length !== 1 ? "s" : ""}
                </p>
                {decisionNote.trim() && (
                  <p>
                    <span className="text-warm-olive/50 w-28 inline-block">Rule</span>
                    {decisionNote.trim()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={confirmStep6}
                disabled={isSaving}
                className="bg-warm-olive hover:bg-brand-dark disabled:opacity-50 text-warm-ivory px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {isSaving ? "Saving…" : "Finish — open chat →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
