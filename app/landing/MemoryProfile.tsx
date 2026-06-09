"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type MemoryProfileProps = {
  animate: boolean;
  animationKey?: string | number;
};

const USE_WORDS = ["honestly", "simple", "here's the thing"];
const AVOID_WORDS = ["leverage", "synergy", "circle back"];

function HeaderIcon({ type }: { type: "use" | "avoid" | "style" | "audience" | "negative" }) {
  const common = {
    width: 12,
    height: 12,
    viewBox: "0 0 12 12",
    fill: "none",
    "aria-hidden": true,
  };

  if (type === "use") {
    return (
      <svg {...common}>
        <path d="M2.5 6.25 5 8.75 9.5 3.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "avoid") {
    return (
      <svg {...common}>
        <path d="M3 3 9 9M9 3 3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "style") {
    return (
      <svg {...common}>
        <path d="M2 3.5h8M2 6h5.5M2 8.5h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "audience") {
    return (
      <svg {...common}>
        <circle cx="4.25" cy="4" r="1.35" stroke="currentColor" strokeWidth="1.2" />
        <path d="M2 9c.35-1.35 1.15-2 2.25-2s1.9.65 2.25 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M7.2 4.1a1.2 1.2 0 1 1 1.55 1.15M7.5 7.2c.9.1 1.5.65 1.75 1.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M3 2.5h6v4H5L3 8.5v-6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5 4.5h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function CornerArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="mt-[1px] shrink-0 text-[#4ECDA8]">
      <path d="M3 2.5v4h5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 4.5 8.5 6.5 6.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Card({
  label,
  icon,
  children,
  className = "",
  delay = 0,
}: {
  label: string;
  icon: "use" | "avoid" | "style" | "audience" | "negative";
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`rounded-[9px] border border-[#14271D] bg-[#081310] p-3 ${className}`}
      style={{
        animationName: "decIn",
        animationDuration: "240ms",
        animationTimingFunction: "var(--ease-out)",
        animationFillMode: "both",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#2A4A3A]">
        <span className="text-[#4ECDA8]">
          <HeaderIcon type={icon} />
        </span>
        {label}
      </div>
      {children}
    </div>
  );
}

function Chip({
  children,
  visible,
  variant,
}: {
  children: string;
  visible: boolean;
  variant: "use" | "avoid";
}) {
  const isAvoid = variant === "avoid";

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold leading-none",
        isAvoid
          ? "border-[#4A2424] bg-[#2A1414] text-[#DD8888] line-through decoration-[#7A3A3A]"
          : "border-[#1A4030] bg-[#0F2A20] text-[#4ECDA8]",
      ].join(" ")}
      style={{
        opacity: visible ? undefined : 0,
        animationName: visible ? "chipIn" : undefined,
        animationDuration: visible ? "var(--dur-base)" : undefined,
        animationTimingFunction: visible ? "var(--ease-spring)" : undefined,
        animationFillMode: visible ? "both" : undefined,
      }}
    >
      {children}
    </span>
  );
}

export default function MemoryProfile({ animate, animationKey = 0 }: MemoryProfileProps) {
  const [visibleChips, setVisibleChips] = useState<Set<string>>(
    () => new Set([...USE_WORDS, ...AVOID_WORDS])
  );

  useEffect(() => {
    const chips = [...USE_WORDS, ...AVOID_WORDS];

    if (!animate) {
      setVisibleChips(new Set(chips));
      return;
    }

    setVisibleChips(new Set());

    const timers = chips.map((chip, index) =>
      window.setTimeout(() => {
        setVisibleChips((current) => new Set(current).add(chip));
      }, index * 180)
    );

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [animate, animationKey]);

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Card label="words they use" icon="use" delay={0}>
        <div className="flex flex-wrap gap-1.5">
          {USE_WORDS.map((word) => (
            <Chip key={word} visible={visibleChips.has(word)} variant="use">
              {word}
            </Chip>
          ))}
        </div>
      </Card>

      <Card label="words they avoid" icon="avoid" delay={60}>
        <div className="flex flex-wrap gap-1.5">
          {AVOID_WORDS.map((word) => (
            <Chip key={word} visible={visibleChips.has(word)} variant="avoid">
              {word}
            </Chip>
          ))}
        </div>
      </Card>

      <Card label="sentence style" icon="style" delay={120}>
        <p className="text-[11px] leading-relaxed text-[#6A9888]">
          Avg <b className="font-semibold text-[#A0D0C0]">11 words</b> ·{" "}
          <b className="font-semibold text-[#A0D0C0]">first person</b> · em-dash for rhythm
        </p>
      </Card>

      <Card label="audience" icon="audience" delay={180}>
        <p className="text-[11px] leading-relaxed text-[#6A9888]">
          Busy founders who skim. Warm, never salesy.
        </p>
      </Card>

      <Card label="negative examples — what to never do" icon="negative" className="col-span-2" delay={240}>
        <div className="space-y-1.5">
          {[
            "Don't open with 'I hope this finds you well.'",
            "Don't use exclamation points more than once.",
          ].map((rule) => (
            <div key={rule} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[#6A9888]">
              <CornerArrowIcon />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
