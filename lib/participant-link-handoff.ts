import type { ParticipantLinkAudit, ParticipantLinkAuditStatus } from "@/lib/participant-link-audit";

export type ParticipantLinkHandoffSummary = {
  status: ParticipantLinkAuditStatus;
  title: string;
  detail: string;
};

export function summarizeParticipantLinkHandoff({
  audit,
  scopeLabel
}: {
  audit: ParticipantLinkAudit;
  scopeLabel: string;
}): ParticipantLinkHandoffSummary {
  if (audit.totalParticipants === 0) {
    return {
      status: "blocked",
      title: "No participants in scope",
      detail: `There are no participant records in ${scopeLabel} yet.`
    };
  }

  if (audit.status === "blocked") {
    const blockedIssue = audit.issues.find((issue) => issue.status === "blocked");
    return {
      status: "blocked",
      title: "Link handoff is blocked",
      detail: blockedIssue?.detail ?? `Resolve access-token gaps in ${scopeLabel} before handing off participant links.`
    };
  }

  if (audit.status === "review") {
    const reviewIssue = audit.issues.find((issue) => issue.status === "review");
    return {
      status: "review",
      title: "Link handoff needs review",
      detail: reviewIssue?.detail ?? `${audit.exportableLinks} access link(s) are available in ${scopeLabel}, but organizer review is still recommended.`
    };
  }

  return {
    status: "ready",
    title: "Link handoff is ready",
    detail: `${audit.exportableLinks} access link(s) are ready to copy or export from ${scopeLabel}.`
  };
}
