"use client";

import Plasma from "@/components/Plasma";
import HeroVoiceDemo from "./HeroVoiceDemo";

export default function LandingHero() {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-20 text-center md:py-28">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <Plasma color="#2EB896" opacity={0.06} speed={0.5} mouseInteractive={false} />
      </div>

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center">
        <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          Voice intelligence for freelancers
        </p>

        <h1
          className="mb-0 text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-[#DCF2EA] md:text-[52px]"
          style={{
            animationName: "stampIn",
            animationDuration: "var(--dur-base)",
            animationTimingFunction: "var(--ease-bounce)",
            animationFillMode: "both",
            animationDelay: "100ms",
          }}
        >
          One prompt.
          <br />
          <span className="text-accent">Every client&apos;s voice.</span>
        </h1>

        <div className="mt-10 w-full">
          <HeroVoiceDemo />
        </div>
      </div>
    </section>
  );
}
