import type { MatchingSettings, Participant, SavedMatchRun } from "@/lib/matching/types";

export type CohortHealthRow = {
  cohort: string;
  participantCount: number;
  matchableCount: number;
  advancedCount: number;
  savedRunCount: number;
  status: "ready" | "watch" | "blocked";
  detail: string;
};

export function compareCohortHealth({
  cohorts,
  participants,
  savedRuns,
  settings
}: {
  cohorts: string[];
  participants: Participant[];
  savedRuns: SavedMatchRun[];
  settings: MatchingSettings;
}): CohortHealthRow[] {
  return cohorts
    .map((cohort) => {
      const cohortParticipants = participants.filter((participant) => (participant.cohort || "General") === cohort);
      const matchable = cohortParticipants.filter((participant) => participant.consentToMatch);
      const advancedCount = matchable.filter((participant) => participant.experienceLevel === "advanced").length;
      const savedRunCount = savedRuns.filter((run) => (run.cohort || "General") === cohort).length;
      const status = cohortStatus(matchable.length, advancedCount, settings);

      return {
        cohort,
        participantCount: cohortParticipants.length,
        matchableCount: matchable.length,
        advancedCount,
        savedRunCount,
        status,
        detail: cohortDetail(status, matchable.length, advancedCount, settings)
      };
    })
    .sort((left, right) => {
      const statusSort = statusRank(left.status) - statusRank(right.status);
      if (statusSort !== 0) return statusSort;
      return right.matchableCount - left.matchableCount || left.cohort.localeCompare(right.cohort);
    });
}

function cohortStatus(matchableCount: number, advancedCount: number, settings: MatchingSettings): CohortHealthRow["status"] {
  if (matchableCount < settings.minTeamSize) return "blocked";
  if (settings.distributeAdvancedParticipants && advancedCount === 0) return "watch";
  if (matchableCount < settings.desiredTeamSize) return "watch";
  return "ready";
}

function cohortDetail(
  status: CohortHealthRow["status"],
  matchableCount: number,
  advancedCount: number,
  settings: MatchingSettings
) {
  if (status === "blocked") {
    return `Needs at least ${settings.minTeamSize} matchable participant${settings.minTeamSize === 1 ? "" : "s"}.`;
  }
  if (settings.distributeAdvancedParticipants && advancedCount === 0) {
    return "No advanced participant signal yet.";
  }
  if (matchableCount < settings.desiredTeamSize) {
    return `Below desired team size of ${settings.desiredTeamSize}.`;
  }
  return "Enough matchable participants for current settings.";
}

function statusRank(status: CohortHealthRow["status"]) {
  if (status === "blocked") return 0;
  if (status === "watch") return 1;
  return 2;
}
