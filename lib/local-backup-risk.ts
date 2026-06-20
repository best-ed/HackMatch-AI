import type { Participant, SavedMatchRun } from "@/lib/matching/types";

export type LocalBackupRiskItem = {
  label: string;
  status: "ready" | "review";
  detail: string;
};

export type LocalBackupRiskAudit = {
  status: "ready" | "review";
  title: string;
  detail: string;
  items: LocalBackupRiskItem[];
};

export function buildLocalBackupRiskAudit({
  participants,
  savedRuns
}: {
  participants: Participant[];
  savedRuns: SavedMatchRun[];
}): LocalBackupRiskAudit {
  const contactCount = participants.filter(hasContactSurface).length;
  const accessTokenCount = participants.filter((participant) => Boolean(participant.accessToken?.trim())).length;
  const consentHiddenCount = participants.filter(
    (participant) => !participant.consentToShareContact && hasContactSurface(participant)
  ).length;
  const savedRunSnapshotCount = savedRuns.reduce(
    (sum, run) => sum + run.participantsSnapshot.length,
    0
  );

  const items: LocalBackupRiskItem[] = [
    {
      label: "Direct contact fields",
      status: contactCount > 0 ? "review" : "ready",
      detail: contactCount > 0
        ? `${contactCount} participant profile(s) include email, phone, or profile links in this backup.`
        : "No participant contact fields are currently stored in the backup."
    },
    {
      label: "Access tokens",
      status: accessTokenCount > 0 ? "review" : "ready",
      detail: accessTokenCount > 0
        ? `${accessTokenCount} participant access token(s) travel with the backup and can reopen participant team views.`
        : "No participant access tokens are currently stored in the backup."
    },
    {
      label: "Consent-hidden contacts",
      status: consentHiddenCount > 0 ? "review" : "ready",
      detail: consentHiddenCount > 0
        ? `${consentHiddenCount} participant profile(s) hide contact details in handoff views, but the organizer backup still stores the raw record.`
        : "No consent-hidden contact records are present in the backup."
    },
    {
      label: "Saved-run snapshots",
      status: savedRunSnapshotCount > 0 ? "review" : "ready",
      detail: savedRunSnapshotCount > 0
        ? `${savedRunSnapshotCount} participant snapshot row(s) are preserved across ${savedRuns.length} saved run(s).`
        : "No saved-run participant snapshots are included yet."
    }
  ];

  const readyCount = items.filter((item) => item.status === "ready").length;
  const status = readyCount === items.length ? "ready" : "review";

  return {
    status,
    title: status === "ready" ? "Backup sensitivity looks low" : "Backup contains organizer-only data",
    detail: status === "ready"
      ? "This workspace backup is currently carrying settings and workflow state without participant-sensitive payloads."
      : "This backup is portable, but it currently contains participant data that should stay with trusted organizers.",
    items
  };
}

function hasContactSurface(participant: Participant) {
  return [
    participant.email,
    participant.phone,
    participant.githubUrl,
    participant.linkedinUrl,
    participant.portfolioUrl
  ].some((value) => Boolean(value?.trim()));
}
