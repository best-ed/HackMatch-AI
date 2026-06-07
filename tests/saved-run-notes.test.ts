import { describe, expect, it } from "vitest";
import { updateSavedRunNotes } from "@/lib/saved-run-notes";
import type { SavedMatchRun } from "@/lib/matching/types";

const baseRun: SavedMatchRun = {
  id: "run-1",
  name: "Final run",
  createdAt: "2026-06-08T00:00:00.000Z",
  participantCount: 4,
  assignedCount: 4,
  averageScore: 92,
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

describe("saved run notes", () => {
  it("updates notes for one run and preserves other runs", () => {
    const runs = [baseRun, { ...baseRun, id: "run-2", name: "Backup run" }];
    const next = updateSavedRunNotes(runs, "run-1", "  Final after mentor review.  ");

    expect(next[0].notes).toBe("Final after mentor review.");
    expect(next[1].notes).toBeUndefined();
  });

  it("clears blank notes", () => {
    const next = updateSavedRunNotes([{ ...baseRun, notes: "Old note" }], "run-1", "   ");

    expect(next[0].notes).toBeUndefined();
  });
});
