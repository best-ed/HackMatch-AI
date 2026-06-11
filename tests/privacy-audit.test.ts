import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import type { MatchingResult } from "@/lib/matching/types";
import { buildPrivacyAudit } from "@/lib/privacy-audit";

const result: MatchingResult = {
  teams: [
    {
      id: "team-1",
      name: "Team 1",
      participantIds: ["p01", "p02", "p03"]
    }
  ],
  scoreBreakdowns: {},
  explanations: [],
  warnings: [],
  unassignedParticipants: []
};

describe("privacy audit", () => {
  it("counts match consent and contact sharing across a cohort", () => {
    const participants = demoParticipants.slice(0, 4).map((participant, index) => ({
      ...participant,
      consentToMatch: index !== 3,
      consentToShareContact: index === 0
    }));

    const audit = buildPrivacyAudit({ participants, result });

    expect(audit.matchConsentCount).toBe(3);
    expect(audit.matchExcludedCount).toBe(1);
    expect(audit.contactSharingCount).toBe(1);
    expect(audit.assignedWithoutContactCount).toBe(2);
    expect(audit.status).toBe("review");
  });

  it("blocks export privacy confidence until teams exist", () => {
    const audit = buildPrivacyAudit({
      participants: demoParticipants.slice(0, 2),
      result: {
        ...result,
        teams: []
      }
    });

    expect(audit.status).toBe("blocked");
    expect(audit.issues.find((issue) => issue.label === "Team export privacy")?.status).toBe("blocked");
  });

  it("marks fully consented assigned cohorts ready", () => {
    const participants = demoParticipants.slice(0, 3).map((participant) => ({
      ...participant,
      consentToMatch: true,
      consentToShareContact: true
    }));

    expect(buildPrivacyAudit({ participants, result }).status).toBe("ready");
  });
});
