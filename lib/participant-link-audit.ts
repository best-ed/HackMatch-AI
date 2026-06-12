import type { Participant } from "@/lib/matching/types";

export type ParticipantLinkAuditStatus = "ready" | "review" | "blocked";

export type ParticipantLinkAuditIssue = {
  label: string;
  status: ParticipantLinkAuditStatus;
  detail: string;
  participantIds: string[];
};

export type ParticipantLinkAudit = {
  status: ParticipantLinkAuditStatus;
  totalParticipants: number;
  exportableLinks: number;
  missingTokenCount: number;
  duplicateTokenCount: number;
  nonstandardTokenCount: number;
  excludedWithTokenCount: number;
  riskParticipantIds: string[];
  issues: ParticipantLinkAuditIssue[];
};

const currentTokenPattern = /^hm-[A-Z2-9]{6}$/;

export function buildParticipantLinkAudit(participants: Participant[]): ParticipantLinkAudit {
  const missingTokenIds = participants
    .filter((participant) => !participant.accessToken?.trim())
    .map((participant) => participant.id);
  const nonstandardTokenIds = participants
    .filter((participant) => {
      const token = participant.accessToken?.trim();
      return Boolean(token) && !currentTokenPattern.test(token ?? "");
    })
    .map((participant) => participant.id);
  const duplicateTokenIds = duplicateAccessTokenParticipantIds(participants);
  const excludedWithTokenIds = participants
    .filter((participant) => !participant.consentToMatch && Boolean(participant.accessToken?.trim()))
    .map((participant) => participant.id);
  const riskParticipantIds = Array.from(new Set([
    ...missingTokenIds,
    ...nonstandardTokenIds,
    ...duplicateTokenIds,
    ...excludedWithTokenIds
  ])).sort();

  const issues: ParticipantLinkAuditIssue[] = [
    {
      label: "Missing access tokens",
      status: missingTokenIds.length ? "blocked" : "ready",
      detail: missingTokenIds.length
        ? `${missingTokenIds.length} participant(s) cannot receive direct team links yet.`
        : "Every participant has an access token.",
      participantIds: missingTokenIds
    },
    {
      label: "Duplicate access tokens",
      status: duplicateTokenIds.length ? "blocked" : "ready",
      detail: duplicateTokenIds.length
        ? `${duplicateTokenIds.length} participant record(s) share an access token.`
        : "Access tokens are unique across participant records.",
      participantIds: duplicateTokenIds
    },
    {
      label: "Nonstandard token shape",
      status: nonstandardTokenIds.length ? "review" : "ready",
      detail: nonstandardTokenIds.length
        ? `${nonstandardTokenIds.length} token(s) do not match the current hm-XXXXXX format.`
        : "Tokens use the current short HackMatch format.",
      participantIds: nonstandardTokenIds
    },
    {
      label: "Excluded participants with links",
      status: excludedWithTokenIds.length ? "review" : "ready",
      detail: excludedWithTokenIds.length
        ? `${excludedWithTokenIds.length} excluded participant(s) still have team lookup links.`
        : "Excluded participants are not creating extra link review work.",
      participantIds: excludedWithTokenIds
    }
  ];

  return {
    status: summarizeIssues(issues),
    totalParticipants: participants.length,
    exportableLinks: participants.filter((participant) => Boolean(participant.accessToken?.trim())).length,
    missingTokenCount: missingTokenIds.length,
    duplicateTokenCount: duplicateTokenIds.length,
    nonstandardTokenCount: nonstandardTokenIds.length,
    excludedWithTokenCount: excludedWithTokenIds.length,
    riskParticipantIds,
    issues
  };
}

function duplicateAccessTokenParticipantIds(participants: Participant[]): string[] {
  const groups = new Map<string, string[]>();

  participants.forEach((participant) => {
    const token = participant.accessToken?.trim().toLowerCase();
    if (!token) return;
    groups.set(token, [...(groups.get(token) ?? []), participant.id]);
  });

  return Array.from(groups.values())
    .filter((ids) => ids.length > 1)
    .flat()
    .sort();
}

function summarizeIssues(issues: ParticipantLinkAuditIssue[]): ParticipantLinkAuditStatus {
  if (issues.some((issue) => issue.status === "blocked")) return "blocked";
  if (issues.some((issue) => issue.status === "review")) return "review";
  return "ready";
}
