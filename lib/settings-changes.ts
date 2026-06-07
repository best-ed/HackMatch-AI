import type { MatchingSettings, MatchingWeights } from "@/lib/matching/types";

export type SettingsChangeSummary = {
  label: string;
  current: string;
  draft: string;
  category: "team-size" | "constraint" | "weight";
};

const constraintLabels: Array<{
  key: keyof Omit<MatchingSettings, "weights" | "lockedTeams">;
  label: string;
  category: SettingsChangeSummary["category"];
}> = [
  { key: "desiredTeamSize", label: "Desired team size", category: "team-size" },
  { key: "minTeamSize", label: "Minimum team size", category: "team-size" },
  { key: "maxTeamSize", label: "Maximum team size", category: "team-size" },
  { key: "numberOfTeams", label: "Number of teams", category: "team-size" },
  { key: "allowUnassignedParticipants", label: "Allow unassigned participants", category: "constraint" },
  { key: "requireBuilder", label: "Require builder", category: "constraint" },
  { key: "requirePresenter", label: "Require presenter", category: "constraint" },
  { key: "preventBeginnerOnlyTeams", label: "Prevent beginner-only teams", category: "constraint" },
  { key: "distributeAdvancedParticipants", label: "Distribute advanced participants", category: "constraint" }
];

const weightLabels: Array<{ key: keyof MatchingWeights; label: string }> = [
  { key: "roleCoverage", label: "Role coverage weight" },
  { key: "skillBalance", label: "Skill balance weight" },
  { key: "experienceBalance", label: "Experience balance weight" },
  { key: "interestAlignment", label: "Interest alignment weight" },
  { key: "availabilityOverlap", label: "Availability overlap weight" },
  { key: "participantPreferences", label: "Participant preferences weight" }
];

export function summarizeSettingsChanges(
  current: MatchingSettings,
  draft: MatchingSettings
): SettingsChangeSummary[] {
  const changes: SettingsChangeSummary[] = [];

  constraintLabels.forEach(({ key, label, category }) => {
    if (current[key] !== draft[key]) {
      changes.push({
        label,
        current: formatValue(current[key]),
        draft: formatValue(draft[key]),
        category
      });
    }
  });

  weightLabels.forEach(({ key, label }) => {
    if (current.weights[key] !== draft.weights[key]) {
      changes.push({
        label,
        current: formatValue(current.weights[key]),
        draft: formatValue(draft.weights[key]),
        category: "weight"
      });
    }
  });

  return changes;
}

function formatValue(value: string | number | boolean | undefined) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === undefined || value === "") return "Auto";
  return String(value);
}
