import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { compareCohortHealth } from "@/lib/cohort-health";
import type { MatchingResult, SavedMatchRun } from "@/lib/matching/types";

const emptyResult: MatchingResult = {
  teams: [],
  scoreBreakdowns: {},
  explanations: [],
  warnings: [],
  unassignedParticipants: []
};

function savedRun(cohort: string): SavedMatchRun {
  return {
    id: `run-${cohort}`,
    name: `${cohort} run`,
    createdAt: "2026-06-09T09:00:00.000Z",
    participantCount: 4,
    assignedCount: 4,
    averageScore: 90,
    cohort,
    settingsSnapshot: demoMatchingSettings,
    participantsSnapshot: [],
    result: emptyResult
  };
}

describe("cohort health comparison", () => {
  it("flags cohorts below minimum team size as blocked", () => {
    const rows = compareCohortHealth({
      cohorts: ["Tiny"],
      participants: [{ ...demoParticipants[0], id: "p-tiny", cohort: "Tiny" }],
      savedRuns: [],
      settings: { ...demoMatchingSettings, minTeamSize: 3 }
    });

    expect(rows[0]).toMatchObject({
      cohort: "Tiny",
      matchableCount: 1,
      status: "blocked"
    });
  });

  it("sorts attention-needed cohorts before ready cohorts and counts saved runs", () => {
    const participants = [
      { ...demoParticipants[0], id: "p-alpha-1", cohort: "Alpha", consentToMatch: true },
      { ...demoParticipants[1], id: "p-alpha-2", cohort: "Alpha", consentToMatch: true },
      { ...demoParticipants[2], id: "p-beta-1", cohort: "Beta", consentToMatch: true },
      { ...demoParticipants[3], id: "p-beta-2", cohort: "Beta", consentToMatch: true },
      { ...demoParticipants[4], id: "p-beta-3", cohort: "Beta", consentToMatch: true },
      { ...demoParticipants[5], id: "p-beta-4", cohort: "Beta", consentToMatch: true }
    ];

    const rows = compareCohortHealth({
      cohorts: ["Beta", "Alpha"],
      participants,
      savedRuns: [savedRun("Beta")],
      settings: { ...demoMatchingSettings, minTeamSize: 3, desiredTeamSize: 4 }
    });

    expect(rows.map((row) => row.cohort)).toEqual(["Alpha", "Beta"]);
    expect(rows.find((row) => row.cohort === "Alpha")?.status).toBe("blocked");
    expect(rows.find((row) => row.cohort === "Beta")?.savedRunCount).toBe(1);
  });
});
