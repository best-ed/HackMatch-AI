import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { generateTeams } from "@/lib/matching/algorithm";
import { buildTeamPlacementExplanations } from "@/lib/team-placement";
import type { Participant } from "@/lib/matching/types";

function assignedIds(result: ReturnType<typeof generateTeams>) {
  return result.teams.flatMap((team) => team.participantIds);
}

describe("matching core", () => {
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

  it("preserves locked team membership", () => {
    const baseline = generateTeams(demoParticipants, demoMatchingSettings);
    const lockedTeam = baseline.teams[0];
    const result = generateTeams(demoParticipants, {
      ...demoMatchingSettings,
      lockedTeams: [{
        id: lockedTeam.id,
        name: lockedTeam.name,
        participantIds: lockedTeam.participantIds,
        locked: true
      }]
    });
    const preserved = result.teams.find((team) => team.id === lockedTeam.id);

    expect(preserved?.locked).toBe(true);
    expect(preserved?.participantIds).toEqual([...lockedTeam.participantIds].sort());
  });

  it("does not reassign locked participants to another team", () => {
    const baseline = generateTeams(demoParticipants, demoMatchingSettings);
    const lockedTeam = baseline.teams[0];
    const result = generateTeams(demoParticipants, {
      ...demoMatchingSettings,
      lockedTeams: [{
        id: lockedTeam.id,
        name: lockedTeam.name,
        participantIds: lockedTeam.participantIds,
        locked: true
      }]
    });
    const lockedIds = new Set(lockedTeam.participantIds);
    const appearances = result.teams.flatMap((team) =>
      team.participantIds
        .filter((participantId) => lockedIds.has(participantId))
        .map((participantId) => `${participantId}:${team.id}`)
    );

    expect(appearances).toHaveLength(lockedTeam.participantIds.length);
    expect(appearances.every((appearance) => appearance.endsWith(`:${lockedTeam.id}`))).toBe(true);
  });

  it("builds deterministic participant placement explanations", () => {
    const members = demoParticipants.slice(0, 4);
    const first = buildTeamPlacementExplanations(members);
    const second = buildTeamPlacementExplanations(members);

    expect(first).toEqual(second);
    expect(first).toHaveLength(members.length);
    expect(first[0].participantId).toBe(members[0].id);
    expect(first[0].reasons.length).toBeGreaterThan(0);
  });
});
