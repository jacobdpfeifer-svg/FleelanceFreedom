"use client";

import Plasma from "@/components/Plasma";
import Button from "@/components/Button";

const HEADLINE = "Remember each client's voice.";
const SUBHEAD =
  "On-brand copy, every time. One AI that thinks like every client you have.";

export default function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 py-28 md:py-44 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <Plasma color="#2EB896" opacity={0.07} speed={0.5} mouseInteractive={false} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        <h1
          className="text-4xl md:text-6xl font-bold text-text-primary tracking-tight mb-6 leading-[1.1]"
          aria-label={HEADLINE}
          aria-live="polite"
        >
          {HEADLINE.split("").map((char, i) =>
            char === " " ? (
              <span key={i} aria-hidden="true" className="inline-block w-[0.28em]" />
            ) : (
              <span
                key={i}
                aria-hidden="true"
                className="inline-block"
                style={{
                  opacity: 0,
                  animationName: "stampIn",
                  animationDuration: "var(--dur-base)",
                  animationTimingFunction: "var(--ease-bounce)",
                  animationFillMode: "forwards",
                  animationDelay: `calc(${i} * 28ms)`,
                }}
              >
                {char}
              </span>
            )
          )}
        </h1>

        <p
          className="text-lg md:text-xl text-text-muted mb-10 max-w-xl mx-auto leading-relaxed"
          style={{
            opacity: 0,
            animationName: "popIn",
            animationDuration: "var(--dur-base)",
            animationTimingFunction: "var(--ease-out)",
            animationFillMode: "forwards",
            animationDelay: "400ms",
          }}
        >
          {SUBHEAD}
        </p>

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{
            opacity: 0,
            animationName: "slideUp",
            animationDuration: "var(--dur-base)",
            animationTimingFunction: "var(--ease-out)",
            animationFillMode: "forwards",
            animationDelay: "560ms",
          }}
        >
          <Button href="/login" variant="primary" className="w-full sm:w-auto">
            Start free
          </Button>
          <Button href="#demo" variant="secondary" className="w-full sm:w-auto">
            See how it works
          </Button>
        </div>
      </div>
    </section>
  );
}
