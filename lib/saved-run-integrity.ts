import type { MatchingSettings, Participant, SavedMatchRun } from "@/lib/matching/types";

export type SavedRunIntegrityStatus = "verified" | "review" | "stale";

export type SavedRunIntegrityCheck = {
  label: string;
  status: SavedRunIntegrityStatus;
  detail: string;
};

export type SavedRunIntegritySummary = {
  runId: string;
  status: SavedRunIntegrityStatus;
  participantDelta: number;
  missingSnapshotParticipants: number;
  assignedCountMismatch: number;
  settingsChanged: boolean;
  cohortChanged: boolean;
  checks: SavedRunIntegrityCheck[];
};

export type SavedRunIntegrityOverview = {
  verified: number;
  review: number;
  stale: number;
  total: number;
};

export function summarizeSavedRunIntegrity({
  run,
  currentParticipants,
  currentSettings,
  activeCohort
}: {
  run: SavedMatchRun;
  currentParticipants: Participant[];
  currentSettings: MatchingSettings;
  activeCohort: string;
}): SavedRunIntegritySummary {
  const assignedCount = run.result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  const assignedCountMismatch = assignedCount - run.assignedCount;
  const snapshotIds = new Set(run.participantsSnapshot.map((participant) => participant.id));
  const currentIds = new Set(currentParticipants.map((participant) => participant.id));
  const resultParticipantIds = new Set([
    ...run.result.teams.flatMap((team) => team.participantIds),
    ...run.result.unassignedParticipants
  ]);
  const missingSnapshotParticipants = Array.from(resultParticipantIds).filter((id) => !snapshotIds.has(id)).length;
  const participantDelta = currentIds.size - snapshotIds.size;
  const settingsChanged = stableStringify(stripLockedTeams(currentSettings)) !== stableStringify(stripLockedTeams(run.settingsSnapshot));
  const cohortChanged = (run.cohort ?? "General") !== activeCohort;

  const checks: SavedRunIntegrityCheck[] = [
    {
      label: "Snapshot participants",
      status: missingSnapshotParticipants ? "stale" : "verified",
      detail: missingSnapshotParticipants
        ? `${missingSnapshotParticipants} result participant(s) are missing from the saved snapshot.`
        : "Every assigned or unassigned participant exists in the saved snapshot."
    },
    {
      label: "Saved metrics",
      status: assignedCountMismatch ? "stale" : "verified",
      detail: assignedCountMismatch
        ? `Stored assigned count differs from team membership by ${assignedCountMismatch}.`
        : "Stored assigned count matches saved team membership."
    },
    {
      label: "Live participant drift",
      status: participantDelta === 0 ? "verified" : "review",
      detail: participantDelta === 0
        ? "Current cohort size matches the saved participant snapshot."
        : `Current cohort has ${Math.abs(participantDelta)} ${participantDelta > 0 ? "more" : "fewer"} participant(s) than this snapshot.`
    },
    {
      label: "Settings drift",
      status: settingsChanged ? "review" : "verified",
      detail: settingsChanged
        ? "Live matching settings differ from the saved settings snapshot."
        : "Live matching settings match the saved settings snapshot."
    },
    {
      label: "Cohort context",
      status: cohortChanged ? "review" : "verified",
      detail: cohortChanged
        ? `Viewing ${activeCohort}, but this run was saved for ${run.cohort ?? "General"}.`
        : "Saved cohort matches the active cohort."
    }
  ];

  return {
    runId: run.id,
    status: summarizeChecks(checks),
    participantDelta,
    missingSnapshotParticipants,
    assignedCountMismatch,
    settingsChanged,
    cohortChanged,
    checks
  };
}

export function summarizeSavedRunIntegrityOverview(
  summaries: SavedRunIntegritySummary[]
): SavedRunIntegrityOverview {
  return {
    verified: summaries.filter((summary) => summary.status === "verified").length,
    review: summaries.filter((summary) => summary.status === "review").length,
    stale: summaries.filter((summary) => summary.status === "stale").length,
    total: summaries.length
  };
}

function summarizeChecks(checks: SavedRunIntegrityCheck[]): SavedRunIntegrityStatus {
  if (checks.some((check) => check.status === "stale")) return "stale";
  if (checks.some((check) => check.status === "review")) return "review";
  return "verified";
}

function stripLockedTeams(settings: MatchingSettings): MatchingSettings {
  return {
    ...settings,
    lockedTeams: settings.lockedTeams?.map((team) => ({
      ...team,
      participantIds: [...team.participantIds].sort()
    }))
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
