"use client";

import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** segment = pill-group on bg-raised (login, MemoryEditor). pill = floating pills (ChatUI). */
  variant?: "segment" | "pill";
  className?: string;
}

export default function Tabs({
  tabs,
  activeId,
  onChange,
  variant = "segment",
  className = "",
}: TabsProps) {
  const isSegment = variant === "segment";

  return (
    <div
      role="tablist"
      className={
        isSegment
          ? `flex gap-1 bg-raised p-1 rounded-lg ${className}`
          : `flex gap-1 flex-wrap ${className}`
      }
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={
              isSegment
                ? `flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-text-primary"
                      : "text-text-muted hover:text-text-primary"
                  }`
                : `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-text-primary"
                      : "bg-raised text-text-muted hover:text-text-primary"
                  }`
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
