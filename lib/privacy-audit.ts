import type { MatchingResult, Participant } from "@/lib/matching/types";

export type PrivacyAuditStatus = "ready" | "review" | "blocked";

export type PrivacyAuditIssue = {
  label: string;
  status: PrivacyAuditStatus;
  detail: string;
};

export type PrivacyAuditSummary = {
  totalParticipants: number;
  matchConsentCount: number;
  matchExcludedCount: number;
  contactSharingCount: number;
  contactHiddenCount: number;
  assignedCount: number;
  assignedWithoutContactCount: number;
  status: PrivacyAuditStatus;
  issues: PrivacyAuditIssue[];
};

export function buildPrivacyAudit({
  participants,
  result
}: {
  participants: Participant[];
  result?: MatchingResult;
}): PrivacyAuditSummary {
  const assignedIds = new Set(result?.teams.flatMap((team) => team.participantIds) ?? []);
  const assignedParticipants = participants.filter((participant) => assignedIds.has(participant.id));
  const matchConsentCount = participants.filter((participant) => participant.consentToMatch).length;
  const contactSharingCount = participants.filter((participant) => participant.consentToShareContact).length;
  const assignedWithoutContactCount = assignedParticipants.filter((participant) => !participant.consentToShareContact).length;
  const matchExcludedCount = participants.length - matchConsentCount;
  const contactHiddenCount = participants.length - contactSharingCount;

  const issues: PrivacyAuditIssue[] = [
    {
      label: "Match consent",
      status: matchExcludedCount ? "review" : "ready",
      detail: matchExcludedCount
        ? `${matchExcludedCount} participant(s) are excluded from matching because consent is off.`
        : "Every participant in this view currently consents to matching."
    },
    {
      label: "Contact sharing",
      status: assignedWithoutContactCount ? "review" : "ready",
      detail: assignedWithoutContactCount
        ? `${assignedWithoutContactCount} assigned participant(s) will have contact details hidden from teammate handoff.`
        : "Assigned participants can share contact details with teammates."
    },
    {
      label: "Team export privacy",
      status: result && result.teams.length > 0 ? "ready" : "blocked",
      detail: result && result.teams.length > 0
        ? "Team exports can use consent flags to hide contact details where required."
        : "Generate teams before relying on export privacy checks."
    }
  ];

  return {
    totalParticipants: participants.length,
    matchConsentCount,
    matchExcludedCount,
    contactSharingCount,
    contactHiddenCount,
    assignedCount: assignedParticipants.length,
    assignedWithoutContactCount,
    status: summarizePrivacyStatus(issues),
    issues
  };
}

function summarizePrivacyStatus(issues: PrivacyAuditIssue[]): PrivacyAuditStatus {
  if (issues.some((issue) => issue.status === "blocked")) return "blocked";
  if (issues.some((issue) => issue.status === "review")) return "review";
  return "ready";
}
