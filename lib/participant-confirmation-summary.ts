import { evaluateParticipantCompleteness } from "@/lib/participant-completeness";
import type { Participant, TeamAssignment } from "@/lib/matching/types";

export type ParticipantConfirmationSummary = {
  status: "ready" | "review" | "waiting";
  title: string;
  detail: string;
  signals: Array<{
    label: string;
    value: string;
    tone: "ready" | "review" | "waiting";
  }>;
};

export function buildParticipantConfirmationSummary({
  participant,
  assignedTeam,
  isUnassigned
}: {
  participant: Participant;
  assignedTeam?: TeamAssignment;
  isUnassigned: boolean;
}): ParticipantConfirmationSummary {
  const completeness = evaluateParticipantCompleteness(participant);
  const status = participant.consentToMatch
    ? assignedTeam
      ? "ready"
      : isUnassigned
        ? "review"
        : "waiting"
    : "review";

  const title = !participant.consentToMatch
    ? "Profile saved, but matching is off"
    : assignedTeam
      ? `${assignedTeam.name} is currently assigned`
      : isUnassigned
        ? "You are currently unassigned"
        : "Waiting for team generation";

  const detail = !participant.consentToMatch
    ? "The organizer has your record, but you will stay out of deterministic matching until consent is enabled."
    : assignedTeam
      ? "Your latest local assignment is ready through this access link."
      : isUnassigned
        ? "Current settings leave you outside the generated teams, so the organizer may adjust cohort size or constraints."
        : "Organizers still need to generate or refresh teams for your cohort.";

  return {
    status,
    title,
    detail,
    signals: [
      {
        label: "Matching consent",
        value: participant.consentToMatch ? "On" : "Off",
        tone: participant.consentToMatch ? "ready" : "review"
      },
      {
        label: "Contact sharing",
        value: participant.consentToShareContact ? "Enabled" : "Hidden",
        tone: participant.consentToShareContact ? "ready" : "waiting"
      },
      {
        label: "Profile completeness",
        value: `${completeness.score}/100`,
        tone: completeness.score >= 80 ? "ready" : completeness.score >= 60 ? "review" : "waiting"
      },
      {
        label: "Current team state",
        value: assignedTeam ? assignedTeam.name : isUnassigned ? "Unassigned" : "Pending",
        tone: assignedTeam ? "ready" : isUnassigned ? "review" : "waiting"
      }
    ]
  };
}
