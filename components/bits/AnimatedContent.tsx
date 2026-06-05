"use client";
// Source: reactbits.dev — AnimatedContent (framer-motion fade+slide entrance)
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface AnimatedContentProps {
  children: React.ReactNode;
  direction?: "vertical" | "horizontal";
  distance?: number;
  delay?: number;
  duration?: number;
  className?: string;
}

export default function AnimatedContent({
  children,
  direction = "vertical",
  distance = 20,
  delay = 0,
  duration = 0.4,
  className,
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const initial =
    direction === "vertical"
      ? { opacity: 0, y: distance }
      : { opacity: 0, x: distance };

  const animate = isInView
    ? { opacity: 1, y: 0, x: 0 }
    : initial;

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={animate}
      transition={{ duration, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
