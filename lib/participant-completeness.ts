import type { Participant } from "@/lib/matching/types";

export type ParticipantCompleteness = {
  score: number;
  missingCoreFields: string[];
  missingSignalFields: string[];
};

export function evaluateParticipantCompleteness(participant: Participant): ParticipantCompleteness {
  const checks = [
    [participant.fullName.trim().length > 0, 12, "full name", "core"],
    [participant.email.trim().length > 0, 12, "email", "core"],
    [participant.primaryRole.trim().length > 0, 10, "primary role", "core"],
    [participant.availability.length > 0, 10, "availability", "core"],
    [participant.consentToMatch, 10, "matching consent", "core"],
    [participant.technicalSkills.length > 0, 10, "technical skills", "signal"],
    [participant.interests.length > 0, 8, "interests", "signal"],
    [participant.secondaryRoles.length > 0, 6, "secondary roles", "signal"],
    [participant.tools.length > 0, 6, "tools", "signal"],
    [participant.preferredTeammates.length > 0 || participant.blockedTeammates.length > 0, 6, "teammate preferences", "signal"],
    [Boolean(participant.projectIdeas?.trim() || participant.personalStatement?.trim()), 6, "project or statement", "signal"],
    [participant.consentToShareContact, 4, "contact-sharing consent", "signal"]
  ] as const;

  return {
    score: checks.reduce((total, [passed, weight]) => total + (passed ? weight : 0), 0),
    missingCoreFields: checks
      .filter(([passed, , , kind]) => !passed && kind === "core")
      .map(([, , label]) => label),
    missingSignalFields: checks
      .filter(([passed, , , kind]) => !passed && kind === "signal")
      .map(([, , label]) => label)
  };
}

export function averageParticipantCompleteness(participants: Participant[]) {
  if (participants.length === 0) return 0;

  return Math.round(
    participants.reduce((total, participant) => total + evaluateParticipantCompleteness(participant).score, 0) /
      participants.length
  );
}
