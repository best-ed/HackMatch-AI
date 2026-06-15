import type { Participant } from "@/lib/matching/types";

export type ParticipantBulkAction =
  | "move-cohort"
  | "mark-matchable"
  | "mark-excluded"
  | "allow-contact"
  | "hide-contact";

export type ParticipantBulkActionResult = {
  participants: Participant[];
  affectedCount: number;
};

export function applyParticipantBulkAction({
  action,
  cohort,
  participantIds,
  participants,
  timestamp = new Date().toISOString()
}: {
  action: ParticipantBulkAction;
  cohort?: string;
  participantIds: string[];
  participants: Participant[];
  timestamp?: string;
}): ParticipantBulkActionResult {
  const selectedIds = new Set(participantIds);
  const cleanedCohort = cohort?.trim();
  let affectedCount = 0;

  const nextParticipants = participants.map((participant) => {
    if (!selectedIds.has(participant.id)) return participant;

    const next = applyBulkActionToParticipant(participant, action, cleanedCohort);
    if (next === participant) return participant;

    affectedCount += 1;
    return { ...next, updatedAt: timestamp };
  });

  return { participants: nextParticipants, affectedCount };
}

function applyBulkActionToParticipant(
  participant: Participant,
  action: ParticipantBulkAction,
  cohort?: string
): Participant {
  if (action === "move-cohort") {
    if (!cohort || participant.cohort === cohort) return participant;
    return { ...participant, cohort };
  }

  if (action === "mark-matchable") {
    if (participant.consentToMatch) return participant;
    return { ...participant, consentToMatch: true };
  }

  if (action === "mark-excluded") {
    if (!participant.consentToMatch) return participant;
    return { ...participant, consentToMatch: false };
  }

  if (action === "allow-contact") {
    if (participant.consentToShareContact) return participant;
    return { ...participant, consentToShareContact: true };
  }

  if (!participant.consentToShareContact) return participant;
  return { ...participant, consentToShareContact: false };
}

export function participantBulkActionLabel(action: ParticipantBulkAction): string {
  if (action === "move-cohort") return "Move to cohort";
  if (action === "mark-matchable") return "Mark matchable";
  if (action === "mark-excluded") return "Exclude from matching";
  if (action === "allow-contact") return "Allow contact sharing";
  return "Hide contact sharing";
}
