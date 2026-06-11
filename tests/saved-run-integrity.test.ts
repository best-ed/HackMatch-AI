import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import type { SavedMatchRun } from "@/lib/matching/types";
import {
  summarizeSavedRunIntegrity,
  summarizeSavedRunIntegrityOverview
} from "@/lib/saved-run-integrity";

function savedRun(overrides: Partial<SavedMatchRun> = {}): SavedMatchRun {
  const participants = demoParticipants.slice(0, 4).map((participant) => ({
    ...participant,
    cohort: "June"
  }));

  return {
    id: "run-1",
    name: "Run 1",
    createdAt: "2026-06-11T10:00:00.000Z",
    participantCount: participants.length,
    assignedCount: 4,
    averageScore: 90,
    cohort: "June",
    settingsSnapshot: demoMatchingSettings,
    participantsSnapshot: participants,
    result: {
      teams: [
        {
          id: "team-1",
          name: "Team 1",
          participantIds: participants.map((participant) => participant.id)
        }
      ],
      scoreBreakdowns: {},
      explanations: [],
      warnings: [],
      unassignedParticipants: []
    },
    ...overrides
  };
}

describe("saved run integrity", () => {
  it("verifies a saved run that still matches live cohort and settings", () => {
    const run = savedRun();
    const summary = summarizeSavedRunIntegrity({
      run,
      currentParticipants: run.participantsSnapshot,
      currentSettings: demoMatchingSettings,
      activeCohort: "June"
    });

    expect(summary.status).toBe("verified");
    expect(summary.checks.every((check) => check.status === "verified")).toBe(true);
  });

  it("flags live participant and settings drift for organizer review", () => {
    const run = savedRun();
    const summary = summarizeSavedRunIntegrity({
      run,
      currentParticipants: [...run.participantsSnapshot, { ...demoParticipants[4], cohort: "June" }],
      currentSettings: { ...demoMatchingSettings, desiredTeamSize: 5 },
      activeCohort: "June"
    });

    expect(summary.status).toBe("review");
    expect(summary.participantDelta).toBe(1);
    expect(summary.settingsChanged).toBe(true);
  });

  it("marks internally inconsistent saved runs as stale", () => {
    const run = savedRun({
      assignedCount: 2,
      participantsSnapshot: demoParticipants.slice(0, 2)
    });
    const summary = summarizeSavedRunIntegrity({
      run,
      currentParticipants: run.participantsSnapshot,
      currentSettings: demoMatchingSettings,
      activeCohort: "June"
    });

    expect(summary.status).toBe("stale");
    expect(summary.assignedCountMismatch).toBe(2);
    expect(summary.missingSnapshotParticipants).toBe(2);
  });

  it("summarizes integrity status across saved runs", () => {
    const run = savedRun();
    const verified = summarizeSavedRunIntegrity({
      run,
      currentParticipants: run.participantsSnapshot,
      currentSettings: demoMatchingSettings,
      activeCohort: "June"
    });
    const review = { ...verified, status: "review" as const };
    const stale = { ...verified, status: "stale" as const };

    expect(summarizeSavedRunIntegrityOverview([verified, review, stale])).toEqual({
      verified: 1,
      review: 1,
      stale: 1,
      total: 3
    });
  });
});
