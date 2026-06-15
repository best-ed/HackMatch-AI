import type { MatchingResult, MatchingSettings, Participant } from "@/lib/matching/types";
import { validateMatchingSettings } from "@/lib/settings-guardrails";

export type ReadinessSeverity = "blocker" | "warning" | "info";

export type ReadinessItem = {
  severity: ReadinessSeverity;
  title: string;
  detail: string;
  action: string;
  actionHref: string;
  actionLabel: string;
};

export type MatchingReadiness = {
  score: number;
  eligibleCount: number;
  assignedCount: number;
  averageScore: number;
  lowestScore: number;
  items: ReadinessItem[];
};

export function evaluateMatchingReadiness(
  result: MatchingResult,
  participants: Participant[],
  settings: MatchingSettings
): MatchingReadiness {
  const eligible = participants.filter((participant) => participant.consentToMatch);
  const assignedCount = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  const scores = result.teams.map((team) => team.score?.totalScore ?? 0);
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
  const settingsHealth = validateMatchingSettings(settings, participants);
  const items: ReadinessItem[] = [];

  settingsHealth.errors.forEach((error) => {
    items.push({
      severity: "blocker",
      title: "Settings need fixing",
      detail: error,
      action: "Open settings and adjust the invalid constraint before trusting this run.",
      actionHref: "/admin/settings",
      actionLabel: "Fix settings"
    });
  });

  settingsHealth.warnings.forEach((warning) => {
    items.push({
      severity: "warning",
      title: "Settings need review",
      detail: warning,
      action: "Review cohort coverage or relax the matching setting that caused this warning.",
      actionHref: "/admin/settings",
      actionLabel: "Review settings"
    });
  });

  if (eligible.length === 0) {
    items.push({
      severity: "blocker",
      title: "No matchable participants",
      detail: "No participant in this cohort has consented to matching.",
      action: "Register participants or confirm consent before generating final teams.",
      actionHref: "/admin/participants",
      actionLabel: "Review directory"
    });
  } else if (assignedCount < eligible.length) {
    items.push({
      severity: settings.allowUnassignedParticipants ? "warning" : "blocker",
      title: "Unassigned matchable participants",
      detail: `${eligible.length - assignedCount} matchable participant(s) are not currently placed.`,
      action: "Increase team capacity, reduce fixed team count, or inspect blocked teammate constraints.",
      actionHref: "/admin/settings",
      actionLabel: "Tune capacity"
    });
  }

  if (lowestScore > 0 && lowestScore < 75) {
    items.push({
      severity: "warning",
      title: "Low team score floor",
      detail: `The lowest team score is ${lowestScore}.`,
      action: "Inspect the lowest-scoring team for role, skill, or experience balance gaps.",
      actionHref: "/admin/teams",
      actionLabel: "Inspect teams"
    });
  }

  const penaltyTeams = result.teams.filter((team) => (team.score?.constraintPenalty ?? 0) > 0);
  if (penaltyTeams.length > 0) {
    items.push({
      severity: "warning",
      title: "Constraint penalties present",
      detail: `${penaltyTeams.length} team(s) include scoring penalties.`,
      action: "Review beginner-only, preference, blocked teammate, or role coverage pressure.",
      actionHref: "/admin/teams",
      actionLabel: "Review penalties"
    });
  }

  result.warnings.slice(0, 4).forEach((warning) => {
    items.push({
      severity: "warning",
      title: "Matcher warning",
      detail: warning,
      action: "Review the generated teams and matching settings before saving a final run.",
      actionHref: "/admin/teams",
      actionLabel: "Open team review"
    });
  });

  if (items.length === 0) {
    items.push({
      severity: "info",
      title: "Ready to review",
      detail: "The current run has no blocking readiness signals.",
      action: "Review teams, save the run, and export when the lineup looks right.",
      actionHref: "/admin/teams",
      actionLabel: "Review teams"
    });
  }

  const warningPenalty = items.filter((item) => item.severity === "warning").length * 4;
  const blockerPenalty = items.filter((item) => item.severity === "blocker").length * 18;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        ((assignedCount / Math.max(1, eligible.length)) * 0.48 +
          (averageScore / 100) * 0.42 +
          (items.every((item) => item.severity !== "warning" && item.severity !== "blocker") ? 0.1 : 0)) *
          100 -
          warningPenalty -
          blockerPenalty
      )
    )
  );

  return {
    score,
    eligibleCount: eligible.length,
    assignedCount,
    averageScore,
    lowestScore,
    items
  };
}
