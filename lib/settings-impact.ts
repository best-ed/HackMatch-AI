import type { MatchingResult } from "@/lib/matching/types";

export type MatchingImpactSummary = {
  teamCount: number;
  assignedCount: number;
  unassignedCount: number;
  warningCount: number;
  averageScore: number;
};

export type MatchingImpactDelta = MatchingImpactSummary;

export function summarizeMatchingImpact(result: MatchingResult): MatchingImpactSummary {
  const scoredTeams = result.teams.filter((team) => typeof team.score?.totalScore === "number");

  return {
    teamCount: result.teams.length,
    assignedCount: result.teams.reduce((sum, team) => sum + team.participantIds.length, 0),
    unassignedCount: result.unassignedParticipants.length,
    warningCount: result.warnings.length,
    averageScore: scoredTeams.length
      ? Math.round(scoredTeams.reduce((sum, team) => sum + (team.score?.totalScore ?? 0), 0) / scoredTeams.length)
      : 0
  };
}

export function compareMatchingImpact(
  current: MatchingImpactSummary,
  draft: MatchingImpactSummary
): MatchingImpactDelta {
  return {
    teamCount: draft.teamCount - current.teamCount,
    assignedCount: draft.assignedCount - current.assignedCount,
    unassignedCount: draft.unassignedCount - current.unassignedCount,
    warningCount: draft.warningCount - current.warningCount,
    averageScore: draft.averageScore - current.averageScore
  };
}
