import type { MatchingResult, Participant, TeamAssignment, TeamExplanation } from "@/lib/matching/types";

export type TeamReviewRisk = {
  teamId: string;
  teamName: string;
  severity: "high" | "medium" | "low";
  label: string;
  detail: string;
};

export type TeamReviewSummary = {
  teamCount: number;
  assignedCount: number;
  unassignedCount: number;
  averageScore: number;
  lowestScore: number;
  lockedCount: number;
  highRiskCount: number;
  risks: TeamReviewRisk[];
};

export function summarizeTeamReview(
  result: MatchingResult,
  participants: Participant[]
): TeamReviewSummary {
  const assignedCount = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  const scoredTeams = result.teams.filter((team) => typeof team.score?.totalScore === "number");
  const scores = scoredTeams.map((team) => team.score?.totalScore ?? 0);
  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0;
  const lowestScore = scores.length ? Math.min(...scores) : 0;
  const explanationsByTeam = new Map(result.explanations.map((explanation) => [explanation.teamId, explanation]));
  const risks = result.teams.flatMap((team) =>
    getTeamReviewRisks(team, participants, explanationsByTeam.get(team.id))
  );

  result.warnings.forEach((warning, index) => {
    risks.push({
      teamId: `matcher-warning-${index}`,
      teamName: "Run warning",
      severity: "medium",
      label: "Matcher warning",
      detail: warning
    });
  });

  return {
    teamCount: result.teams.length,
    assignedCount,
    unassignedCount: result.unassignedParticipants.length,
    averageScore,
    lowestScore,
    lockedCount: result.teams.filter((team) => team.locked).length,
    highRiskCount: risks.filter((risk) => risk.severity === "high").length,
    risks: risks.sort((left, right) =>
      severityRank(left.severity) - severityRank(right.severity) ||
      left.teamName.localeCompare(right.teamName) ||
      left.label.localeCompare(right.label)
    )
  };
}

function getTeamReviewRisks(
  team: TeamAssignment,
  participants: Participant[],
  explanation?: TeamExplanation
): TeamReviewRisk[] {
  const members = team.participantIds
    .map((id) => participants.find((participant) => participant.id === id))
    .filter((participant): participant is Participant => Boolean(participant));
  const risks: TeamReviewRisk[] = [];
  const score = team.score?.totalScore ?? 0;

  if (score < 70) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "high",
      label: "Low score",
      detail: `Overall score is ${score}. Review role, skill, and availability fit.`
    });
  } else if (score < 80) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "medium",
      label: "Review score",
      detail: `Overall score is ${score}. This team may need organizer review.`
    });
  }

  if ((team.score?.constraintPenalty ?? 0) > 0) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "medium",
      label: "Constraint penalty",
      detail: `Penalty score is ${team.score?.constraintPenalty}.`
    });
  }

  if (members.length > 0 && members.every((member) => member.experienceLevel === "beginner")) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "high",
      label: "Beginner-only team",
      detail: "Every assigned member is a beginner."
    });
  }

  (explanation?.warnings ?? []).forEach((warning) => {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "medium",
      label: "Explanation warning",
      detail: warning
    });
  });

  if (risks.length === 0) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "low",
      label: "Ready",
      detail: "No obvious review risks detected."
    });
  }

  return risks;
}

function severityRank(severity: TeamReviewRisk["severity"]) {
  if (severity === "high") return 0;
  if (severity === "medium") return 1;
  return 2;
}
