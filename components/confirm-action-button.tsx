"use client";

import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type ConfirmActionButtonProps = {
  actionLabel: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmationText?: string;
  onConfirm: () => void;
  tone?: "danger" | "warning";
  disabled?: boolean;
  className?: string;
};

export function ConfirmActionButton({
  actionLabel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmationText,
  onConfirm,
  tone = "danger",
  disabled = false,
  className
}: ConfirmActionButtonProps) {
  const [armed, setArmed] = useState(false);

  function handleConfirm() {
    onConfirm();
    setArmed(false);
  }

  if (!armed) {
    return (
      <Button
        className={cn(
          tone === "danger"
            ? "border border-border bg-white text-rose-700 hover:bg-rose-50"
            : "border border-border bg-white text-amber-900 hover:bg-amber-50",
          className
        )}
        disabled={disabled}
        onClick={() => setArmed(true)}
        type="button"
      >
        {actionLabel}
      </Button>
    );
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {confirmationText ? (
        <div
          className={cn(
            "rounded-md px-3 py-2 text-xs",
            tone === "danger"
              ? "border border-rose-200 bg-rose-50 text-rose-800"
              : "border border-amber-200 bg-amber-50 text-amber-900"
          )}
        >
          {confirmationText}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          className={cn(
            tone === "danger"
              ? "bg-rose-700 text-white hover:bg-rose-800"
              : "bg-amber-600 text-white hover:bg-amber-700"
          )}
          disabled={disabled}
          onClick={handleConfirm}
          type="button"
        >
          {confirmLabel}
        </Button>
        <Button
          className="border border-border bg-white text-foreground hover:bg-muted"
          onClick={() => setArmed(false)}
          type="button"
        >
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
