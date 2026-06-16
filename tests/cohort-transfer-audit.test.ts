import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import { buildCohortTransferAudit } from "@/lib/cohort-transfer-audit";
import type { Participant } from "@/lib/matching/types";

describe("cohort transfer audit", () => {
  it("summarizes moved participants and target cohort totals", () => {
    const beforeParticipants: Participant[] = [
      { ...demoParticipants[0], id: "p-june-1", cohort: "June" },
      { ...demoParticipants[1], id: "p-june-2", cohort: "June" },
      { ...demoParticipants[2], id: "p-july-1", cohort: "July" },
      { ...demoParticipants[3], id: "p-may-1", cohort: "May", experienceLevel: "advanced" }
    ];
    const afterParticipants: Participant[] = beforeParticipants.map((participant) =>
      participant.id === "p-june-1" || participant.id === "p-july-1"
        ? { ...participant, cohort: "May" }
        : participant
    );

    const audit = buildCohortTransferAudit({
      beforeParticipants,
      afterParticipants,
      participantIds: ["p-june-1", "p-july-1"],
      targetCohort: "May"
    });

    expect(audit.movedCount).toBe(2);
    expect(audit.targetCohortTotal).toBe(3);
    expect(audit.sourceCohortCount).toBe(2);
    expect(audit.summary).toContain("Moved 2 participants into May");
    expect(audit.highlights.join(" ")).toContain("source cohorts");
  });

  it("tracks selected participants that were already in the target cohort", () => {
    const beforeParticipants: Participant[] = [
      { ...demoParticipants[0], id: "p-may-1", cohort: "May" },
      { ...demoParticipants[1], id: "p-june-1", cohort: "June", consentToMatch: false },
      { ...demoParticipants[2], id: "p-may-2", cohort: "May" }
    ];
    const afterParticipants: Participant[] = beforeParticipants.map((participant) =>
      participant.id === "p-june-1"
        ? { ...participant, cohort: "May" }
        : participant
    );

    const audit = buildCohortTransferAudit({
      beforeParticipants,
      afterParticipants,
      participantIds: ["p-may-1", "p-june-1"],
      targetCohort: "May"
    });

    expect(audit.movedCount).toBe(1);
    expect(audit.unchangedCount).toBe(1);
    expect(audit.targetExcludedCount).toBe(1);
    expect(audit.highlights.join(" ")).toContain("already in May");
  });
});
