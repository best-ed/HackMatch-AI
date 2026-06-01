import { describe, expect, it } from "vitest";
import { participantsToCsv, teamsToCsv } from "@/lib/export";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { generateTeams } from "@/lib/matching/algorithm";
import { planParticipantCsvImport } from "@/lib/participant-import";
import { matchingPresets } from "@/lib/settings-guardrails";
import type { Participant } from "@/lib/matching/types";

function assignedIds(result: ReturnType<typeof generateTeams>) {
  return result.teams.flatMap((team) => team.participantIds);
}

describe("deterministic matching", () => {
  it("returns the same output for the same input and settings", () => {
    const first = generateTeams(demoParticipants, demoMatchingSettings);
    const second = generateTeams(demoParticipants, demoMatchingSettings);
    expect(first.teams).toEqual(second.teams);
    expect(first.scoreBreakdowns).toEqual(second.scoreBreakdowns);
  });

  it("does not place a participant in multiple teams", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const ids = assignedIds(result);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("respects team size constraints", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    for (const team of result.teams) {
      expect(team.participantIds.length).toBeLessThanOrEqual(demoMatchingSettings.maxTeamSize);
    }
  });

  it("does not group blocked teammates", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    for (const team of result.teams) {
      expect(team.participantIds.includes("p06") && team.participantIds.includes("p14")).toBe(false);
    }
  });

  it("excludes participants without consent", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    expect(assignedIds(result)).not.toContain("p30");
    expect(result.unassignedParticipants).toContain("p30");
  });

  it("distributes advanced participants where possible", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const advancedIds = new Set(
      demoParticipants
        .filter((participant) => participant.experienceLevel === "advanced")
        .map((participant) => participant.id)
    );
    const teamsWithAdvanced = result.teams.filter((team) =>
      team.participantIds.some((id) => advancedIds.has(id))
    );
    expect(teamsWithAdvanced.length).toBeGreaterThanOrEqual(
      Math.min(result.teams.length, advancedIds.size)
    );
  });

  it("penalizes beginner-only teams", () => {
    const beginnerOnly: Participant[] = demoParticipants
      .filter((participant) => participant.experienceLevel === "beginner")
      .slice(0, 4)
      .map((participant, index) => ({
        ...participant,
        id: `b${index}`,
        blockedTeammates: [],
        consentToMatch: true
      }));
    const result = generateTeams(beginnerOnly, {
      ...demoMatchingSettings,
      numberOfTeams: 1
    });
    expect(result.teams[0].score?.constraintPenalty).toBeGreaterThan(0);
  });

  it("returns score breakdowns for every team", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    expect(Object.keys(result.scoreBreakdowns)).toHaveLength(result.teams.length);
    for (const team of result.teams) {
      expect(result.scoreBreakdowns[team.id].totalScore).toBeGreaterThanOrEqual(0);
    }
  });

  it("exports generated teams as CSV", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const csv = teamsToCsv(result, demoParticipants);
    expect(csv.split("\n")[0]).toContain("team_id,team_name,team_score");
    expect(csv).toContain("Avery Chen");
  });

  it("exports participants as CSV", () => {
    const csv = participantsToCsv(demoParticipants);
    expect(csv.split("\n")[0]).toContain("participant_id,access_token,cohort");
    expect(csv).toContain("Avery Chen");
    expect(csv).toContain("consent_to_match");
  });

  it("imports participants from exported CSV and skips duplicates by default", () => {
    const csv = participantsToCsv([demoParticipants[0]]);
    const plan = planParticipantCsvImport({
      csv,
      existingParticipants: demoParticipants,
      activeCohort: "General",
      now: "2026-05-31T00:00:00.000Z"
    });

    expect(plan.createdCount).toBe(0);
    expect(plan.skippedCount).toBe(1);
    expect(plan.errors).toEqual([]);
    expect(plan.participants).toHaveLength(demoParticipants.length);
  });

  it("imports new participants and defaults missing cohort to active cohort", () => {
    const csv = [
      "full_name,email,primary_role,technical_skills,availability,consent_to_match",
      "\"Taylor Green\",taylor@example.com,Backend,\"Node; SQL\",weekend_morning,true"
    ].join("\n");
    const plan = planParticipantCsvImport({
      csv,
      existingParticipants: demoParticipants,
      activeCohort: "May Hackathon",
      now: "2026-05-31T00:00:00.000Z"
    });

    const imported = plan.participants.find((participant) => participant.email === "taylor@example.com");
    expect(plan.createdCount).toBe(1);
    expect(imported?.cohort).toBe("May Hackathon");
    expect(imported?.technicalSkills).toEqual(["Node", "SQL"]);
  });

  it("provides deterministic matching settings presets", () => {
    expect(matchingPresets.map((preset) => preset.id)).toEqual([
      "balanced",
      "skill-heavy",
      "beginner-friendly",
      "strict-constraints"
    ]);
    expect(matchingPresets.find((preset) => preset.id === "skill-heavy")?.settings.weights.skillBalance)
      .toBeGreaterThan(demoMatchingSettings.weights.skillBalance);
  });

});
