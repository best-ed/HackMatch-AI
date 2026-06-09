import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import type { MatchingResult, SavedMatchRun } from "@/lib/matching/types";
import { rowToSavedRun, savedRunToRow } from "@/lib/saved-run-persistence";

const result: MatchingResult = {
  teams: [],
  scoreBreakdowns: {},
  explanations: [],
  warnings: [],
  unassignedParticipants: []
};

describe("saved run persistence", () => {
  it("serializes and restores saved run metadata for Supabase rows", () => {
    const run: SavedMatchRun = {
      id: "run-1",
      name: "Final run",
      notes: "Organizer approved.",
      isFinal: true,
      createdAt: "2026-06-10T08:00:00.000Z",
      participantCount: 3,
      assignedCount: 3,
      averageScore: 91,
      cohort: "June",
      settingsSnapshot: demoMatchingSettings,
      participantsSnapshot: demoParticipants.slice(0, 3),
      result
    };

    const row = savedRunToRow(run);

    expect(row.notes).toBe("Organizer approved.");
    expect(row.is_final).toBe(true);
    expect(row.cohort).toBe("June");
    expect(rowToSavedRun(row)).toEqual(run);
  });

  it("normalizes blank notes and missing cohort for persistence", () => {
    const row = savedRunToRow({
      id: "run-2",
      name: "Draft",
      notes: " ",
      createdAt: "2026-06-10T08:00:00.000Z",
      participantCount: 0,
      assignedCount: 0,
      averageScore: 0,
      settingsSnapshot: demoMatchingSettings,
      participantsSnapshot: [],
      result
    });

    expect(row.notes).toBeNull();
    expect(row.cohort).toBe("General");
    expect(row.is_final).toBe(false);
  });
});
