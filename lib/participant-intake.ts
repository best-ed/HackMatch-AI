import type { Participant } from "@/lib/matching/types";
import { validateParticipantRegistration } from "@/lib/participant-validation";

export type IntakeIssueSeverity = "blocker" | "warning" | "info";

export type IntakeIssue = {
  severity: IntakeIssueSeverity;
  title: string;
  detail: string;
};

export type ParticipantIntakeSummary = {
  totalCount: number;
  matchableCount: number;
  excludedCount: number;
  incompleteCount: number;
  lowSignalCount: number;
  roleCoverage: Array<{ role: string; count: number }>;
  issues: IntakeIssue[];
};

export function evaluateParticipantIntake(participants: Participant[]): ParticipantIntakeSummary {
  const validations = participants.map((participant) => ({
    participant,
    validation: validateParticipantRegistration(participant, participants)
  }));
  const matchableCount = participants.filter((participant) => participant.consentToMatch).length;
  const excludedCount = participants.length - matchableCount;
  const incompleteCount = validations.filter((item) => item.validation.errors.length > 0).length;
  const lowSignalCount = validations.filter((item) => item.validation.warnings.length >= 2).length;
  const roleCoverage = summarizeRoleCoverage(participants);
  const issues: IntakeIssue[] = [];

  if (participants.length === 0) {
    issues.push({
      severity: "blocker",
      title: "No participants yet",
      detail: "Register participants or import a CSV before generating teams."
    });
  }

  if (incompleteCount > 0) {
    issues.push({
      severity: "blocker",
      title: "Incomplete participant records",
      detail: `${incompleteCount} participant${incompleteCount === 1 ? "" : "s"} need required fields fixed.`
    });
  }

  if (excludedCount > 0) {
    issues.push({
      severity: "warning",
      title: "Participants excluded from matching",
      detail: `${excludedCount} participant${excludedCount === 1 ? "" : "s"} do not have matching consent.`
    });
  }

  if (lowSignalCount > 0) {
    issues.push({
      severity: "warning",
      title: "Low matching signal",
      detail: `${lowSignalCount} participant${lowSignalCount === 1 ? "" : "s"} are missing helpful skills, interests, or contact-sharing signals.`
    });
  }

  if (roleCoverage.length > 0 && roleCoverage[0].count > Math.max(4, Math.ceil(participants.length * 0.45))) {
    issues.push({
      severity: "warning",
      title: "Role concentration",
      detail: `${roleCoverage[0].role} appears ${roleCoverage[0].count} times, so teams may need more complementary roles.`
    });
  }

  if (issues.length === 0) {
    issues.push({
      severity: "info",
      title: "Intake looks ready",
      detail: "Participant records have consent and enough matching signal for an initial run."
    });
  }

  return {
    totalCount: participants.length,
    matchableCount,
    excludedCount,
    incompleteCount,
    lowSignalCount,
    roleCoverage,
    issues
  };
}

function summarizeRoleCoverage(participants: Participant[]) {
  const counts = new Map<string, number>();
  participants.forEach((participant) => {
    const role = participant.primaryRole.trim() || "Unspecified";
    counts.set(role, (counts.get(role) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((left, right) => right.count - left.count || left.role.localeCompare(right.role))
    .slice(0, 6);
}
