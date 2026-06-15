import type { MatchingSettings, Participant, SavedMatchRun } from "@/lib/matching/types";

export type SavedRunRestorePreview = {
  runName: string;
  currentParticipantCount: number;
  restoredParticipantCount: number;
  participantDelta: number;
  currentCohort: string;
  restoredCohort: string;
  cohortWillChange: boolean;
  settingsWillChange: boolean;
  teamCount: number;
  assignedCount: number;
  warningCount: number;
  summary: string;
};

export function buildSavedRunRestorePreview({
  activeCohort,
  currentParticipants,
  currentSettings,
  run
}: {
  activeCohort: string;
  currentParticipants: Participant[];
  currentSettings: MatchingSettings;
  run: SavedMatchRun;
}): SavedRunRestorePreview {
  const restoredCohort = run.cohort?.trim() || "General";
  const restoredParticipantCount = run.participantsSnapshot.length;
  const currentParticipantCount = currentParticipants.length;
  const participantDelta = restoredParticipantCount - currentParticipantCount;
  const settingsWillChange = stableStringify(currentSettings) !== stableStringify(run.settingsSnapshot);
  const cohortWillChange = activeCohort !== restoredCohort;

  return {
    runName: run.name,
    currentParticipantCount,
    restoredParticipantCount,
    participantDelta,
    currentCohort: activeCohort,
    restoredCohort,
    cohortWillChange,
    settingsWillChange,
    teamCount: run.result.teams.length,
    assignedCount: run.assignedCount,
    warningCount: run.result.warnings.length,
    summary: [
      `${run.name} will replace ${currentParticipantCount} live participant record${currentParticipantCount === 1 ? "" : "s"} with ${restoredParticipantCount} saved snapshot record${restoredParticipantCount === 1 ? "" : "s"}.`,
      cohortWillChange ? `Active cohort will switch from ${activeCohort} to ${restoredCohort}.` : "Active cohort will stay the same.",
      settingsWillChange ? "Matching settings will be restored from the saved run." : "Matching settings already match this saved run."
    ].join(" ")
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
