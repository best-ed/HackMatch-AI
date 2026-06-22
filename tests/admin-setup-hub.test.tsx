import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminSetupHub } from "@/components/admin-setup-hub";

describe("admin setup hub", () => {
  it("summarizes protection status, destination, and next move", () => {
    render(
      <AdminSetupHub
        destinationLabel="team review"
        nextPath="/admin/teams"
        summary={{
          enabled: true,
          readyCount: 2,
          totalCount: 3,
          sessionSecretConfigured: false,
          steps: []
        }}
      />
    );

    expect(screen.getByText("Admin setup hub")).toBeTruthy();
    expect(screen.getByText(/continues to team review/i)).toBeTruthy();
    expect(screen.getByText("needs setup review")).toBeTruthy();
  });
});
