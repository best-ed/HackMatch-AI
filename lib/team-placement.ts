import type { Participant } from "@/lib/matching/types";

export type ParticipantPlacementExplanation = {
  participantId: string;
  participantName: string;
  reasons: string[];
};

export function buildTeamPlacementExplanations(members: Participant[]): ParticipantPlacementExplanation[] {
  const teamRoles = uniqueSorted(members.flatMap((member) => [member.primaryRole, ...member.secondaryRoles]));
  const teamSkills = uniqueSorted(members.flatMap((member) => [...member.technicalSkills, ...member.nonTechnicalSkills]));
  const sharedInterests = intersectLists(members.map((member) => member.interests));
  const sharedAvailability = intersectLists(members.map((member) => member.availability));
  const hasAdvanced = members.some((member) => member.experienceLevel === "advanced");
  const hasBeginner = members.some((member) => member.experienceLevel === "beginner");
  const memberNames = new Set(members.map((member) => normalizeName(member.fullName)));

  return members.map((member) => {
    const memberSkills = uniqueSorted([...member.technicalSkills, ...member.nonTechnicalSkills]);
    const otherSkills = uniqueSorted(
      members
        .filter((candidate) => candidate.id !== member.id)
        .flatMap((candidate) => [...candidate.technicalSkills, ...candidate.nonTechnicalSkills])
    );
    const distinctSkills = memberSkills.filter((skill) => !otherSkills.includes(skill));
    const preferredMatches = member.preferredTeammates.filter((name) => memberNames.has(normalizeName(name)));
    const reasons = [
      `${member.primaryRole} adds role coverage to a team spanning ${teamRoles.slice(0, 4).join(", ") || "mixed roles"}.`,
      distinctSkills.length > 0
        ? `Brings distinct skill signal in ${distinctSkills.slice(0, 3).join(", ")}.`
        : teamSkills.length > 0
          ? `Reinforces shared skill coverage around ${teamSkills.slice(0, 3).join(", ")}.`
          : "",
      sharedInterests.length > 0 ? `Aligns on ${sharedInterests.slice(0, 2).join(", ")} interest area(s).` : "",
      sharedAvailability.length > 0 ? `Overlaps on ${formatAvailability(sharedAvailability[0])}.` : "",
      hasAdvanced && member.experienceLevel === "advanced" ? "Helps anchor the team with advanced experience." : "",
      hasAdvanced && hasBeginner && member.experienceLevel === "beginner" ? "Placed with stronger experience coverage for mentorship potential." : "",
      preferredMatches.length > 0 ? `Preferred teammate signal matched: ${preferredMatches.slice(0, 2).join(", ")}.` : ""
    ].filter(Boolean);

    return {
      participantId: member.id,
      participantName: member.fullName,
      reasons: reasons.slice(0, 4)
    };
  });
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  );
}

function intersectLists(lists: string[][]): string[] {
  if (lists.length === 0) return [];
  const normalizedLists = lists.map((items) => new Set(items.map((item) => item.trim()).filter(Boolean)));
  const [first, ...rest] = normalizedLists;
  return Array.from(first)
    .filter((item) => rest.every((set) => set.has(item)))
    .sort((left, right) => left.localeCompare(right));
}

function formatAvailability(slot: string) {
  return slot.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
