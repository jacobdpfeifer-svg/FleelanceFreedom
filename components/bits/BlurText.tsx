"use client";
// Source: reactbits.dev — BlurText (word-by-word blur-to-sharp entrance)
import { motion, Transition } from "framer-motion";
import { useEffect, useRef, useState, useMemo } from "react";

interface BlurTextProps {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  onAnimationComplete?: () => void;
  stepDuration?: number;
}

export default function BlurText({
  text = "",
  delay = 200,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  onAnimationComplete,
  stepDuration = 0.35,
}: BlurTextProps) {
  const elements = animateBy === "words" ? text.split(" ") : text.split("");
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current as Element);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () => (direction === "top"
      ? { filter: "blur(10px)", opacity: 0, y: -30 }
      : { filter: "blur(10px)", opacity: 0, y: 30 }),
    [direction]
  );

  const defaultTo = useMemo(() => [
    { filter: "blur(5px)", opacity: 0.5, y: direction === "top" ? 5 : -5 },
    { filter: "blur(0px)", opacity: 1, y: 0 },
  ], [direction]);

  const totalDuration = stepDuration * defaultTo.length;
  const stepCount = defaultTo.length + 1;
  const times = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1)
  );

  // Build keyframe arrays from from+to snapshots
  const animateKeyframes = useMemo(() => {
    const keys = new Set<string>([
      ...Object.keys(defaultFrom),
      ...defaultTo.flatMap((s) => Object.keys(s)),
    ]);
    const kf: Record<string, Array<string | number>> = {};
    keys.forEach((k) => {
      kf[k] = [
        (defaultFrom as Record<string, string | number>)[k],
        ...defaultTo.map((s) => (s as Record<string, string | number>)[k]),
      ];
    });
    return kf;
  }, [defaultFrom, defaultTo]);

  return (
    <p ref={ref} className={`flex flex-wrap ${className}`}>
      {elements.map((segment, index) => {
        const transition: Transition = {
          duration: totalDuration,
          times,
          delay: (index * delay) / 1000,
          ease: "easeOut",
        };
        return (
          <motion.span
            key={index}
            initial={defaultFrom}
            animate={inView ? animateKeyframes : defaultFrom}
            transition={transition}
            onAnimationComplete={index === elements.length - 1 ? onAnimationComplete : undefined}
            style={{ display: "inline-block", willChange: "transform, filter, opacity" }}
          >
            {segment === " " ? "\u00A0" : segment}
            {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
          </motion.span>
        );
      })}
    </p>
  );
}
