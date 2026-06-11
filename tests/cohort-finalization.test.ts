import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { evaluateCohortFinalizationGate } from "@/lib/cohort-finalization";
import type { MatchingResult, SavedMatchRun } from "@/lib/matching/types";

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

function savedRun(isFinal = false): SavedMatchRun {
  return {
    id: "run-1",
    name: "June final",
    createdAt: "2026-06-11T10:00:00.000Z",
    participantCount: 3,
    assignedCount: 3,
    averageScore: 92,
    cohort: "June",
    isFinal,
    settingsSnapshot: demoMatchingSettings,
    participantsSnapshot: demoParticipants.slice(0, 3),
    result
  };
}

describe("cohort finalization gate", () => {
  it("blocks finalization before teams and saved runs exist", () => {
    const gate = evaluateCohortFinalizationGate({
      cohort: "June",
      participants: demoParticipants.slice(0, 2),
      settings: { ...demoMatchingSettings, minTeamSize: 3 },
      result: { ...result, teams: [] },
      savedRuns: []
    });

    expect(gate.status).toBe("blocked");
    expect(gate.blockedCount).toBeGreaterThan(0);
  });

  it("asks for review when a saved run exists but none is final", () => {
    const gate = evaluateCohortFinalizationGate({
      cohort: "June",
      participants: demoParticipants.slice(0, 3).map((participant) => ({
        ...participant,
        cohort: "June",
        consentToMatch: true,
        consentToShareContact: true
      })),
      settings: demoMatchingSettings,
      result,
      savedRuns: [savedRun(false)]
    });

    expect(gate.status).toBe("review");
    expect(gate.checks.find((check) => check.label === "Saved run")?.status).toBe("review");
  });

  it("marks a fully checked final cohort ready", () => {
    const gate = evaluateCohortFinalizationGate({
      cohort: "June",
      participants: demoParticipants.slice(0, 3).map((participant) => ({
        ...participant,
        cohort: "June",
        consentToMatch: true,
        consentToShareContact: true
      })),
      settings: demoMatchingSettings,
      result,
      savedRuns: [savedRun(true)]
    });

    expect(gate.status).toBe("ready");
    expect(gate.readyCount).toBe(gate.checks.length);
  });
});
