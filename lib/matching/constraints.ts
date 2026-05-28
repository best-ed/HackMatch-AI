import type {
  MatchingSettings,
  NormalizedParticipant,
  TeamAssignment
} from "./types";

export function validateParticipants(participants: NormalizedParticipant[]): string[] {
  const warnings: string[] = [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();

  for (const participant of participants) {
    if (seenIds.has(participant.id)) {
      warnings.push(`Duplicate participant id found: ${participant.id}`);
    }
    seenIds.add(participant.id);

    const email = participant.email.trim().toLowerCase();
    if (seenEmails.has(email)) {
      warnings.push(`Duplicate email found: ${participant.email}`);
    }
    seenEmails.add(email);

    if (!participant.fullName.trim()) {
      warnings.push(`Participant ${participant.id} is missing a full name.`);
    }
  }

  return warnings;
}

export function hasBlockedPair(
  participantIds: string[],
  participantsById: Map<string, NormalizedParticipant>
): boolean {
  for (const participantId of participantIds) {
    const participant = participantsById.get(participantId);
    if (!participant) continue;
    for (const blockedId of participant.blockedTeammates) {
      if (participantIds.includes(blockedId)) return true;
    }
  }
  return false;
}

export function canAddParticipantToTeam(
  participant: NormalizedParticipant,
  team: TeamAssignment,
  participantsById: Map<string, NormalizedParticipant>,
  settings: MatchingSettings
): boolean {
  if (team.locked) return false;
  if (team.participantIds.includes(participant.id)) return false;
  if (team.participantIds.length >= settings.maxTeamSize) return false;
  return !hasBlockedPair([...team.participantIds, participant.id], participantsById);
}

export function validateHardConstraints(
  teams: TeamAssignment[],
  participantsById: Map<string, NormalizedParticipant>,
  settings: MatchingSettings
): string[] {
  const warnings: string[] = [];
  const assigned = new Set<string>();

  for (const team of teams) {
    if (team.participantIds.length > settings.maxTeamSize) {
      warnings.push(`${team.name} exceeds max team size.`);
    }
    if (hasBlockedPair(team.participantIds, participantsById)) {
      warnings.push(`${team.name} contains blocked teammates.`);
    }
    for (const participantId of team.participantIds) {
      if (assigned.has(participantId)) {
        warnings.push(`Participant ${participantId} appears in multiple teams.`);
      }
      assigned.add(participantId);
      const participant = participantsById.get(participantId);
      if (participant && !participant.consentToMatch) {
        warnings.push(`Participant ${participantId} was assigned without consent.`);
      }
    }
  }

  return warnings;
}
