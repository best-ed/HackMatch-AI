import type { Participant } from "@/lib/matching/types";

export type ExistingRegistrationNotice = {
  participant: Participant;
  teamLookupHref: string;
  confirmationHref: string;
  submittedLabel: string;
};

export function findExistingRegistrationByEmail(
  email: string,
  participants: Participant[]
): ExistingRegistrationNotice | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const participant = participants.find((item) =>
    item.email.trim().toLowerCase() === normalizedEmail
  );

  if (!participant) return null;

  const lookup = encodeURIComponent(participant.accessToken ?? participant.email);

  return {
    participant,
    teamLookupHref: `/participant/team?access=${lookup}`,
    confirmationHref: `/participant/confirmation?access=${lookup}`,
    submittedLabel: formatSubmittedLabel(participant.createdAt)
  };
}

function formatSubmittedLabel(value: string): string {
  const [date] = value.split("T");
  return date || "saved previously";
}
