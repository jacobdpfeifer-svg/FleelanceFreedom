"use client";

import { Button } from "./Button";

export type ConfirmSheetProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-accent/40 p-4"
      role="dialog"
    >
      <div className="w-full max-w-md animate-slide-up rounded-[10px] bg-page p-6 shadow-lift">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <p className="text-sm leading-6 text-text-primary/75">{description}</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="primary">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
