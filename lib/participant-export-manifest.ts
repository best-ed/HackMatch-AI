import type { Participant } from "@/lib/matching/types";

export type ParticipantExportManifest = {
  status: "ready" | "review";
  title: string;
  detail: string;
  checks: Array<{
    label: string;
    value: string;
    status: "ready" | "review";
  }>;
};

export function buildParticipantExportManifest({
  participants,
  scope,
  activeCohort
}: {
  participants: Participant[];
  scope: "all" | "filtered";
  activeCohort: string;
}): ParticipantExportManifest {
  const contactSharingCount = participants.filter((participant) => participant.consentToShareContact).length;
  const excludedCount = participants.filter((participant) => !participant.consentToMatch).length;
  const missingTokens = participants.filter((participant) => !participant.accessToken?.trim()).length;
  const cohortCount = new Set(
    participants.map((participant) => participant.cohort?.trim() || "General")
  ).size;

  const status = missingTokens === 0 ? "ready" : "review";

  return {
    status,
    title: status === "ready" ? "Participant export manifest looks ready" : "Participant export manifest needs link review",
    detail:
      scope === "all"
        ? `This export will include ${participants.length} participant record(s) across ${cohortCount} cohort(s).`
        : `This filtered export will include ${participants.length} participant record(s) from the current directory view for ${activeCohort}.`,
    checks: [
      {
        label: "Consent to match",
        value: `${participants.length - excludedCount}/${participants.length}`,
        status: excludedCount === 0 ? "ready" : "review"
      },
      {
        label: "Contact sharing",
        value: `${contactSharingCount}/${participants.length}`,
        status: contactSharingCount > 0 ? "ready" : "review"
      },
      {
        label: "Access tokens",
        value: missingTokens === 0 ? "All present" : `${missingTokens} missing`,
        status: missingTokens === 0 ? "ready" : "review"
      },
      {
        label: "Cohort spread",
        value: scope === "all" ? `${cohortCount} cohort(s)` : activeCohort,
        status: "ready"
      }
    ]
  };
}
