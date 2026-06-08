import type { Participant } from "@/lib/matching/types";
import { validateParticipantRegistration } from "@/lib/participant-validation";

export type ParticipantReadinessFilter =
  | "all"
  | "incomplete"
  | "excluded"
  | "low-signal"
  | "duplicates";

export function participantMatchesReadinessFilter({
  participant,
  participants,
  duplicateParticipantIds,
  filter
}: {
  participant: Participant;
  participants: Participant[];
  duplicateParticipantIds: Set<string>;
  filter: ParticipantReadinessFilter;
}): boolean {
  if (filter === "all") return true;
  if (filter === "excluded") return !participant.consentToMatch;
  if (filter === "duplicates") return duplicateParticipantIds.has(participant.id);

  const validation = validateParticipantRegistration(participant, participants);
  if (filter === "incomplete") return validation.errors.length > 0;
  if (filter === "low-signal") return validation.errors.length === 0 && validation.warnings.length >= 2;
  return true;
}

export function duplicateParticipantIdsFromGroups(
  groups: Array<{ participants: Participant[] }>
): Set<string> {
  return new Set(groups.flatMap((group) => group.participants.map((participant) => participant.id)));
}
