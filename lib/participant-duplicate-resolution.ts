import type { Participant } from "@/lib/matching/types";
import type { DuplicateParticipantGroup } from "@/lib/participant-duplicates";

export type DuplicateResolutionPreview = {
  keepId: string;
  keepName: string;
  mergeFieldCount: number;
  riskFieldCount: number;
  keepReasons: string[];
  riskFields: string[];
};

export function buildDuplicateResolutionPreview(
  group: DuplicateParticipantGroup
): DuplicateResolutionPreview {
  const ranked = [...group.participants].sort(
    (left, right) =>
      participantSignalScore(right) - participantSignalScore(left) ||
      participantTimestamp(right) - participantTimestamp(left) ||
      left.id.localeCompare(right.id)
  );
  const keep = ranked[0];
  const others = ranked.slice(1);
  const keepReasons: string[] = [];

  if (keep.consentToMatch) keepReasons.push("matching consent already present");
  if (keep.consentToShareContact) keepReasons.push("contact-sharing consent already present");
  if ((keep.technicalSkills?.length ?? 0) > 0) keepReasons.push("more technical signal");
  if ((keep.interests?.length ?? 0) > 0) keepReasons.push("interest signal is already filled");
  if (keep.accessToken) keepReasons.push("usable access link already exists");

  const riskFields = uniqueSorted(
    others.flatMap((participant) => missingFieldsIfDropped(keep, participant))
  );

  return {
    keepId: keep.id,
    keepName: keep.fullName,
    mergeFieldCount: uniqueSorted(
      others.flatMap((participant) => recoverableFieldsFromOther(keep, participant))
    ).length,
    riskFieldCount: riskFields.length,
    keepReasons: keepReasons.slice(0, 3),
    riskFields: riskFields.slice(0, 5)
  };
}

function participantSignalScore(participant: Participant) {
  let score = 0;

  score += participant.consentToMatch ? 6 : 0;
  score += participant.consentToShareContact ? 2 : 0;
  score += participant.accessToken ? 3 : 0;
  score += countIfPresent(participant.phone);
  score += countIfPresent(participant.institution);
  score += countIfPresent(participant.githubUrl);
  score += countIfPresent(participant.linkedinUrl);
  score += countIfPresent(participant.portfolioUrl);
  score += countIfPresent(participant.projectIdeas);
  score += countIfPresent(participant.personalStatement);
  score += participant.secondaryRoles.length;
  score += participant.technicalSkills.length * 2;
  score += participant.nonTechnicalSkills.length;
  score += participant.tools.length;
  score += participant.interests.length;
  score += participant.preferredTeammates.length;
  score += participant.blockedTeammates.length;
  score += participant.availability.length;

  return score;
}

function participantTimestamp(participant: Participant) {
  return new Date(participant.updatedAt || participant.createdAt || 0).getTime();
}

function recoverableFieldsFromOther(keep: Participant, other: Participant) {
  const fields: string[] = [];

  if (!keep.phone && other.phone) fields.push("phone");
  if (!keep.institution && other.institution) fields.push("institution");
  if (!keep.githubUrl && other.githubUrl) fields.push("github");
  if (!keep.linkedinUrl && other.linkedinUrl) fields.push("linkedin");
  if (!keep.portfolioUrl && other.portfolioUrl) fields.push("portfolio");
  if (!keep.projectIdeas && other.projectIdeas) fields.push("project ideas");
  if (!keep.personalStatement && other.personalStatement) fields.push("personal statement");
  if (keep.secondaryRoles.length < other.secondaryRoles.length) fields.push("secondary roles");
  if (keep.technicalSkills.length < other.technicalSkills.length) fields.push("technical skills");
  if (keep.nonTechnicalSkills.length < other.nonTechnicalSkills.length) fields.push("non-technical skills");
  if (keep.tools.length < other.tools.length) fields.push("tools");
  if (keep.interests.length < other.interests.length) fields.push("interests");
  if (keep.preferredTeammates.length < other.preferredTeammates.length) fields.push("preferred teammates");
  if (keep.blockedTeammates.length < other.blockedTeammates.length) fields.push("blocked teammates");
  if (keep.availability.length < other.availability.length) fields.push("availability");

  return fields;
}

function missingFieldsIfDropped(keep: Participant, other: Participant) {
  return recoverableFieldsFromOther(keep, other);
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function countIfPresent(value?: string) {
  return value?.trim() ? 1 : 0;
}
