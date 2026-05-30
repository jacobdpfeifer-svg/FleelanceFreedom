"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "@/components/LineWaves.css";

const LineWaves = dynamic(() => import("@/components/LineWaves"), { ssr: false });

export default function LoginBackground() {
  const [showWaves, setShowWaves] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!reducedMotion.matches) {
      setShowWaves(true);
    }

    function onChange(e: MediaQueryListEvent) {
      setShowWaves(!e.matches);
    }

    reducedMotion.addEventListener("change", onChange);
    return () => reducedMotion.removeEventListener("change", onChange);
  }, []);

  if (showWaves) {
    return (
      <LineWaves
        speed={0.25}
        brightness={0.22}
        color1="#5D5949"
        color2="#C7C1B4"
        color3="#E5E1CD"
        enableMouseInteraction={false}
      />
    );
  }

  return <div className="login-bg-fallback" aria-hidden="true" />;
}
