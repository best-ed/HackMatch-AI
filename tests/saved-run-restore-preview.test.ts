import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import type { SavedMatchRun } from "@/lib/matching/types";
import { buildSavedRunRestorePreview } from "@/lib/saved-run-restore-preview";

function savedRun(overrides: Partial<SavedMatchRun> = {}): SavedMatchRun {
  const participants = demoParticipants.slice(0, 4).map((participant) => ({
    ...participant,
    cohort: "June"
  }));

  return {
    id: "run-1",
    name: "June Finals",
    createdAt: "2026-06-15T10:00:00.000Z",
    participantCount: participants.length,
    assignedCount: 4,
    averageScore: 88,
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
      warnings: ["Review contact sharing."],
      unassignedParticipants: []
    },
    ...overrides
  };
}

describe("saved run restore preview", () => {
  it("summarizes participant, cohort, settings, and warning impact", () => {
    const run = savedRun();
    const preview = buildSavedRunRestorePreview({
      activeCohort: "General",
      currentParticipants: demoParticipants,
      currentSettings: { ...demoMatchingSettings, desiredTeamSize: 5 },
      run
    });

    expect(preview.currentParticipantCount).toBe(demoParticipants.length);
    expect(preview.restoredParticipantCount).toBe(4);
    expect(preview.participantDelta).toBe(4 - demoParticipants.length);
    expect(preview.cohortWillChange).toBe(true);
    expect(preview.settingsWillChange).toBe(true);
    expect(preview.warningCount).toBe(1);
    expect(preview.summary).toContain("will replace");
  });

  it("recognizes matching cohort and settings", () => {
    const run = savedRun();
    const preview = buildSavedRunRestorePreview({
      activeCohort: "June",
      currentParticipants: run.participantsSnapshot,
      currentSettings: demoMatchingSettings,
      run
    });

    expect(preview.cohortWillChange).toBe(false);
    expect(preview.settingsWillChange).toBe(false);
    expect(preview.summary).toContain("Active cohort will stay the same.");
  });
});
