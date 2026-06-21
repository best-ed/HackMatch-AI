import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminEnvSetupCard } from "@/components/admin-env-setup-card";

describe("admin env setup card", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copies the env block and surfaces success feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });

    render(
      <AdminEnvSetupCard
        envLines={[
          "ADMIN_PASSCODE=LaunchCode2026",
          "ADMIN_SESSION_SECRET=SessionSecret2026-Strong"
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy env block" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "ADMIN_PASSCODE=LaunchCode2026\nADMIN_SESSION_SECRET=SessionSecret2026-Strong"
      );
    });
    expect(screen.getByText("Copied env block.")).toBeTruthy();
  });
});
