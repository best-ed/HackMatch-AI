import { describe, expect, it } from "vitest";
import { summarizeParticipantLinkHandoff } from "@/lib/participant-link-handoff";

describe("participant link handoff summary", () => {
  it("blocks empty scopes", () => {
    const summary = summarizeParticipantLinkHandoff({
      audit: {
        status: "ready",
        totalParticipants: 0,
        exportableLinks: 0,
        missingTokenCount: 0,
        duplicateTokenCount: 0,
        nonstandardTokenCount: 0,
        excludedWithTokenCount: 0,
        riskParticipantIds: [],
        issues: []
      },
      scopeLabel: "the filtered view"
    });

    expect(summary.status).toBe("blocked");
    expect(summary.title).toContain("No participants");
  });

  it("surfaces the first blocked link issue", () => {
    const summary = summarizeParticipantLinkHandoff({
      audit: {
        status: "blocked",
        totalParticipants: 5,
        exportableLinks: 3,
        missingTokenCount: 2,
        duplicateTokenCount: 0,
        nonstandardTokenCount: 0,
        excludedWithTokenCount: 0,
        riskParticipantIds: ["p1", "p2"],
        issues: [
          {
            label: "Missing access tokens",
            status: "blocked",
            detail: "2 participant(s) cannot receive direct team links yet.",
            participantIds: ["p1", "p2"]
          }
        ]
      },
      scopeLabel: "the filtered view"
    });

    expect(summary.status).toBe("blocked");
    expect(summary.detail).toContain("cannot receive direct team links");
  });

  it("confirms ready handoff when tokens are clean", () => {
    const summary = summarizeParticipantLinkHandoff({
      audit: {
        status: "ready",
        totalParticipants: 4,
        exportableLinks: 4,
        missingTokenCount: 0,
        duplicateTokenCount: 0,
        nonstandardTokenCount: 0,
        excludedWithTokenCount: 0,
        riskParticipantIds: [],
        issues: []
      },
      scopeLabel: "the full participant directory"
    });

    expect(summary.status).toBe("ready");
    expect(summary.detail).toContain("4 access link(s)");
  });
});
