"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface ButtonProps {
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

const BASE =
  "inline-flex items-center justify-center gap-1.5 font-semibold rounded-md select-none cursor-pointer transition-[box-shadow,transform,background-color,opacity] duration-[90ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 no-underline";

const VARIANTS: Record<string, string> = {
  primary:
    "bg-accent text-white px-5 py-2.5 text-sm shadow-lip active:translate-y-[3px] active:shadow-[0_1px_0_var(--accent-dark)] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-card text-text-primary/80 border border-border px-5 py-2.5 text-sm hover:bg-raised active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "text-text-muted hover:text-text-primary px-3 py-2 text-sm active:scale-[.97]",
};

export default function Button({
  href,
  onClick,
  variant = "primary",
  children,
  className = "",
  type = "button",
  disabled = false,
}: ButtonProps) {
  const cls = `${BASE} ${VARIANTS[variant]} ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
