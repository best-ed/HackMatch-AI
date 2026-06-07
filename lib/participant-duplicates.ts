import type { Participant } from "@/lib/matching/types";

export type DuplicateParticipantGroup = {
  reason: "email" | "name-institution" | "access-token";
  label: string;
  participants: Participant[];
};

export function findParticipantDuplicates(participants: Participant[]): DuplicateParticipantGroup[] {
  return [
    ...duplicateGroups(participants, "email", (participant) => participant.email),
    ...duplicateGroups(participants, "access-token", (participant) => participant.accessToken ?? ""),
    ...duplicateGroups(participants, "name-institution", (participant) => `${participant.fullName}|${participant.institution ?? ""}`)
  ].sort((left, right) => left.reason.localeCompare(right.reason) || left.label.localeCompare(right.label));
}

function duplicateGroups(
  participants: Participant[],
  reason: DuplicateParticipantGroup["reason"],
  getKey: (participant: Participant) => string
) {
  const groups = new Map<string, Participant[]>();

  participants.forEach((participant) => {
    const key = normalizeKey(getKey(participant));
    if (!key || (reason === "name-institution" && !participant.institution?.trim())) return;
    groups.set(key, [...(groups.get(key) ?? []), participant]);
  });

  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([label, group]) => ({
      reason,
      label,
      participants: group.sort((left, right) => left.fullName.localeCompare(right.fullName))
    }));
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9@.]+/g, " ");
}
