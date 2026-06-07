import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import { summarizeCohortOverview } from "@/lib/cohort-overview";

describe("cohort overview", () => {
  it("summarizes active cohort profile", () => {
    const overview = summarizeCohortOverview({
      cohort: "General",
      participants: demoParticipants,
      savedRuns: []
    });

    expect(overview.participantCount).toBe(demoParticipants.length);
    expect(overview.matchableCount).toBe(demoParticipants.filter((participant) => participant.consentToMatch).length);
    expect(overview.topRoles.length).toBeGreaterThan(0);
  });
});
