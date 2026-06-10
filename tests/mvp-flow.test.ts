import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { teamsToCsv } from "@/lib/export";
import { generateTeams } from "@/lib/matching/algorithm";
import { markFinalSavedRun } from "@/lib/saved-run-final";
import { createSavedMatchRun } from "@/lib/saved-run-factory";

describe("MVP organizer flow", () => {
  it("generates teams, saves a run, marks it final, and exports CSV", () => {
    const participants = demoParticipants.slice(0, 12).map((participant) => ({
      ...participant,
      cohort: "June Demo",
      consentToMatch: true
    }));
    const result = generateTeams(participants, {
      ...demoMatchingSettings,
      desiredTeamSize: 4,
      minTeamSize: 3,
      maxTeamSize: 4
    });

    const run = createSavedMatchRun({
      result,
      participants,
      settings: demoMatchingSettings,
      activeCohort: "June Demo",
      savedRunCount: 0,
      name: "June final candidate",
      createdAt: "2026-06-10T09:00:00.000Z"
    });
    const [finalRun] = markFinalSavedRun([run], run.id);
    const csv = teamsToCsv(finalRun.result, finalRun.participantsSnapshot);

    expect(result.teams.length).toBeGreaterThan(0);
    expect(run.participantCount).toBe(12);
    expect(run.assignedCount).toBeGreaterThan(0);
    expect(run.cohort).toBe("June Demo");
    expect(finalRun.isFinal).toBe(true);
    expect(csv).toContain("team_id");
    expect(csv).toContain("Team 1");
  });
});
