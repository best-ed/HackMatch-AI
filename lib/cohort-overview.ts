import type { Participant, SavedMatchRun } from "@/lib/matching/types";

export type CohortOverview = {
  cohort: string;
  participantCount: number;
  matchableCount: number;
  excludedCount: number;
  advancedCount: number;
  topRoles: Array<{ label: string; count: number }>;
  topInterests: Array<{ label: string; count: number }>;
  savedRunCount: number;
  latestRunName?: string;
};

export function summarizeCohortOverview({
  cohort,
  participants,
  savedRuns
}: {
  cohort: string;
  participants: Participant[];
  savedRuns: SavedMatchRun[];
}): CohortOverview {
  const cohortParticipants = participants.filter((participant) => (participant.cohort ?? "General") === cohort);
  const cohortRuns = savedRuns.filter((run) => (run.cohort ?? "General") === cohort);

  return {
    cohort,
    participantCount: cohortParticipants.length,
    matchableCount: cohortParticipants.filter((participant) => participant.consentToMatch).length,
    excludedCount: cohortParticipants.filter((participant) => !participant.consentToMatch).length,
    advancedCount: cohortParticipants.filter((participant) => participant.experienceLevel === "advanced").length,
    topRoles: topCounts(cohortParticipants.flatMap((participant) => [participant.primaryRole])),
    topInterests: topCounts(cohortParticipants.flatMap((participant) => participant.interests)),
    savedRunCount: cohortRuns.length,
    latestRunName: cohortRuns[0]?.name
  };
}

function topCounts(values: string[]) {
  const counts = new Map<string, number>();
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 4);
}
