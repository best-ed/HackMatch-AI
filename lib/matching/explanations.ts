import type {
  NormalizedParticipant,
  TeamAssignment,
  TeamExplanation
} from "./types";

export function generateDeterministicExplanation(
  team: TeamAssignment,
  participantsById: Map<string, NormalizedParticipant>
): TeamExplanation {
  const members = team.participantIds
    .map((id) => participantsById.get(id))
    .filter((member): member is NormalizedParticipant => Boolean(member));
  const roles = Array.from(
    new Set(members.flatMap((member) => [member.normalizedPrimaryRole, ...member.normalizedSecondaryRoles]))
  ).sort();
  const interests = Array.from(
    new Set(members.flatMap((member) => member.normalizedInterests))
  ).sort();
  const advancedCount = members.filter(
    (member) => member.experienceLevel === "advanced"
  ).length;
  const beginnerCount = members.filter(
    (member) => member.experienceLevel === "beginner"
  ).length;

  const warnings: string[] = [];
  if (!roles.includes("builder")) warnings.push("No clear builder role is covered.");
  if (!roles.includes("presenter")) warnings.push("No clear presenter role is covered.");
  if (beginnerCount === members.length && members.length > 0) {
    warnings.push("This team is beginner-heavy and may need mentorship.");
  }

  const suggestedInternalRoles = Object.fromEntries(
    members.map((member) => [
      member.fullName,
      member.normalizedPrimaryRole === "builder"
        ? "Technical implementation"
        : member.normalizedPrimaryRole === "designer"
          ? "UX and interface design"
          : member.normalizedPrimaryRole === "presenter"
            ? "Pitch and demo narrative"
            : member.normalizedPrimaryRole === "data"
              ? "Data and AI workflow"
              : "Product scope and coordination"
    ])
  );

  return {
    teamId: team.id,
    summary: `${team.name} combines ${roles.slice(0, 4).join(", ") || "mixed"} coverage across ${members.length} participants.`,
    strengths: [
      roles.length >= 3 ? "Broad role coverage" : "Focused execution profile",
      advancedCount > 0 ? "Includes advanced experience" : "Collaborative growth potential",
      interests.length > 0 ? `Shared interest options include ${interests.slice(0, 3).join(", ")}` : "Flexible project direction"
    ],
    weaknesses: [
      roles.length < 3 ? "Limited role diversity" : "Coordination across specialties will matter",
      beginnerCount > advancedCount ? "May need explicit technical mentorship" : "Needs clear scope control"
    ],
    suggestedProjectDirection:
      interests[0] != null
        ? `Build around ${interests[0]} with a practical demo and measurable outcome.`
        : "Choose a narrow problem with a clear demo path.",
    suggestedInternalRoles,
    warnings
  };
}

export function generateDeterministicExplanations(
  teams: TeamAssignment[],
  participantsById: Map<string, NormalizedParticipant>
): TeamExplanation[] {
  return teams.map((team) => generateDeterministicExplanation(team, participantsById));
}
