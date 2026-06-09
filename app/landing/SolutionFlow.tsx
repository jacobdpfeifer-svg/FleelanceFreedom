"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import MemoryProfile from "./MemoryProfile";

const SAMPLES = [
  {
    quote:
      "\"It's here. Our new tool ships today — three things it does better, nothing it doesn't.\"",
    meta: "// pasted from a launch email · 19 words",
  },
  {
    quote:
      "\"Honestly? We almost didn't build this. Glad we did. Here's the thing it fixes.\"",
    meta: "// pasted from a blog intro · 15 words",
  },
  {
    quote:
      "\"Quick one — your draft's ready. Two changes from last time, both small. Take a look.\"",
    meta: "// pasted from a client DM · 17 words",
  },
];

const DECISIONS = [
  { tag: "KEPT", text: "\"It's live.\" as an opener — you approved it twice." },
  { tag: "DROPPED", text: "\"We're thrilled to share\" — you've rejected it 3×." },
  { tag: "KEPT", text: "Short two-line paragraphs over one long block." },
];

const OUTPUT =
  "It's live. We kept it simple — here's what's new and why it matters to you. Take a look when you've got a minute.";

function Step({
  number,
  kicker,
  isLast = false,
  children,
}: {
  number: number;
  kicker: string;
  isLast?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-[18px]">
      <div className="flex shrink-0 flex-col items-center">
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[#1A3326] bg-[#07100C] font-mono text-[10px] text-accent">
          {number}
        </div>
        {!isLast && <div className="my-1 w-px flex-1 bg-[#0F1F17]" />}
      </div>

      <div className="mb-1 min-w-0 flex-1 rounded-[12px] border border-[#0F1F17] bg-[#07100C] px-5 py-[18px]">
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#2A4A3A]">
          {kicker}
        </p>
        {children}
      </div>
    </div>
  );
}

function SampleStep() {
  const [activeSample, setActiveSample] = useState(0);
  const sample = SAMPLES[activeSample];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSample((current) => (current + 1) % SAMPLES.length);
    }, 2600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <div className="mb-3 flex items-center gap-1.5">
        {SAMPLES.map((item, index) => {
          const active = index === activeSample;

          return (
            <button
              key={item.meta}
              type="button"
              onClick={() => setActiveSample(index)}
              className={`cursor-pointer rounded-[6px] border px-[11px] py-1 font-mono text-[10px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                active
                  ? "border-[#1A4030] bg-[#0F2A20] text-[#4ECDA8]"
                  : "border-[#14271D] bg-transparent text-[#2A4A3A]"
              }`}
            >
              sample {index + 1}
            </button>
          );
        })}
        <span className="ml-auto font-mono text-[10px] text-[#234034]">+ add</span>
      </div>

      <p className="min-h-[52px] text-[12px] italic leading-[1.6] text-[#6A9888]">
        {sample.quote}
      </p>
      <p className="mt-2 font-mono text-[9px] text-[#234034]">{sample.meta}</p>
    </>
  );
}

function DecisionRows({ visible }: { visible: boolean }) {
  return (
    <div className="space-y-2">
      {DECISIONS.map((decision, index) => {
        const kept = decision.tag === "KEPT";

        return (
          <div
            key={decision.text}
            className="flex items-start gap-2 text-[10px] leading-[1.6]"
            style={
              visible
                ? {
                    animationName: "decIn",
                    animationDuration: "var(--dur-base)",
                    animationTimingFunction: "var(--ease-out)",
                    animationFillMode: "both",
                    animationDelay: `${index * 350}ms`,
                  }
                : { opacity: 0 }
            }
          >
            <span
              className={`shrink-0 rounded-[4px] px-[6px] py-[2px] font-mono text-[8px] tracking-[0.05em] ${
                kept ? "bg-[#0F2A20] text-[#4ECDA8]" : "bg-[#2A1414] text-[#DD8888]"
              }`}
            >
              {decision.tag}
            </span>
            <span className="text-text-muted">{decision.text}</span>
          </div>
        );
      })}
    </div>
  );
}

function OutputStep({ typedOutput }: { typedOutput: string }) {
  const isTyping = typedOutput.length < OUTPUT.length;

  return (
    <>
      <p className="text-[13px] leading-[1.65] text-[#B0D8CC]">
        {typedOutput}
        {isTyping && (
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "14px",
              background: "var(--accent)",
              verticalAlign: "-2px",
              animation: "blink 0.9s step-end infinite",
            }}
          />
        )}
      </p>

      <div className="mt-3 flex flex-wrap gap-[14px]">
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-accent">
          <span className="h-[5px] w-[5px] rounded-full bg-accent" />
          voice match 96%
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-muted">
          <span className="h-[5px] w-[5px] rounded-full bg-text-muted" />
          built from 3 samples + 14 decisions
        </span>
      </div>
    </>
  );
}

export default function SolutionFlow() {
  const [animKey, setAnimKey] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [decVisible, setDecVisible] = useState(true);
  const [typedOutput, setTypedOutput] = useState(OUTPUT);

  useEffect(() => {
    const timeouts: number[] = [];
    const intervals: number[] = [];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsAnimating(false);
      setDecVisible(true);
      setTypedOutput(OUTPUT);
      return;
    }

    const startTyping = () => {
      let count = 0;
      setTypedOutput("");

      const typingTimer = window.setInterval(() => {
        count += 1;
        setTypedOutput(OUTPUT.slice(0, count));

        if (count >= OUTPUT.length) {
          window.clearInterval(typingTimer);
        }
      }, 28);

      intervals.push(typingTimer);
    };

    const runCycle = () => {
      setAnimKey((current) => current + 1);
      setIsAnimating(true);
      setDecVisible(false);
      setTypedOutput("");

      timeouts.push(window.setTimeout(() => setDecVisible(true), 1400));
      timeouts.push(window.setTimeout(startTyping, 3000));
    };

    runCycle();
    intervals.push(window.setInterval(runCycle, 9000));

    return () => {
      timeouts.forEach(window.clearTimeout);
      intervals.forEach(window.clearInterval);
    };
  }, []);

  return (
    <section className="px-6 py-16">
      <div className="mb-12 text-center">
        <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          How it works
        </p>
        <h2 className="mx-auto max-w-[460px] text-center text-2xl font-bold leading-[1.2] tracking-[-0.02em] text-[#DCF2EA] md:text-3xl">
          It learns from real writing — not a settings form.
        </h2>
        <p className="mx-auto mt-3 max-w-[380px] text-center text-sm text-text-muted">
          Feed it samples. It builds a living profile of how each client sounds, then writes
          from it.
        </p>
      </div>

      <div className="mx-auto flex max-w-[580px] flex-col gap-[14px]">
        <Step number={1} kicker="Add as many samples as you like">
          <SampleStep />
        </Step>

        <Step number={2} kicker="It builds a living memory profile">
          <MemoryProfile animate={isAnimating} animationKey={animKey} />
        </Step>

        <Step number={3} kicker="Every edit teaches it — decision history">
          <DecisionRows visible={decVisible} />
        </Step>

        <Step number={4} kicker="Generate — and it sounds like them" isLast>
          <OutputStep typedOutput={typedOutput} />
        </Step>
      </div>
    </section>
  );
}
