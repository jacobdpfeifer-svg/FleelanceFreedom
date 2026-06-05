"use client";
// Source: reactbits.dev — ClickSpark (canvas-based spark particles on click)
import { useEffect, useRef, useCallback } from "react";

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

interface ClickSparkProps {
  children: React.ReactNode;
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  extraScale?: number;
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}

export default function ClickSpark({
  children,
  sparkColor = "#2EB896",
  sparkSize = 6,
  sparkRadius = 18,
  sparkCount = 7,
  duration = 400,
  extraScale = 1,
  easing = "ease-out",
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    let timeout: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const { width, height } = parent.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
      }, 100);
    });
    ro.observe(parent);
    const { width, height } = parent.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    return () => { ro.disconnect(); clearTimeout(timeout); };
  }, []);

  const easeFunc = useCallback((t: number) => {
    if (easing === "linear") return t;
    if (easing === "ease-in") return t * t;
    if (easing === "ease-in-out") return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    return t * (2 - t); // ease-out
  }, [easing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    const draw = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) return false;
        const progress = elapsed / duration;
        const eased = easeFunc(progress);
        const dist = eased * sparkRadius * extraScale;
        const lineLen = sparkSize * (1 - eased);
        const x1 = spark.x + dist * Math.cos(spark.angle);
        const y1 = spark.y + dist * Math.sin(spark.angle);
        const x2 = spark.x + (dist + lineLen) * Math.cos(spark.angle);
        const y2 = spark.y + (dist + lineLen) * Math.sin(spark.angle);
        ctx.strokeStyle = sparkColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return true;
      });
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [sparkColor, sparkSize, sparkRadius, duration, easeFunc, extraScale]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();
    sparksRef.current.push(
      ...Array.from({ length: sparkCount }, (_, i) => ({
        x, y,
        angle: (2 * Math.PI * i) / sparkCount,
        startTime: now,
      }))
    );
  }

  return (
    <div className="relative inline-block" onClick={handleClick}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      {children}
    </div>
  );
}
