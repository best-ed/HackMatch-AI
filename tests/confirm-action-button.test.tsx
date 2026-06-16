import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmActionButton } from "@/components/confirm-action-button";

describe("confirm action button", () => {
  it("arms before confirming destructive actions", () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmActionButton
        actionLabel="Delete"
        confirmationText="Delete this record."
        confirmLabel="Confirm delete"
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText("Delete this record.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm delete" })).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms and resets back to the base action", () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmActionButton
        actionLabel="Archive"
        confirmationText="Archive this cohort."
        confirmLabel="Confirm archive"
        onConfirm={onConfirm}
        tone="warning"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm archive" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Archive" })).toBeTruthy();
  });
});
