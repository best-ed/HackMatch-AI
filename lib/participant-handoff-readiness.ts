import type { TeamAssignment, Participant } from "@/lib/matching/types";
import type { ParticipantStatusItem } from "@/lib/participant-status";
import type { ParticipantTeamBrief } from "@/lib/participant-team-view";

export type ParticipantHandoffReadiness = {
  status: "ready" | "review" | "blocked";
  title: string;
  detail: string;
  checks: Array<{
    label: string;
    status: "ready" | "review" | "blocked";
    detail: string;
  }>;
};

export function buildParticipantHandoffReadiness({
  brief,
  participant,
  statusChecklist,
  team
}: {
  brief: ParticipantTeamBrief;
  participant?: Participant;
  statusChecklist: ParticipantStatusItem[];
  team?: TeamAssignment;
}): ParticipantHandoffReadiness {
  const hasBlockedChecklist = statusChecklist.some((item) => item.id === "assignment" && item.status === "warning");
  const hiddenContacts = brief.contactPrivacy.hiddenCount;
  const noVisibleContacts = brief.visibleContacts.length === 0;

  const checks = [
    {
      label: "Assignment",
      status: team ? "ready" as const : participant?.consentToMatch ? "blocked" as const : "review" as const,
      detail: team
        ? `${team.name} is visible through this access link.`
        : participant?.consentToMatch
          ? "No visible team is assigned yet under the current deterministic run."
          : "Matching consent is off, so no team handoff can appear."
    },
    {
      label: "Contact handoff",
      status: noVisibleContacts ? "review" as const : hiddenContacts > 0 ? "review" as const : "ready" as const,
      detail: noVisibleContacts
        ? "No teammate contact records are currently shareable."
        : hiddenContacts > 0
          ? `${hiddenContacts} teammate contact record(s) are still hidden by consent.`
          : "All teammate contact records that can be shared are visible."
    },
    {
      label: "Coordination signal",
      status: brief.sharedAvailability.length > 0 || brief.sharedInterests.length > 0 ? "ready" as const : "review" as const,
      detail: brief.sharedAvailability.length > 0 || brief.sharedInterests.length > 0
        ? "The team already has shared scheduling or interest signal to start with."
        : "The team may need a manual kickoff to align schedule and project direction."
    }
  ];

  const status = hasBlockedChecklist || !team
    ? "blocked"
    : checks.some((check) => check.status === "review")
      ? "review"
      : "ready";

  return {
    status,
    title: status === "ready" ? "Handoff ready" : status === "review" ? "Handoff needs review" : "Handoff is blocked",
    detail: status === "ready"
      ? "This access link has enough assignment and contact context to start team coordination."
      : status === "review"
        ? "The team is visible, but one or more handoff details still need organizer or teammate follow-up."
        : "This access link does not yet expose a complete team handoff.",
    checks
  };
}
