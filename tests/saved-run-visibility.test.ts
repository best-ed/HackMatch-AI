import { describe, expect, it } from "vitest";
import type { SavedMatchRun } from "@/lib/matching/types";
import type { SavedRunIntegritySummary } from "@/lib/saved-run-integrity";
import { filterSavedRuns, summarizeSavedRunVisibilityCounts } from "@/lib/saved-run-visibility";

function run(overrides: Partial<SavedMatchRun>): SavedMatchRun {
  return {
    id: "run-1",
    name: "June Run",
    createdAt: "2026-06-16T10:00:00.000Z",
    participantCount: 4,
    assignedCount: 4,
    averageScore: 90,
    cohort: "June",
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
    result: { teams: [], scoreBreakdowns: {}, explanations: [], warnings: [], unassignedParticipants: [] },
    ...overrides
  };
}

function integrity(runId: string, status: SavedRunIntegritySummary["status"]): SavedRunIntegritySummary {
  return {
    runId,
    status,
    participantDelta: 0,
    missingSnapshotParticipants: 0,
    assignedCountMismatch: 0,
    settingsChanged: false,
    cohortChanged: false,
    checks: []
  };
}

describe("saved run visibility", () => {
  it("filters runs by cohort, final marker, attention state, and query", () => {
    const runs = [
      run({ id: "run-june-final", name: "June Final", isFinal: true, cohort: "June" }),
      run({ id: "run-june-review", name: "June Review", cohort: "June" }),
      run({ id: "run-may", name: "May Snapshot", cohort: "May" })
    ];
    const integrityById = new Map([
      ["run-june-final", integrity("run-june-final", "verified")],
      ["run-june-review", integrity("run-june-review", "review")],
      ["run-may", integrity("run-may", "stale")]
    ]);

    expect(filterSavedRuns({ activeCohort: "June", filter: "active-cohort", integrityById, query: "", runs })).toHaveLength(2);
    expect(filterSavedRuns({ activeCohort: "June", filter: "final", integrityById, query: "", runs }).map((item) => item.id)).toEqual(["run-june-final"]);
    expect(filterSavedRuns({ activeCohort: "June", filter: "attention", integrityById, query: "", runs }).map((item) => item.id)).toEqual(["run-june-review", "run-may"]);
    expect(filterSavedRuns({ activeCohort: "June", filter: "all", integrityById, query: "may", runs }).map((item) => item.id)).toEqual(["run-may"]);
  });

  it("summarizes counts for visibility chips", () => {
    const runs = [
      run({ id: "run-june-final", isFinal: true, cohort: "June" }),
      run({ id: "run-june-review", cohort: "June" }),
      run({ id: "run-may", cohort: "May" })
    ];
    const integrityById = new Map([
      ["run-june-final", integrity("run-june-final", "verified")],
      ["run-june-review", integrity("run-june-review", "review")],
      ["run-may", integrity("run-may", "stale")]
    ]);

    expect(summarizeSavedRunVisibilityCounts({ activeCohort: "June", integrityById, runs })).toEqual({
      all: 3,
      "active-cohort": 2,
      attention: 2,
      final: 1
    });
  });
});
