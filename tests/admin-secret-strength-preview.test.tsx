import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminSecretStrengthPreview } from "@/components/admin-secret-strength-preview";

describe("admin secret strength preview", () => {
  it("flags weak candidate values and then recovers when strengthened", () => {
    render(<AdminSecretStrengthPreview />);

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "short" } });
    fireEvent.change(inputs[1], { target: { value: "short" } });

    expect(screen.getAllByText("review").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/at least 12 characters/i)).toBeTruthy();
    expect(screen.getByText(/should not match admin_passcode/i)).toBeTruthy();

    fireEvent.change(inputs[0], { target: { value: "LaunchCode2026" } });
    fireEvent.change(inputs[1], { target: { value: "LaunchCode2026-Session-Secret-Strong" } });

    expect(screen.getAllByText("ready").length).toBeGreaterThanOrEqual(2);
  });
});
