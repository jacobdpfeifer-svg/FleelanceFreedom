import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}

export default function Card({ children, className = "", accent = false }: CardProps) {
  return (
    <div
      className={`bg-card rounded-md border shadow-card ${
        accent ? "border-accent" : "border-border/60"
      } ${className}`}
    >
      {children}
    </div>
  );
}
