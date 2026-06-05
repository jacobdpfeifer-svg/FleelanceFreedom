"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  children: ReactNode;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  className?: string;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "className" | "disabled" | "onClick" | "type"
>;

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold select-none " +
  "transition-[background-color,box-shadow,transform,opacity,border-color] " +
  "duration-[var(--dur-fast)] ease-[var(--ease-spring)] " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: [
    "bg-accent text-white",
    "rounded-[var(--radius-md)]",
    "shadow-[var(--shadow-lip)]",
    "hover:brightness-105",
    "active:translate-y-[4px] active:shadow-none",
    "data-[pressing]:translate-y-[4px] data-[pressing]:shadow-none",
  ].join(" "),
  secondary: [
    "bg-raised text-text-primary border border-border",
    "rounded-[var(--radius-md)]",
    "hover:bg-raised",
    "active:scale-[.97]",
  ].join(" "),
  ghost: [
    "bg-transparent text-text-muted",
    "rounded-[var(--radius-md)]",
    "hover:text-text-primary hover:bg-raised",
    "active:scale-[.97]",
  ].join(" "),
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

function join(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  children,
  type = "button",
  className,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onBlur,
  ...props
}: ButtonProps) {
  const [pressing, setPressing] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      data-pressing={pressing ? "" : undefined}
      className={join(base, variants[variant], sizes[size], className)}
      onPointerDown={(e) => {
        if (!isDisabled) {
          setPressing(true);
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => { setPressing(false); onPointerUp?.(e); }}
      onPointerCancel={(e) => { setPressing(false); onPointerCancel?.(e); }}
      onPointerLeave={(e) => { setPressing(false); onPointerLeave?.(e); }}
      onBlur={(e) => { setPressing(false); onBlur?.(e); }}
    >
      {loading ? (
        <span
          role="status"
          aria-label="Loading"
          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      ) : (
        children
      )}
    </button>
  );
}
