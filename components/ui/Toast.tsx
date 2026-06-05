"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useToast } from "./hooks";
import type { ToastItem } from "./hooks";

export type ToastProps = {
  toasts: ToastItem[];
  removeToast: (id: number) => void;
};

const variantClasses: Record<ToastItem["variant"], string> = {
  success: "border-success bg-success text-white",
  warn: "border-warn bg-warn text-white",
  danger: "border-danger bg-danger text-white",
  info: "border-accent bg-accent text-white",
};

export { useToast };

export function Toast({ toasts, removeToast }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          className="animate-slide-up"
          key={toast.id}
          role="status"
        >
          <div
            className={[
              "flex items-start justify-between gap-3 rounded-lg border px-4 py-3 shadow-lift animate-pop-in",
              variantClasses[toast.variant],
            ].join(" ")}
          >
            <span className="text-sm font-semibold leading-5">{toast.message}</span>
            <button
              aria-label="Close toast"
              className="-mr-1 -mt-1 rounded-md px-2 py-1 text-lg leading-none text-white/80 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-card/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={() => removeToast(toast.id)}
              type="button"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}
