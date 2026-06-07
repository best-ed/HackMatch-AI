import type { MatchingResult, Participant, TeamAssignment, TeamExplanation } from "@/lib/matching/types";

export type TeamReviewRisk = {
  teamId: string;
  teamName: string;
  severity: "high" | "medium" | "low";
  category: "score" | "coverage" | "availability" | "experience" | "constraint" | "explanation" | "matcher" | "ready";
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
  mediumRiskCount: number;
  coverageRiskCount: number;
  availabilityRiskCount: number;
  constraintRiskCount: number;
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
      category: "matcher",
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
    mediumRiskCount: risks.filter((risk) => risk.severity === "medium").length,
    coverageRiskCount: risks.filter((risk) => risk.category === "coverage").length,
    availabilityRiskCount: risks.filter((risk) => risk.category === "availability").length,
    constraintRiskCount: risks.filter((risk) => risk.category === "constraint").length,
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
      category: "score",
      label: "Low score",
      detail: `Overall score is ${score}. Review role, skill, and availability fit.`
    });
  } else if (score < 80) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "medium",
      category: "score",
      label: "Review score",
      detail: `Overall score is ${score}. This team may need organizer review.`
    });
  }

  const penalty = team.score?.constraintPenalty ?? 0;
  if (penalty >= 25) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "high",
      category: "constraint",
      label: "High penalty",
      detail: `Constraint penalty is ${penalty}. Check blocked teammates, beginner-only composition, and required coverage.`
    });
  } else if (penalty > 0) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "medium",
      category: "constraint",
      label: "Constraint penalty",
      detail: `Constraint penalty is ${penalty}.`
    });
  }

  if ((team.score?.roleCoverageScore ?? 100) < 70) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "medium",
      category: "coverage",
      label: "Role coverage",
      detail: `Role coverage is ${team.score?.roleCoverageScore}. Add or rebalance builder, product, design, data, or presentation coverage.`
    });
  }

  if ((team.score?.skillCoverageScore ?? 100) < 70) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "medium",
      category: "coverage",
      label: "Skill balance",
      detail: `Skill coverage is ${team.score?.skillCoverageScore}. This team may need broader implementation support.`
    });
  }

  if ((team.score?.availabilityCompatibilityScore ?? 100) < 60) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "high",
      category: "availability",
      label: "Availability overlap",
      detail: `Availability compatibility is ${team.score?.availabilityCompatibilityScore}. Members may struggle to find shared working time.`
    });
  } else if ((team.score?.availabilityCompatibilityScore ?? 100) < 75) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "medium",
      category: "availability",
      label: "Availability overlap",
      detail: `Availability compatibility is ${team.score?.availabilityCompatibilityScore}. Confirm meeting times early.`
    });
  }

  if (!hasRoleSignal(members, ["backend", "frontend", "full stack", "fullstack", "engineer", "developer", "builder"])) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "medium",
      category: "coverage",
      label: "Builder coverage",
      detail: "No obvious builder role is present from primary or secondary roles."
    });
  }

  if (!hasRoleSignal(members, ["presenter", "pitch", "story", "marketing", "product", "designer", "design"])) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "medium",
      category: "coverage",
      label: "Presentation coverage",
      detail: "No obvious presentation, product, design, or storytelling role is present."
    });
  }

  if (members.length > 0 && members.every((member) => member.experienceLevel === "beginner")) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "high",
      category: "experience",
      label: "Beginner-only team",
      detail: "Every assigned member is a beginner."
    });
  }

  (explanation?.warnings ?? []).forEach((warning) => {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "medium",
      category: "explanation",
      label: "Explanation warning",
      detail: warning
    });
  });

  if (risks.length === 0) {
    risks.push({
      teamId: team.id,
      teamName: team.name,
      severity: "low",
      category: "ready",
      label: "Ready",
      detail: "No obvious review risks detected."
    });
  }

  return risks;
}

function hasRoleSignal(members: Participant[], signals: string[]) {
  return members.some((member) => {
    const roleText = [member.primaryRole, ...member.secondaryRoles].join(" ").toLowerCase();
    return signals.some((signal) => roleText.includes(signal));
  });
}

function severityRank(severity: TeamReviewRisk["severity"]) {
  if (severity === "high") return 0;
  if (severity === "medium") return 1;
  return 2;
}
