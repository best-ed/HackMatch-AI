import type {
  MatchingSettings,
  NormalizedParticipant,
  ScoreBreakdown,
  TeamAssignment
} from "./types";

const requiredRoles = ["builder", "designer", "product", "presenter"];
const experienceRank = { beginner: 1, intermediate: 2, advanced: 3 };

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function weightedAverage(parts: Array<[number, number]>): number {
  const totalWeight = parts.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight === 0) return 0;
  return parts.reduce((sum, [score, weight]) => sum + score * weight, 0) / totalWeight;
}

function getTeamMembers(
  team: TeamAssignment,
  participantsById: Map<string, NormalizedParticipant>
): NormalizedParticipant[] {
  return team.participantIds
    .map((id) => participantsById.get(id))
    .filter((member): member is NormalizedParticipant => Boolean(member));
}

export function scoreTeam(
  team: TeamAssignment,
  participantsById: Map<string, NormalizedParticipant>,
  settings: MatchingSettings
): ScoreBreakdown {
  const members = getTeamMembers(team, participantsById);
  if (members.length === 0) {
    return {
      roleCoverageScore: 0,
      skillCoverageScore: 0,
      experienceBalanceScore: 0,
      interestAlignmentScore: 0,
      availabilityCompatibilityScore: 0,
      preferenceSatisfactionScore: 0,
      constraintPenalty: 100,
      totalScore: 0
    };
  }

  const roles = new Set(
    members.flatMap((member) => [
      member.normalizedPrimaryRole,
      ...member.normalizedSecondaryRoles
    ])
  );
  const roleCoverageScore = clampScore(
    (requiredRoles.filter((role) => roles.has(role)).length / requiredRoles.length) * 100
  );

  const skills = new Set(
    members.flatMap((member) => [
      ...member.normalizedTechnicalSkills,
      ...member.normalizedNonTechnicalSkills,
      ...member.normalizedTools
    ])
  );
  const skillCoverageScore = clampScore(Math.min(100, skills.size * 8));

  const experienceLevels = new Set(members.map((member) => member.experienceLevel));
  const avgExperience =
    members.reduce((sum, member) => sum + experienceRank[member.experienceLevel], 0) /
    members.length;
  const hasBeginner = experienceLevels.has("beginner");
  const hasAdvanced = experienceLevels.has("advanced");
  const beginnerOnly = experienceLevels.size === 1 && hasBeginner;
  const experienceBalanceScore = clampScore(
    beginnerOnly
      ? 25
      : 55 + experienceLevels.size * 12 + (avgExperience >= 1.7 && avgExperience <= 2.6 ? 15 : 0) + (hasAdvanced ? 8 : 0)
  );

  const interestCounts = new Map<string, number>();
  for (const member of members) {
    for (const interest of member.normalizedInterests) {
      interestCounts.set(interest, (interestCounts.get(interest) ?? 0) + 1);
    }
  }
  const sharedInterestCount = Array.from(interestCounts.values()).filter(
    (count) => count > 1
  ).length;
  const interestAlignmentScore = clampScore(Math.min(100, 45 + sharedInterestCount * 18));

  const availabilityCounts = new Map<string, number>();
  for (const member of members) {
    for (const slot of member.availability) {
      availabilityCounts.set(slot, (availabilityCounts.get(slot) ?? 0) + 1);
    }
  }
  const bestOverlap = Math.max(0, ...availabilityCounts.values());
  const availabilityCompatibilityScore = clampScore((bestOverlap / members.length) * 100);

  const possiblePreferenceLinks = members.length * 2;
  const satisfiedPreferenceLinks = members.reduce(
    (sum, member) =>
      sum +
      member.preferredTeammates.filter((preferredId) =>
        team.participantIds.includes(preferredId)
      ).length,
    0
  );
  const preferenceSatisfactionScore = clampScore(
    possiblePreferenceLinks === 0
      ? 75
      : 55 + (satisfiedPreferenceLinks / possiblePreferenceLinks) * 45
  );

  let constraintPenalty = 0;
  if (team.participantIds.length < settings.minTeamSize) constraintPenalty += 20;
  if (settings.requireBuilder && !roles.has("builder")) constraintPenalty += 25;
  if (settings.requirePresenter && !roles.has("presenter")) constraintPenalty += 20;
  if (settings.preventBeginnerOnlyTeams && beginnerOnly) constraintPenalty += 25;

  const totalScore = clampScore(
    weightedAverage([
      [roleCoverageScore, settings.weights.roleCoverage],
      [skillCoverageScore, settings.weights.skillBalance],
      [experienceBalanceScore, settings.weights.experienceBalance],
      [interestAlignmentScore, settings.weights.interestAlignment],
      [availabilityCompatibilityScore, settings.weights.availabilityOverlap],
      [preferenceSatisfactionScore, settings.weights.participantPreferences]
    ]) - constraintPenalty
  );

  return {
    roleCoverageScore,
    skillCoverageScore,
    experienceBalanceScore,
    interestAlignmentScore,
    availabilityCompatibilityScore,
    preferenceSatisfactionScore,
    constraintPenalty,
    totalScore
  };
}

export function scoreTeams(
  teams: TeamAssignment[],
  participantsById: Map<string, NormalizedParticipant>,
  settings: MatchingSettings
): Record<string, ScoreBreakdown> {
  return Object.fromEntries(
    teams.map((team) => [team.id, scoreTeam(team, participantsById, settings)])
  );
}

export function averageTeamScore(
  teams: TeamAssignment[],
  participantsById: Map<string, NormalizedParticipant>,
  settings: MatchingSettings
): number {
  if (teams.length === 0) return 0;
  return (
    teams.reduce(
      (sum, team) => sum + scoreTeam(team, participantsById, settings).totalScore,
      0
    ) / teams.length
  );
}
