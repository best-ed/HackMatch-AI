import type { AdminAuditEntry } from "@/lib/admin-audit-history";
import type { Participant, SavedMatchRun } from "@/lib/matching/types";

export type WorkspaceSnapshotSummary = {
  status: "ready" | "review";
  title: string;
  detail: string;
  metrics: Array<{
    label: string;
    value: string;
  }>;
  latestChange?: string;
};

export function buildWorkspaceSnapshotSummary({
  participants,
  savedRuns,
  activeCohort,
  archivedCohorts,
  auditHistory
}: {
  participants: Participant[];
  savedRuns: SavedMatchRun[];
  activeCohort: string;
  archivedCohorts: string[];
  auditHistory: AdminAuditEntry[];
}): WorkspaceSnapshotSummary {
  const finalRuns = savedRuns.filter((run) => run.isFinal).length;
  const matchable = participants.filter((participant) => participant.consentToMatch).length;
  const uniqueCohorts = new Set(
    participants.map((participant) => participant.cohort?.trim() || "General")
  );
  uniqueCohorts.add(activeCohort.trim() || "General");

  const latestParticipantUpdate = latestIso(participants.map((participant) => participant.updatedAt));
  const latestRunUpdate = latestIso(savedRuns.map((run) => run.createdAt));
  const latestAuditUpdate = latestIso(auditHistory.map((entry) => entry.createdAt));
  const latestChangeAt = latestIso([latestParticipantUpdate, latestRunUpdate, latestAuditUpdate]);

  const status = participants.length > 0 && savedRuns.length > 0 ? "ready" : "review";
  const detail = savedRuns.length > 0
    ? `${participants.length} participant record(s) and ${savedRuns.length} saved run(s) are currently sitting in this browser workspace.`
    : `${participants.length} participant record(s) are loaded, but there is no frozen saved run snapshot yet.`;

  return {
    status,
    title: status === "ready" ? "Workspace snapshot is reviewable" : "Workspace snapshot still needs a frozen run",
    detail,
    metrics: [
      { label: "Active cohort", value: activeCohort || "General" },
      { label: "Visible cohorts", value: String(uniqueCohorts.size) },
      { label: "Archived cohorts", value: String(archivedCohorts.length) },
      { label: "Matchable", value: String(matchable) },
      { label: "Saved runs", value: String(savedRuns.length) },
      { label: "Final runs", value: String(finalRuns) }
    ],
    latestChange: latestChangeAt
      ? `Latest local change recorded at ${formatSnapshotDate(latestChangeAt)}.`
      : undefined
  };
}

function latestIso(values: Array<string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
}

function formatSnapshotDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
