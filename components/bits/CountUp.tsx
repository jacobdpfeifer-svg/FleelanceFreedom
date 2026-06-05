"use client";
// Source: reactbits.dev — CountUp (spring-animated number counter)
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";

interface CountUpProps {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export default function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  startWhen = true,
  separator = "",
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? to : from);

  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);
  const springValue = useSpring(motionValue, { damping, stiffness });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const getDecimals = (num: number) => {
    const s = num.toString();
    if (s.includes(".")) {
      const d = s.split(".")[1];
      if (parseInt(d) !== 0) return d.length;
    }
    return 0;
  };
  const maxDecimals = Math.max(getDecimals(from), getDecimals(to));

  const format = useCallback(
    (latest: number) => {
      const opts: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: maxDecimals,
        maximumFractionDigits: maxDecimals,
      };
      const n = Intl.NumberFormat("en-US", opts).format(latest);
      return separator ? n.replace(/,/g, separator) : n;
    },
    [maxDecimals, separator]
  );

  useEffect(() => {
    if (ref.current) ref.current.textContent = format(direction === "down" ? to : from);
  }, [from, to, direction, format]);

  useEffect(() => {
    if (isInView && startWhen) {
      onStart?.();
      const t1 = setTimeout(() => motionValue.set(direction === "down" ? from : to), delay * 1000);
      const t2 = setTimeout(() => onEnd?.(), delay * 1000 + duration * 1000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration]);

  useEffect(() => {
    return springValue.on("change", (latest: number) => {
      if (ref.current) ref.current.textContent = format(latest);
    });
  }, [springValue, format]);

  return <span className={className} ref={ref} />;
}
