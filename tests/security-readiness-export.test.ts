import { describe, expect, it } from "vitest";
import { buildSecurityReadinessExportArtifact } from "@/lib/security-readiness-export";

describe("security readiness export", () => {
  it("builds a sanitized text artifact for organizer review", () => {
    const artifact = buildSecurityReadinessExportArtifact({
      readiness: {
        status: "review",
        readyCount: 3,
        totalCount: 5,
        checks: [
          {
            label: "Admin passcode",
            status: "ready",
            detail: "ADMIN_PASSCODE is configured with a stronger baseline for shared admin access."
          },
          {
            label: "Session secret",
            status: "review",
            detail: "Set ADMIN_SESSION_SECRET to a long private value instead of relying on the passcode fallback."
          }
        ]
      },
      generatedAt: "2026-06-21T10:15:00.000Z"
    });

    expect(artifact.filename).toBe("hackmatch-security-readiness-2026-06-21T10-15-00-000Z.txt");
    expect(artifact.text).toContain("HackMatch AI security readiness summary");
    expect(artifact.text).toContain("Status: review");
    expect(artifact.text).toContain("- Session secret: review");
  });
});
