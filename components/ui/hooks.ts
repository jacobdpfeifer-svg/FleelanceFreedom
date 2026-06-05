"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export type ToastVariant = "success" | "warn" | "danger" | "info";

export type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function useCountUp(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target);
  const currentRef = useRef(target);

  useEffect(() => {
    if (duration <= 0) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }

    let frame = 0;
    let startTime: number | null = null;
    const startValue = currentRef.current;
    const delta = target - startValue;

    const tick = (time: number) => {
      if (startTime === null) {
        startTime = time;
      }

      const progress = Math.min((time - startTime) / duration, 1);
      const nextValue = startValue + delta * easeOut(progress);

      currentRef.current = nextValue;
      setDisplay(nextValue);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        currentRef.current = target;
        setDisplay(target);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [duration, target]);

  return display;
}

export function useTabIndicator(
  activeIndex: number,
  containerRef: RefObject<HTMLElement>
): { left: number; width: number } {
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const activeTab = container?.children.item(activeIndex) as HTMLElement | null;

    if (!container || !activeTab) {
      setIndicator({ left: 0, width: 0 });
      return;
    }

    const measure = () => {
      setIndicator({
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
      });
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(activeTab);
    observer.observe(container);

    return () => observer.disconnect();
  }, [activeIndex, containerRef]);

  return indicator;
}

export function useToast(): {
  toasts: ToastItem[];
  addToast: (message: string, variant?: ToastVariant) => number;
  removeToast: (id: number) => void;
} {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const nextIdRef = useRef(1);

  const removeToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;

      setToasts((current) => [...current, { id, message, variant }]);

      const timer = setTimeout(() => removeToast(id), 3000);
      timersRef.current.set(id, timer);

      return id;
    },
    [removeToast]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return { toasts, addToast, removeToast };
}
