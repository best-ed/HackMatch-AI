import type { MatchingResult, MatchingSettings, Participant, SavedMatchRun } from "@/lib/matching/types";

export function createSavedMatchRun({
  result,
  participants,
  settings,
  activeCohort,
  savedRunCount,
  name,
  createdAt = new Date().toISOString()
}: {
  result: MatchingResult;
  participants: Participant[];
  settings: MatchingSettings;
  activeCohort: string;
  savedRunCount: number;
  name?: string;
  createdAt?: string;
}): SavedMatchRun {
  const runParticipants =
    activeCohort === "All"
      ? participants
      : participants.filter((participant) => (participant.cohort || "General") === activeCohort);
  const assignedCount = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  const scoredTeams = result.teams.filter((team) => typeof team.score?.totalScore === "number");
  const averageScore =
    scoredTeams.length > 0
      ? Math.round(scoredTeams.reduce((sum, team) => sum + (team.score?.totalScore ?? 0), 0) / scoredTeams.length)
      : 0;

  return {
    id: `run-${createdAt.replace(/[^0-9]/g, "")}`,
    name: name?.trim() || `Match run ${savedRunCount + 1}`,
    createdAt,
    participantCount: runParticipants.length,
    assignedCount,
    averageScore,
    settingsSnapshot: settings,
    cohort: activeCohort,
    participantsSnapshot: runParticipants,
    result
  };
}
