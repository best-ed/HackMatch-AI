import { defaultMatchingSettings, type MatchingSettings, type Participant } from "@/lib/matching/types";
import {
  cohortHasObviousBuilder,
  cohortHasObviousPresenter,
  countMatchableParticipants,
  type SettingsHealth
} from "@/lib/settings-guardrails";

export type SettingsValidationShortcutId =
  | "normalize-team-sizes"
  | "fit-fixed-team-count"
  | "clear-fixed-team-count"
  | "allow-unassigned"
  | "reset-negative-weights"
  | "disable-require-builder"
  | "disable-require-presenter"
  | "review-participant-consent";

export type SettingsValidationShortcut = {
  id: SettingsValidationShortcutId;
  label: string;
  description: string;
  kind: "patch" | "link";
  section: "constraints" | "weights" | "participants";
  tone: "error" | "warning";
  href?: string;
};

export function buildSettingsValidationShortcuts({
  health,
  participants,
  settings
}: {
  health: SettingsHealth;
  participants: Participant[];
  settings: MatchingSettings;
}): SettingsValidationShortcut[] {
  const shortcuts: SettingsValidationShortcut[] = [];
  const matchableParticipants = participants.filter((participant) => participant.consentToMatch);
  const matchableCount = countMatchableParticipants(participants);
  const negativeWeightKeys = Object.entries(settings.weights)
    .filter(([, value]) => value < 0)
    .map(([key]) => key);
  const fixedTeamProblem = hasFixedTeamProblem(settings, matchableCount);
  const suggestedTeamCount = suggestFeasibleFixedTeamCount(settings, participants);

  if (hasTeamSizeConflict(settings)) {
    shortcuts.push({
      id: "normalize-team-sizes",
      label: "Normalize team sizes",
      description: "Expand the draft range so minimum, desired, and maximum values become valid again.",
      kind: "patch",
      section: "constraints",
      tone: "error"
    });
  }

  if (settings.numberOfTeams && fixedTeamProblem && suggestedTeamCount && suggestedTeamCount !== settings.numberOfTeams) {
    shortcuts.push({
      id: "fit-fixed-team-count",
      label: `Fit fixed teams to ${suggestedTeamCount}`,
      description: "Adjust the fixed team count to match the current cohort size and team-size rules.",
      kind: "patch",
      section: "constraints",
      tone: "error"
    });
  }

  if (settings.numberOfTeams && fixedTeamProblem) {
    shortcuts.push({
      id: "clear-fixed-team-count",
      label: "Clear fixed team count",
      description: "Let the matcher derive the team count from the current cohort instead of enforcing a bad fit.",
      kind: "patch",
      section: "constraints",
      tone: health.status === "error" ? "error" : "warning"
    });
  }

  if (settings.numberOfTeams && fixedTeamProblem && !settings.allowUnassignedParticipants) {
    shortcuts.push({
      id: "allow-unassigned",
      label: "Allow overflow as unassigned",
      description: "Keep the current team count but allow extra participants to remain unassigned when capacity runs out.",
      kind: "patch",
      section: "constraints",
      tone: "warning"
    });
  }

  if (negativeWeightKeys.length > 0) {
    shortcuts.push({
      id: "reset-negative-weights",
      label: "Reset negative weights",
      description: `Restore default values for invalid negative weights: ${negativeWeightKeys.join(", ")}.`,
      kind: "patch",
      section: "weights",
      tone: "error"
    });
  }

  if (matchableCount === 0) {
    shortcuts.push({
      id: "review-participant-consent",
      label: "Review participant consent",
      description: "No one in the active cohort is matchable yet. Open the directory and confirm consent to match.",
      kind: "link",
      section: "participants",
      tone: "warning",
      href: "/admin/participants"
    });
  }

  if (settings.requireBuilder && matchableParticipants.length > 0 && !cohortHasObviousBuilder(matchableParticipants)) {
    shortcuts.push({
      id: "disable-require-builder",
      label: "Relax builder requirement",
      description: "Turn off the builder constraint for this draft when the cohort does not currently include a clear builder profile.",
      kind: "patch",
      section: "constraints",
      tone: "warning"
    });
  }

  if (settings.requirePresenter && matchableParticipants.length > 0 && !cohortHasObviousPresenter(matchableParticipants)) {
    shortcuts.push({
      id: "disable-require-presenter",
      label: "Relax presenter requirement",
      description: "Turn off the presenter constraint for this draft when the cohort lacks a clear presenter or product profile.",
      kind: "patch",
      section: "constraints",
      tone: "warning"
    });
  }

  return shortcuts;
}

export function applySettingsValidationShortcut({
  id,
  participants,
  settings
}: {
  id: SettingsValidationShortcutId;
  participants: Participant[];
  settings: MatchingSettings;
}) {
  switch (id) {
    case "normalize-team-sizes": {
      const maxTeamSize = Math.max(2, settings.maxTeamSize, settings.desiredTeamSize, settings.minTeamSize);
      const minTeamSize = Math.max(1, Math.min(settings.minTeamSize, settings.desiredTeamSize, maxTeamSize));
      const desiredTeamSize = Math.min(Math.max(settings.desiredTeamSize, minTeamSize), maxTeamSize);
      return {
        ...settings,
        desiredTeamSize,
        maxTeamSize,
        minTeamSize
      };
    }
    case "fit-fixed-team-count": {
      const nextTeamCount = suggestFeasibleFixedTeamCount(settings, participants);
      return nextTeamCount
        ? {
            ...settings,
            numberOfTeams: nextTeamCount
          }
        : settings;
    }
    case "clear-fixed-team-count":
      return {
        ...settings,
        numberOfTeams: undefined
      };
    case "allow-unassigned":
      return {
        ...settings,
        allowUnassignedParticipants: true
      };
    case "reset-negative-weights":
      return {
        ...settings,
        weights: {
          ...settings.weights,
          roleCoverage:
            settings.weights.roleCoverage < 0 ? defaultMatchingSettings.weights.roleCoverage : settings.weights.roleCoverage,
          skillBalance:
            settings.weights.skillBalance < 0 ? defaultMatchingSettings.weights.skillBalance : settings.weights.skillBalance,
          experienceBalance:
            settings.weights.experienceBalance < 0
              ? defaultMatchingSettings.weights.experienceBalance
              : settings.weights.experienceBalance,
          interestAlignment:
            settings.weights.interestAlignment < 0
              ? defaultMatchingSettings.weights.interestAlignment
              : settings.weights.interestAlignment,
          availabilityOverlap:
            settings.weights.availabilityOverlap < 0
              ? defaultMatchingSettings.weights.availabilityOverlap
              : settings.weights.availabilityOverlap,
          participantPreferences:
            settings.weights.participantPreferences < 0
              ? defaultMatchingSettings.weights.participantPreferences
              : settings.weights.participantPreferences
        }
      };
    case "disable-require-builder":
      return {
        ...settings,
        requireBuilder: false
      };
    case "disable-require-presenter":
      return {
        ...settings,
        requirePresenter: false
      };
    case "review-participant-consent":
      return settings;
  }
}

export function suggestFeasibleFixedTeamCount(
  settings: MatchingSettings,
  participants: Participant[]
) {
  const matchableCount = countMatchableParticipants(participants);
  if (matchableCount === 0) return undefined;

  const minTeamSize = Math.max(1, settings.minTeamSize);
  const desiredTeamSize = Math.max(minTeamSize, settings.desiredTeamSize);
  const maxTeamSize = Math.max(desiredTeamSize, settings.maxTeamSize);
  const lowerBound = settings.allowUnassignedParticipants ? 1 : Math.ceil(matchableCount / maxTeamSize);
  const upperBound = Math.max(1, Math.floor(matchableCount / minTeamSize));

  if (lowerBound > upperBound) {
    return undefined;
  }

  const desiredTeamCount = Math.max(1, Math.ceil(matchableCount / desiredTeamSize));
  return Math.min(Math.max(desiredTeamCount, lowerBound), upperBound);
}

function hasTeamSizeConflict(settings: MatchingSettings) {
  return (
    settings.maxTeamSize < 2 ||
    settings.minTeamSize > settings.desiredTeamSize ||
    settings.desiredTeamSize > settings.maxTeamSize ||
    settings.minTeamSize > settings.maxTeamSize
  );
}

function hasFixedTeamProblem(settings: MatchingSettings, matchableCount: number) {
  if (!settings.numberOfTeams || settings.numberOfTeams <= 0) {
    return false;
  }

  const minimumNeeded = settings.numberOfTeams * settings.minTeamSize;
  const desiredNeeded = settings.numberOfTeams * settings.desiredTeamSize;
  const maximumCapacity = settings.numberOfTeams * settings.maxTeamSize;

  if (matchableCount < minimumNeeded) return true;
  if (matchableCount < desiredNeeded) return true;
  if (!settings.allowUnassignedParticipants && matchableCount > maximumCapacity) return true;

  return false;
}
