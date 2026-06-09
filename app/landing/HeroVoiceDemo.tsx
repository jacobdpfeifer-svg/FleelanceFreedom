"use client";

import { useEffect, useState } from "react";

const VOICES = [
  {
    av: "AC",
    name: "Acme Corp",
    tag: "direct · no jargon",
    avBg: "#0D2E22",
    avText: "#4ECDA8",
    body: "It's here. Our new release ships today — three things it does better, nothing it doesn't.",
  },
  {
    av: "NV",
    name: "Nova Studio",
    tag: "warm · playful",
    avBg: "#2E1A0D",
    avText: "#E0975A",
    body: "Okay, we're a little obsessed. It's finally live, and honestly? We can't stop smiling.",
  },
  {
    av: "RX",
    name: "Rexford & Co",
    tag: "formal · refined",
    avBg: "#1A1A2E",
    avText: "#8B92D8",
    body: "We are pleased to announce the availability of our latest release, effective today.",
  },
];

export default function HeroVoiceDemo() {
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [charCount, setCharCount] = useState(VOICES[0].body.length);
  const [fading, setFading] = useState(false);
  const voice = VOICES[voiceIndex];
  const isTyping = charCount < voice.body.length;

  useEffect(() => {
    let count = 0;
    let typingTimer: number | undefined;
    let holdTimer: number | undefined;
    let fadeTimer: number | undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCharCount(voice.body.length);
      setFading(false);
      return;
    }

    setCharCount(0);
    setFading(false);

    typingTimer = window.setInterval(() => {
      count += 1;
      setCharCount(count);

      if (count >= voice.body.length) {
        window.clearInterval(typingTimer);
        typingTimer = undefined;

        holdTimer = window.setTimeout(() => {
          setFading(true);

          fadeTimer = window.setTimeout(() => {
            setVoiceIndex((current) => (current + 1) % VOICES.length);
            setCharCount(0);
            setFading(false);
          }, 350);
        }, 1900);
      }
    }, 26);

    return () => {
      if (typingTimer) window.clearInterval(typingTimer);
      if (holdTimer) window.clearTimeout(holdTimer);
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [voice.body.length]);

  return (
    <div className="mx-auto max-w-[460px]">
      <div className="mb-5 flex items-center justify-center gap-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
          Prompt
        </span>
        <span className="rounded-full border border-[#1A3326] bg-[#07100C] px-4 py-1.5 text-sm text-[#7FCFBA]">
          Draft a product launch email
        </span>
      </div>

      <div
        className={`rounded-[12px] border border-[#0F1F17] bg-[#07100C] p-5 text-left transition-opacity duration-[350ms] ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[9px] font-bold"
            style={{ background: voice.avBg, color: voice.avText }}
          >
            {voice.av}
          </div>
          <div className="text-[11px] font-semibold" style={{ color: voice.avText }}>
            {voice.name}
          </div>
          <div className="ml-auto font-mono text-[9px] text-text-muted">{voice.tag}</div>
        </div>

        <p className="min-h-[46px] text-[14px] leading-[1.65] text-[#B0D8CC]">
          {voice.body.slice(0, charCount)}
          {isTyping && (
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "14px",
                background: "#2EB896",
                verticalAlign: "-2px",
                animation: "blink 0.9s step-end infinite",
              }}
            />
          )}
        </p>
      </div>

      <div className="mt-4 flex justify-center gap-1.5">
        {VOICES.map((item, index) => (
          <div
            key={item.av}
            className={
              index === voiceIndex
                ? "h-[6px] w-[18px] rounded-[3px] bg-accent transition-all"
                : "h-[6px] w-[6px] rounded-full bg-[#1A3326] transition-all"
            }
          />
        ))}
      </div>
    </div>
  );
}
