"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const CLIENT_TABS = ["ACME", "NOVA", "REX"];

function useInterval(callback: () => void, delay: number) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const timer = window.setInterval(() => savedCallback.current(), delay);
    return () => window.clearInterval(timer);
  }, [delay]);
}

function VignetteCard({ stage, children }: { stage: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-[12px] border border-[#0F1F17] bg-[#070D0A] p-5">
      <div className="mb-4 flex h-[92px] items-center justify-center">{stage}</div>
      <p className="text-[12px] leading-[1.55] text-text-muted">{children}</p>
    </div>
  );
}

function DriftVignette() {
  const [pct, setPct] = useState(94);
  const [color, setColor] = useState("#2EB896");

  useEffect(() => {
    const startedAt = Date.now();

    const timer = window.setInterval(() => {
      const progress = ((Date.now() - startedAt) % 4000) / 4000;
      setPct(Math.round(94 - progress * 63));

      if (progress < 0.45) setColor("#2EB896");
      else if (progress < 0.75) setColor("#C87A50");
      else setColor("#C85050");
    }, 60);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <VignetteCard
      stage={
        <div className="w-full">
          <div className="mb-1.5 flex justify-between font-mono text-[9px] text-[#2A4A3A]">
            <span>voice match</span>
            <span>↓</span>
          </div>
          <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#0F1F17]">
            <div
              className="h-full w-[94%] rounded-full bg-accent"
              style={{ animation: "driftDecay 4s ease-in-out infinite" }}
            />
          </div>
          <div className="mt-2.5 font-mono text-[22px] font-bold" style={{ color }}>
            {pct}%
          </div>
        </div>
      }
    >
      <b className="font-semibold text-[#A0D0C0]">It forgets fast.</b> A few messages in
      and the voice drifts back to generic.
    </VignetteCard>
  );
}

function CostVignette() {
  const [cost, setCost] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();

    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) % 4000;
      const progress = Math.min(elapsed / 1400, 1);
      setCost(0.42 * progress);
    }, 60);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <VignetteCard
      stage={
        <div className="flex flex-col items-center justify-center gap-2">
          <div
            className="h-7 w-7 rounded-full border-2 border-[#1A3326]"
            style={{
              borderTopColor: "#C87A50",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <div className="font-mono text-[22px] font-bold text-[#C87A50]">
            ${cost.toFixed(2)}
          </div>
          <div className="font-mono text-[9px] tracking-[0.08em] text-text-muted">
            8,400 tokens · 12s
          </div>
        </div>
      }
    >
      <b className="font-semibold text-[#A0D0C0]">It burns time and money.</b>{" "}
      Premium-model rates to write a two-line reply.
    </VignetteCard>
  );
}

function SwitchingVignette() {
  const [activeTab, setActiveTab] = useState(0);
  const [showReload, setShowReload] = useState(true);

  useInterval(() => {
    setActiveTab((current) => (current + 1) % CLIENT_TABS.length);
  }, 1000);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setShowReload((current) => !current);
    }, 1500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <VignetteCard
      stage={
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            {CLIENT_TABS.map((label, index) => {
              const active = index === activeTab;

              return (
                <div
                  key={label}
                  className={`rounded-[6px] border px-2.5 py-1 font-mono text-[9px] font-bold transition-all duration-300 ${
                    active
                      ? "border-[#1A4030] bg-[#0F2A20] text-[#4ECDA8]"
                      : "border-[#14271D] bg-transparent text-[#2A4A3A]"
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>
          <div
            className={`font-mono text-[9px] tracking-[0.1em] text-[#C87A50] transition-opacity duration-300 ${
              showReload ? "opacity-100" : "opacity-0"
            }`}
          >
            ↻ reloading context…
          </div>
        </div>
      }
    >
      <b className="font-semibold text-[#A0D0C0]">You reload too.</b> Switching clients
      means switching brains, every time.
    </VignetteCard>
  );
}

export default function ProblemSection() {
  return (
    <section className="bg-[#080C0A] px-6 py-16">
      <div className="mb-12 text-center">
        <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          The problem
        </p>
        <h2 className="mx-auto max-w-[440px] text-center text-2xl font-bold leading-[1.2] tracking-[-0.02em] text-[#DCF2EA] md:text-3xl">
          Generic AI wasn&apos;t built to keep a client&apos;s voice.
        </h2>
      </div>

      <div className="mx-auto grid max-w-[720px] grid-cols-1 gap-4 md:grid-cols-3">
        <DriftVignette />
        <CostVignette />
        <SwitchingVignette />
      </div>
    </section>
  );
}
