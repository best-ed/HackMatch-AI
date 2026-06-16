import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { generateTeams } from "@/lib/matching/algorithm";
import { evaluateMatchingReadiness } from "@/lib/matching-readiness";
import { summarizeSettingsChanges } from "@/lib/settings-changes";
import { compareMatchingImpact, summarizeMatchingImpact } from "@/lib/settings-impact";
import { matchingPresets, validateMatchingSettings } from "@/lib/settings-guardrails";

function assignedIds(result: ReturnType<typeof generateTeams>) {
  return result.teams.flatMap((team) => team.participantIds);
}

describe("settings and readiness flow", () => {
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

  it("validates impossible matching settings", () => {
    const health = validateMatchingSettings(
      {
        ...demoMatchingSettings,
        desiredTeamSize: 6,
        minTeamSize: 7,
        maxTeamSize: 5,
        weights: {
          ...demoMatchingSettings.weights,
          roleCoverage: -1
        }
      },
      demoParticipants
    );

    expect(health.status).toBe("error");
    expect(health.errors.some((error) => error.includes("Minimum team size"))).toBe(true);
    expect(health.errors.some((error) => error.includes("Weights cannot be negative"))).toBe(true);
  });

  it("summarizes matching settings impact previews", () => {
    const current = summarizeMatchingImpact(generateTeams(demoParticipants, demoMatchingSettings));
    const draft = summarizeMatchingImpact(generateTeams(demoParticipants, {
      ...demoMatchingSettings,
      numberOfTeams: 6
    }));
    const delta = compareMatchingImpact(current, draft);

    expect(current.teamCount).toBeGreaterThan(0);
    expect(current.assignedCount + current.unassignedCount).toBe(demoParticipants.length);
    expect(draft.teamCount).toBe(6);
    expect(delta.teamCount).toBe(draft.teamCount - current.teamCount);
    expect(delta.averageScore).toBe(draft.averageScore - current.averageScore);
  });

  it("summarizes draft settings changes", () => {
    const changes = summarizeSettingsChanges(demoMatchingSettings, {
      ...demoMatchingSettings,
      desiredTeamSize: demoMatchingSettings.desiredTeamSize + 1,
      requirePresenter: !demoMatchingSettings.requirePresenter,
      weights: {
        ...demoMatchingSettings.weights,
        roleCoverage: demoMatchingSettings.weights.roleCoverage + 0.5
      }
    });

    expect(changes.map((change) => change.label)).toContain("Desired team size");
    expect(changes.map((change) => change.label)).toContain("Require presenter");
    expect(changes.map((change) => change.label)).toContain("Role coverage weight");
  });

  it("evaluates matching readiness with actionable items", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const readiness = evaluateMatchingReadiness(result, demoParticipants, demoMatchingSettings);

    expect(readiness.score).toBeGreaterThan(0);
    expect(readiness.eligibleCount).toBe(demoParticipants.filter((participant) => participant.consentToMatch).length);
    expect(readiness.assignedCount).toBe(assignedIds(result).length);
    expect(readiness.items.length).toBeGreaterThan(0);
    expect(readiness.items.every((item) => item.action.length > 0)).toBe(true);
    expect(readiness.items.every((item) => item.actionHref.startsWith("/"))).toBe(true);
    expect(readiness.items.every((item) => item.actionLabel.length > 0)).toBe(true);
  });

  it("flags readiness blockers for impossible settings", () => {
    const brokenSettings = {
      ...demoMatchingSettings,
      minTeamSize: 5,
      desiredTeamSize: 3
    };
    const result = generateTeams([], brokenSettings);
    const readiness = evaluateMatchingReadiness(result, [], brokenSettings);

    expect(readiness.items.some((item) => item.severity === "blocker")).toBe(true);
    expect(readiness.items.some((item) => item.title === "No matchable participants")).toBe(true);
    expect(readiness.items.find((item) => item.title === "Settings need fixing")?.actionHref).toBe("/admin/settings");
  });
});
