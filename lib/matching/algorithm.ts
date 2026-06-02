import {
  canAddParticipantToTeam,
  validateHardConstraints,
  validateParticipants
} from "./constraints";
import { generateDeterministicExplanations } from "./explanations";
import { normalizeParticipants } from "./normalization";
import { optimizeTeamsWithDeterministicSwaps } from "./optimization";
import { scoreTeam, scoreTeams } from "./scoring";
import type {
  MatchingResult,
  MatchingSettings,
  NormalizedParticipant,
  Participant,
  TeamAssignment
} from "./types";
import { defaultMatchingSettings } from "./types";

const scarcityPriority = ["presenter", "designer", "data", "product", "builder"];
const experienceValue = { beginner: 1, intermediate: 2, advanced: 3 };

function mergeSettings(settings?: Partial<MatchingSettings>): MatchingSettings {
  return {
    ...defaultMatchingSettings,
    ...settings,
    weights: {
      ...defaultMatchingSettings.weights,
      ...settings?.weights
    },
    lockedTeams: settings?.lockedTeams ?? []
  };
}

function targetTeamCount(eligibleCount: number, settings: MatchingSettings): number {
  if (settings.numberOfTeams && settings.numberOfTeams > 0) return settings.numberOfTeams;
  return Math.max(1, Math.ceil(eligibleCount / settings.desiredTeamSize));
}

function roleScarcityScore(
  participant: NormalizedParticipant,
  participants: NormalizedParticipant[]
): number {
  const roleCounts = new Map<string, number>();
  for (const candidate of participants) {
    roleCounts.set(
      candidate.normalizedPrimaryRole,
      (roleCounts.get(candidate.normalizedPrimaryRole) ?? 0) + 1
    );
  }
  const roleCount = roleCounts.get(participant.normalizedPrimaryRole) ?? 1;
  const scarcity = 1 / roleCount;
  const highImpact = scarcityPriority.includes(participant.normalizedPrimaryRole) ? 1 : 0;
  return scarcity * 10 + highImpact * 3 + experienceValue[participant.experienceLevel];
}

function deterministicParticipantOrder(
  participants: NormalizedParticipant[]
): NormalizedParticipant[] {
  return [...participants].sort(
    (a, b) =>
      experienceValue[b.experienceLevel] - experienceValue[a.experienceLevel] ||
      a.normalizedPrimaryRole.localeCompare(b.normalizedPrimaryRole) ||
      a.id.localeCompare(b.id)
  );
}

function seedOrder(participants: NormalizedParticipant[]): NormalizedParticipant[] {
  return [...participants].sort(
    (a, b) =>
      roleScarcityScore(b, participants) - roleScarcityScore(a, participants) ||
      a.normalizedPrimaryRole.localeCompare(b.normalizedPrimaryRole) ||
      a.id.localeCompare(b.id)
  );
}

function createEmptyTeams(count: number, lockedTeams: TeamAssignment[]): TeamAssignment[] {
  const teams: TeamAssignment[] = lockedTeams.map((team, index) => ({
    ...team,
    id: team.id || `team-${index + 1}`,
    name: team.name || `Team ${index + 1}`,
    participantIds: [...team.participantIds].sort(),
    locked: true
  }));

  for (let index = teams.length; index < count; index += 1) {
    teams.push({
      id: `team-${index + 1}`,
      name: `Team ${index + 1}`,
      participantIds: []
    });
  }

  return teams;
}

function restoreLockedTeams(
  teams: TeamAssignment[],
  lockedTeams: TeamAssignment[]
): TeamAssignment[] {
  const lockedById = new Map(
    lockedTeams.map((team) => [
      team.id,
      {
        ...team,
        participantIds: [...team.participantIds].sort(),
        locked: true
      }
    ])
  );

  return teams.map((team) => {
    const lockedTeam = lockedById.get(team.id);
    return lockedTeam
      ? {
          ...team,
          ...lockedTeam
        }
      : team;
  });
}

function contributionScore(
  participant: NormalizedParticipant,
  team: TeamAssignment,
  participantsById: Map<string, NormalizedParticipant>,
  settings: MatchingSettings
): number {
  const before = scoreTeam(team, participantsById, settings).totalScore;
  const candidateTeam: TeamAssignment = {
    ...team,
    participantIds: [...team.participantIds, participant.id].sort()
  };
  const after = scoreTeam(candidateTeam, participantsById, settings).totalScore;
  const sizePenalty = team.participantIds.length * 1.5;
  const preferenceBonus =
    participant.preferredTeammates.filter((id) => team.participantIds.includes(id)).length *
    4;
  return after - before - sizePenalty + preferenceBonus;
}

function assignParticipant(
  participant: NormalizedParticipant,
  teams: TeamAssignment[],
  participantsById: Map<string, NormalizedParticipant>,
  settings: MatchingSettings
): boolean {
  const candidates = teams
    .filter((team) =>
      canAddParticipantToTeam(participant, team, participantsById, settings)
    )
    .map((team, index) => ({
      index,
      score: contributionScore(participant, team, participantsById, settings),
      size: team.participantIds.length
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.size - b.size ||
        teams[a.index].id.localeCompare(teams[b.index].id)
    );

  const best = candidates[0];
  if (!best) return false;
  teams[best.index].participantIds = [
    ...teams[best.index].participantIds,
    participant.id
  ].sort();
  return true;
}

function distributeAdvancedParticipants(
  participants: NormalizedParticipant[],
  teams: TeamAssignment[],
  participantsById: Map<string, NormalizedParticipant>,
  settings: MatchingSettings
): string[] {
  const unassigned: string[] = [];
  const advanced = participants
    .filter((participant) => participant.experienceLevel === "advanced")
    .sort((a, b) => a.id.localeCompare(b.id));
  const remaining = participants.filter(
    (participant) => participant.experienceLevel !== "advanced"
  );

  for (const participant of advanced) {
    if (!assignParticipant(participant, teams, participantsById, settings)) {
      unassigned.push(participant.id);
    }
  }

  return [
    ...unassigned,
    ...fillRemainingParticipants(remaining, teams, participantsById, settings)
  ];
}

function fillRemainingParticipants(
  participants: NormalizedParticipant[],
  teams: TeamAssignment[],
  participantsById: Map<string, NormalizedParticipant>,
  settings: MatchingSettings
): string[] {
  const unassigned: string[] = [];
  for (const participant of deterministicParticipantOrder(participants)) {
    if (!assignParticipant(participant, teams, participantsById, settings)) {
      unassigned.push(participant.id);
    }
  }
  return unassigned;
}

export function generateTeams(
  participants: Participant[],
  partialSettings?: Partial<MatchingSettings>
): MatchingResult {
  const settings = mergeSettings(partialSettings);
  const normalized = normalizeParticipants(participants);
  const warnings = validateParticipants(normalized);
  const eligible = normalized.filter((participant) => participant.consentToMatch);
  const excluded = normalized
    .filter((participant) => !participant.consentToMatch)
    .map((participant) => participant.id);
  const participantsById = new Map(normalized.map((participant) => [participant.id, participant]));
  const lockedTeams = settings.lockedTeams ?? [];
  const lockedParticipantIds = new Set(lockedTeams.flatMap((team) => team.participantIds));
  const assignable = eligible.filter((participant) => !lockedParticipantIds.has(participant.id));
  const count = targetTeamCount(eligible.length, settings);
  const teams = createEmptyTeams(count, lockedTeams);

  for (const participant of seedOrder(assignable).slice(0, teams.length)) {
    assignParticipant(participant, teams, participantsById, settings);
  }

  const seededIds = new Set(teams.flatMap((team) => team.participantIds));
  const remaining = assignable.filter((participant) => !seededIds.has(participant.id));
  const unassigned = settings.distributeAdvancedParticipants
    ? distributeAdvancedParticipants(remaining, teams, participantsById, settings)
    : fillRemainingParticipants(remaining, teams, participantsById, settings);

  const optimized = optimizeTeamsWithDeterministicSwaps(
    teams,
    participantsById,
    settings
  );

  const lockedRestored = restoreLockedTeams(optimized, lockedTeams);
  const scoreBreakdowns = scoreTeams(lockedRestored, participantsById, settings);
  const finalTeams = lockedRestored.map((team) => ({
    ...team,
    score: scoreBreakdowns[team.id]
  }));

  warnings.push(...validateHardConstraints(finalTeams, participantsById, settings));
  if (!settings.allowUnassignedParticipants && unassigned.length > 0) {
    warnings.push("Some eligible participants could not be assigned.");
  }
  if (excluded.length > 0) {
    warnings.push(`${excluded.length} participant(s) excluded because consent was not provided.`);
  }

  return {
    teams: finalTeams,
    scoreBreakdowns,
    explanations: generateDeterministicExplanations(finalTeams, participantsById),
    warnings,
    unassignedParticipants: [...excluded, ...unassigned].sort()
  };
}
