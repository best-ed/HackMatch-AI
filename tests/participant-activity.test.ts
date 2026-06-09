import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import type { MatchingResult, SavedMatchRun } from "@/lib/matching/types";
import { buildParticipantActivityTimeline } from "@/lib/participant-activity";

const emptyResult: MatchingResult = {
  teams: [],
  scoreBreakdowns: {},
  explanations: [],
  warnings: [],
  unassignedParticipants: []
};

function savedRun(overrides: Partial<SavedMatchRun>): SavedMatchRun {
  return {
    id: "run-1",
    name: "Match run 1",
    createdAt: "2026-06-09T08:00:00.000Z",
    participantCount: 2,
    assignedCount: 2,
    averageScore: 91,
    cohort: "June",
    settingsSnapshot: demoMatchingSettings,
    participantsSnapshot: [],
    result: emptyResult,
    ...overrides
  };
}

describe("participant activity timeline", () => {
  it("sorts participant and saved run activity by most recent timestamp", () => {
    const participants = [
      {
        ...demoParticipants[0],
        id: "p-old",
        fullName: "Old Participant",
        cohort: "June",
        createdAt: "2026-06-08T08:00:00.000Z",
        updatedAt: "2026-06-08T08:00:00.000Z"
      },
      {
        ...demoParticipants[1],
        id: "p-new",
        fullName: "New Participant",
        cohort: "June",
        createdAt: "2026-06-09T09:00:00.000Z",
        updatedAt: "2026-06-09T09:00:00.000Z"
      }
    ];

    const timeline = buildParticipantActivityTimeline({
      participants,
      savedRuns: [savedRun({ id: "run-2", createdAt: "2026-06-09T10:00:00.000Z" })],
      cohort: "June"
    });

    expect(timeline.map((item) => item.id)).toEqual([
      "saved-run-run-2",
      "participant-created-p-new",
      "participant-created-p-old"
    ]);
  });

  it("limits activity to the active cohort", () => {
    const timeline = buildParticipantActivityTimeline({
      participants: [
        { ...demoParticipants[0], id: "p-june", cohort: "June" },
        { ...demoParticipants[1], id: "p-july", cohort: "July" }
      ],
      savedRuns: [
        savedRun({ id: "run-june", cohort: "June" }),
        savedRun({ id: "run-july", cohort: "July" })
      ],
      cohort: "June"
    });

    expect(timeline.map((item) => item.id)).toContain("participant-created-p-june");
    expect(timeline.map((item) => item.id)).toContain("saved-run-run-june");
    expect(timeline.map((item) => item.id)).not.toContain("participant-created-p-july");
    expect(timeline.map((item) => item.id)).not.toContain("saved-run-run-july");
  });
});
