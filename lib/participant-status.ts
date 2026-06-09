import type { Participant, TeamAssignment } from "@/lib/matching/types";

export type ParticipantStatusItem = {
  id: string;
  label: string;
  detail: string;
  status: "complete" | "warning" | "pending";
};

export function buildParticipantStatusChecklist({
  participant,
  team
}: {
  participant?: Participant;
  team?: TeamAssignment;
}): ParticipantStatusItem[] {
  return [
    {
      id: "lookup",
      label: "Profile found",
      detail: participant
        ? `${participant.fullName} is loaded from ${participant.cohort ?? "General"}.`
        : "Enter an access code, email, name, or participant ID.",
      status: participant ? "complete" : "pending"
    },
    {
      id: "consent",
      label: "Matching consent",
      detail: participant?.consentToMatch
        ? "This profile can be included in deterministic matching."
        : participant
          ? "Consent is off, so this profile cannot be assigned."
          : "Consent status appears after lookup.",
      status: participant?.consentToMatch ? "complete" : participant ? "warning" : "pending"
    },
    {
      id: "assignment",
      label: "Team assignment",
      detail: team
        ? `${team.name} is currently generated for this participant.`
        : participant
          ? "No current team assignment is visible for this profile."
          : "Assignment status appears after lookup.",
      status: team ? "complete" : participant ? "warning" : "pending"
    },
    {
      id: "contact-sharing",
      label: "Contact sharing",
      detail: participant?.consentToShareContact
        ? "Contact details can appear in teammate handoff views."
        : participant
          ? "Contact details stay hidden from teammates."
          : "Contact sharing status appears after lookup.",
      status: participant?.consentToShareContact ? "complete" : participant ? "warning" : "pending"
    }
  ];
}
