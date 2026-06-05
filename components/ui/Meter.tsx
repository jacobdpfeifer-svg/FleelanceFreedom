"use client";

import { useEffect, useRef, useState } from "react";
import CountUp from "@/components/bits/CountUp";

export type MeterProps = {
  value: number;
  max: number;
  /** threshold at which fill switches to warn color and pulses */
  warnAt?: number;
  /** alias for warnAt (spec name) */
  warn?: number;
  label?: string;
};

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function Meter({ value, max, warnAt, warn, label }: MeterProps) {
  const threshold = warnAt ?? warn;
  const isWarning = threshold !== undefined && value >= threshold;
  const pct = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;

  const prefersReducedMotion = useReducedMotion();

  // Detect the moment warning first becomes true to trigger one scale pulse.
  const wasWarning = useRef(false);
  const [pulseCount, setPulseCount] = useState(0);

  useEffect(() => {
    if (isWarning && !wasWarning.current && !prefersReducedMotion) {
      setPulseCount((n) => n + 1);
    }
    wasWarning.current = isWarning;
  }, [isWarning, prefersReducedMotion]);

  return (
    <>
      {/* Inline keyframe — self-contained, reduced-motion handled by global guard */}
      <style>{`
        @keyframes meterPulse {
          0%   { transform: scale(1);    }
          50%  { transform: scale(1.04); }
          100% { transform: scale(1);    }
        }
      `}</style>

      <div
        className="w-full"
        key={pulseCount}
        style={
          isWarning && pulseCount > 0 && !prefersReducedMotion
            ? { animation: `meterPulse var(--dur-base) var(--ease-spring) 1 forwards` }
            : undefined
        }
      >
        {/* Label row */}
        <div className="mb-2 flex items-center justify-between gap-3">
          {label && (
            <span className="text-sm font-semibold text-text-primary">{label}</span>
          )}
          <span className="font-mono text-xs text-text-muted tabular-nums ml-auto">
            <CountUp
              key={Math.floor(value / 10)}
              from={0}
              to={Math.round(value)}
              duration={0.8}
              className="text-accent"
              startWhen={!prefersReducedMotion}
            />
            /{max}
          </span>
        </div>

        {/* Track */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full transition-[width,background-color] duration-[var(--dur-slow)] ease-[var(--ease-spring)]"
            style={{
              width: `${pct}%`,
              backgroundColor: isWarning ? "var(--warn)" : "var(--accent)",
            }}
          />
        </div>
      </div>
    </>
  );
}
