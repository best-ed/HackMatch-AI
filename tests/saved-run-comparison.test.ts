import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import type { MatchingResult } from "@/lib/matching/types";
import {
  compareSavedRunToLive,
  describeSavedRunComparison
} from "@/lib/saved-run-comparison";

function result(teamA: string[], teamB: string[] = [], warnings: string[] = []): MatchingResult {
  return {
    teams: [
      {
        id: "team-1",
        name: "Team 1",
        participantIds: teamA,
        score: {
          roleCoverageScore: 90,
          skillCoverageScore: 90,
          experienceBalanceScore: 90,
          interestAlignmentScore: 90,
          availabilityCompatibilityScore: 90,
          preferenceSatisfactionScore: 90,
          constraintPenalty: 0,
          totalScore: 90
        }
      },
      {
        id: "team-2",
        name: "Team 2",
        participantIds: teamB,
        score: {
          roleCoverageScore: 80,
          skillCoverageScore: 80,
          experienceBalanceScore: 80,
          interestAlignmentScore: 80,
          availabilityCompatibilityScore: 80,
          preferenceSatisfactionScore: 80,
          constraintPenalty: 0,
          totalScore: 80
        }
      }
    ],
    scoreBreakdowns: {},
    explanations: [],
    warnings,
    unassignedParticipants: []
  };
}

describe("saved run comparison", () => {
  it("tracks moved, added, removed, and changed settings", () => {
    const liveParticipants = demoParticipants.slice(0, 4);
    const savedParticipants = demoParticipants.slice(0, 3);
    const comparison = compareSavedRunToLive({
      liveResult: result([liveParticipants[0].id], [liveParticipants[1].id, liveParticipants[2].id, liveParticipants[3].id]),
      liveParticipants,
      liveSettings: { ...demoMatchingSettings, desiredTeamSize: 5 },
      savedResult: result([savedParticipants[0].id, savedParticipants[1].id], [savedParticipants[2].id], ["Saved warning"]),
      savedParticipants,
      savedSettings: demoMatchingSettings
    });

    expect(comparison.movedParticipants.map((move) => move.name)).toContain(liveParticipants[1].fullName);
    expect(comparison.addedParticipants).toEqual([
      { id: liveParticipants[3].id, name: liveParticipants[3].fullName }
    ]);
    expect(comparison.removedParticipants).toEqual([]);
    expect(comparison.warningDelta).toBe(-1);
    expect(comparison.settingsChanges.find((change) => change.label === "Desired team size")).toEqual({
      label: "Desired team size",
      liveValue: "5",
      savedValue: String(demoMatchingSettings.desiredTeamSize)
    });
  });

  it("describes snapshot and settings drift for organizer review", () => {
    const participants = demoParticipants.slice(0, 3);
    const comparison = compareSavedRunToLive({
      liveResult: result([participants[0].id, participants[1].id], [participants[2].id]),
      liveParticipants: participants,
      liveSettings: { ...demoMatchingSettings, requirePresenter: false },
      savedResult: result([participants[0].id], [participants[1].id]),
      savedParticipants: participants.slice(0, 2),
      savedSettings: demoMatchingSettings
    });

    const description = describeSavedRunComparison(comparison, "Run 1");

    expect(description).toContain("added");
    expect(description).toContain("setting");
  });
});
