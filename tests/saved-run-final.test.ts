import { describe, expect, it } from "vitest";
import { clearFinalSavedRun, getFinalSavedRun, markFinalSavedRun } from "@/lib/saved-run-final";
import type { SavedMatchRun } from "@/lib/matching/types";

function savedRun(id: string): SavedMatchRun {
  return {
    id,
    name: id,
    createdAt: "2026-06-09T00:00:00.000Z",
    participantCount: 0,
    assignedCount: 0,
    averageScore: 0,
    settingsSnapshot: {
      desiredTeamSize: 4,
      minTeamSize: 3,
      maxTeamSize: 5,
      allowUnassignedParticipants: true,
      requireBuilder: true,
      requirePresenter: true,
      preventBeginnerOnlyTeams: true,
      distributeAdvancedParticipants: true,
      weights: {
        roleCoverage: 2,
        skillBalance: 1.5,
        experienceBalance: 1.4,
        interestAlignment: 1,
        availabilityOverlap: 1,
        participantPreferences: 0.8
      }
    },
    participantsSnapshot: [],
    result: {
      teams: [],
      scoreBreakdowns: {},
      explanations: [],
      warnings: [],
      unassignedParticipants: []
    }
  };
}

describe("saved run final marker", () => {
  it("marks exactly one saved run as final", () => {
    const runs = [savedRun("run-1"), { ...savedRun("run-2"), isFinal: true }];
    const next = markFinalSavedRun(runs, "run-1");

    expect(getFinalSavedRun(next)?.id).toBe("run-1");
    expect(next.filter((run) => run.isFinal)).toHaveLength(1);
  });

  it("clears the final marker", () => {
    const next = clearFinalSavedRun([{ ...savedRun("run-1"), isFinal: true }]);

    expect(getFinalSavedRun(next)).toBeUndefined();
  });
});
