"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "@/components/Plasma.css";

const Plasma = dynamic(() => import("@/components/Plasma"), { ssr: false });

export default function LoginBackground() {
  const [showPlasma, setShowPlasma] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!reducedMotion.matches) {
      setShowPlasma(true);
    }

    function onChange(e: MediaQueryListEvent) {
      setShowPlasma(!e.matches);
    }

    reducedMotion.addEventListener("change", onChange);
    return () => reducedMotion.removeEventListener("change", onChange);
  }, []);

  if (showPlasma) {
    return (
      <Plasma
        color="#C7C1B4"
        speed={0.6}
        direction="forward"
        scale={1.1}
        opacity={0.22}
        mouseInteractive={false}
      />
    );
  }

  return <div className="login-bg-fallback" aria-hidden="true" />;
}
