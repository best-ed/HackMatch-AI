import { describe, expect, it } from "vitest";
import type { MatchingSettings, Participant } from "@/lib/matching/types";
import { defaultMatchingSettings } from "@/lib/matching/types";
import { validateMatchingSettings } from "@/lib/settings-guardrails";
import {
  applySettingsValidationShortcut,
  buildSettingsValidationShortcuts,
  suggestFeasibleFixedTeamCount
} from "@/lib/settings-validation-shortcuts";

function participant(overrides: Partial<Participant>): Participant {
  return {
    id: "participant-1",
    fullName: "Jamie Rivera",
    email: "jamie@example.com",
    experienceLevel: "intermediate",
    primaryRole: "Backend",
    secondaryRoles: [],
    technicalSkills: ["Node.js"],
    nonTechnicalSkills: [],
    tools: ["GitHub"],
    interests: ["climate"],
    preferredTeammates: [],
    blockedTeammates: [],
    availability: ["weekend_morning"],
    consentToMatch: true,
    consentToShareContact: true,
    createdAt: "2026-06-16T10:00:00.000Z",
    updatedAt: "2026-06-16T10:00:00.000Z",
    ...overrides
  };
}

function settings(overrides: Partial<MatchingSettings>): MatchingSettings {
  return {
    ...defaultMatchingSettings,
    ...overrides,
    weights: {
      ...defaultMatchingSettings.weights,
      ...overrides.weights
    }
  };
}

describe("settings validation shortcuts", () => {
  it("offers direct fixes for invalid team sizing and fixed team counts", () => {
    const participants = [
      participant({ id: "one", email: "one@example.com" }),
      participant({ id: "two", email: "two@example.com" }),
      participant({ id: "three", email: "three@example.com" }),
      participant({ id: "four", email: "four@example.com" })
    ];
    const draft = settings({
      minTeamSize: 4,
      desiredTeamSize: 5,
      maxTeamSize: 3,
      numberOfTeams: 2,
      allowUnassignedParticipants: false
    });

    const shortcuts = buildSettingsValidationShortcuts({
      health: validateMatchingSettings(draft, participants),
      participants,
      settings: draft
    });

    expect(shortcuts.map((shortcut) => shortcut.id)).toEqual(
      expect.arrayContaining(["normalize-team-sizes", "fit-fixed-team-count", "clear-fixed-team-count", "allow-unassigned"])
    );
  });

  it("patches broken draft settings with safe corrective defaults", () => {
    const participants = [
      participant({ id: "one", email: "one@example.com" }),
      participant({ id: "two", email: "two@example.com" }),
      participant({ id: "three", email: "three@example.com" }),
      participant({ id: "four", email: "four@example.com" })
    ];
    const draft = settings({
      minTeamSize: 4,
      desiredTeamSize: 5,
      maxTeamSize: 3,
      numberOfTeams: 3,
      allowUnassignedParticipants: false,
      weights: {
        ...defaultMatchingSettings.weights,
        skillBalance: -2
      }
    });

    const normalized = applySettingsValidationShortcut({
      id: "normalize-team-sizes",
      participants,
      settings: draft
    });
    const fitted = applySettingsValidationShortcut({
      id: "fit-fixed-team-count",
      participants,
      settings: draft
    });
    const resetWeights = applySettingsValidationShortcut({
      id: "reset-negative-weights",
      participants,
      settings: draft
    });

    expect(normalized.minTeamSize).toBeLessThanOrEqual(normalized.desiredTeamSize);
    expect(normalized.desiredTeamSize).toBeLessThanOrEqual(normalized.maxTeamSize);
    expect(fitted.numberOfTeams).toBe(1);
    expect(resetWeights.weights.skillBalance).toBe(defaultMatchingSettings.weights.skillBalance);
  });

  it("routes cohort issues to the participant directory and relaxes missing role requirements", () => {
    const matchableWithoutCoverage = [
      participant({
        id: "researcher",
        email: "researcher@example.com",
        primaryRole: "Researcher",
        secondaryRoles: [],
        nonTechnicalSkills: ["Documentation"]
      })
    ];
    const notYetMatchable = [
      participant({
        id: "consent-off",
        email: "consent-off@example.com",
        consentToMatch: false,
        primaryRole: "Researcher"
      })
    ];
    const noMatchableSettings = settings({});
    const warningSettings = settings({
      requireBuilder: true,
      requirePresenter: true
    });

    const noMatchableShortcuts = buildSettingsValidationShortcuts({
      health: validateMatchingSettings(noMatchableSettings, notYetMatchable),
      participants: notYetMatchable,
      settings: noMatchableSettings
    });
    const roleShortcuts = buildSettingsValidationShortcuts({
      health: validateMatchingSettings(warningSettings, matchableWithoutCoverage),
      participants: matchableWithoutCoverage,
      settings: warningSettings
    });

    expect(noMatchableShortcuts.find((shortcut) => shortcut.id === "review-participant-consent")?.href).toBe("/admin/participants");
    expect(roleShortcuts.map((shortcut) => shortcut.id)).toEqual(
      expect.arrayContaining(["disable-require-builder", "disable-require-presenter"])
    );
  });

  it("suggests a fixed team count that stays inside cohort capacity bounds", () => {
    const participants = [
      participant({ id: "one", email: "one@example.com" }),
      participant({ id: "two", email: "two@example.com" }),
      participant({ id: "three", email: "three@example.com" }),
      participant({ id: "four", email: "four@example.com" }),
      participant({ id: "five", email: "five@example.com" }),
      participant({ id: "six", email: "six@example.com" }),
      participant({ id: "seven", email: "seven@example.com" })
    ];

    expect(
      suggestFeasibleFixedTeamCount(
        settings({
          minTeamSize: 3,
          desiredTeamSize: 4,
          maxTeamSize: 5,
          allowUnassignedParticipants: false
        }),
        participants
      )
    ).toBe(2);
  });
});
