import type { MatchingResult, MatchingSettings, Participant } from "@/lib/matching/types";

export type SavedRunComparison = {
  live: RunComparisonSummary;
  saved: RunComparisonSummary;
  scoreDelta: number;
  assignedDelta: number;
  unassignedDelta: number;
  warningDelta: number;
  movedParticipants: Array<{
    id: string;
    name: string;
    liveTeam: string;
    savedTeam: string;
  }>;
  addedParticipants: Array<{ id: string; name: string }>;
  removedParticipants: Array<{ id: string; name: string }>;
  settingsChanges: Array<{
    label: string;
    liveValue: string;
    savedValue: string;
  }>;
};

export type RunComparisonSummary = {
  averageScore: number;
  assignedCount: number;
  teamCount: number;
  unassignedCount: number;
  warningCount: number;
};

export function compareSavedRunToLive({
  liveResult,
  liveParticipants,
  liveSettings,
  savedResult,
  savedParticipants,
  savedSettings
}: {
  liveResult: MatchingResult;
  liveParticipants: Participant[];
  liveSettings: MatchingSettings;
  savedResult: MatchingResult;
  savedParticipants: Participant[];
  savedSettings: MatchingSettings;
}): SavedRunComparison {
  const live = summarizeResult(liveResult);
  const saved = summarizeResult(savedResult);
  const liveTeams = participantTeamMap(liveResult, liveParticipants);
  const savedTeams = participantTeamMap(savedResult, savedParticipants);
  const liveParticipantMap = participantNameMap(liveParticipants);
  const savedParticipantMap = participantNameMap(savedParticipants);
  const movedParticipants = Array.from(liveTeams.values())
    .map((liveParticipant) => {
      const savedParticipant = savedTeams.get(liveParticipant.id);
      if (!savedParticipant || savedParticipant.team === liveParticipant.team) return null;
      return {
        id: liveParticipant.id,
        name: liveParticipant.name,
        liveTeam: liveParticipant.team,
        savedTeam: savedParticipant.team
      };
    })
    .filter((move): move is SavedRunComparison["movedParticipants"][number] => Boolean(move))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    live,
    saved,
    scoreDelta: live.averageScore - saved.averageScore,
    assignedDelta: live.assignedCount - saved.assignedCount,
    unassignedDelta: live.unassignedCount - saved.unassignedCount,
    warningDelta: live.warningCount - saved.warningCount,
    movedParticipants,
    addedParticipants: diffParticipants(liveParticipantMap, savedParticipantMap),
    removedParticipants: diffParticipants(savedParticipantMap, liveParticipantMap),
    settingsChanges: compareSettings(liveSettings, savedSettings)
  };
}

export function describeSavedRunComparison(
  comparison: SavedRunComparison,
  savedRunName: string
) {
  const notes: string[] = [];
  if (comparison.scoreDelta > 0) {
    notes.push(`Live teams average ${comparison.scoreDelta} points higher than ${savedRunName}.`);
  } else if (comparison.scoreDelta < 0) {
    notes.push(`${savedRunName} averages ${Math.abs(comparison.scoreDelta)} points higher than the live teams.`);
  } else {
    notes.push(`Live teams and ${savedRunName} have the same average score.`);
  }

  if (comparison.assignedDelta > 0) {
    notes.push(`Live assigns ${comparison.assignedDelta} more participant${comparison.assignedDelta === 1 ? "" : "s"}.`);
  } else if (comparison.assignedDelta < 0) {
    notes.push(`${savedRunName} assigns ${Math.abs(comparison.assignedDelta)} more participant${comparison.assignedDelta === -1 ? "" : "s"}.`);
  }

  if (comparison.warningDelta > 0) {
    notes.push(`Live has ${comparison.warningDelta} more warning${comparison.warningDelta === 1 ? "" : "s"} to review.`);
  } else if (comparison.warningDelta < 0) {
    notes.push(`Live has ${Math.abs(comparison.warningDelta)} fewer warning${comparison.warningDelta === -1 ? "" : "s"}.`);
  }

  if (comparison.movedParticipants.length > 0) {
    notes.push(`${comparison.movedParticipants.length} participant${comparison.movedParticipants.length === 1 ? " has" : "s have"} moved teams.`);
  }
  if (comparison.addedParticipants.length > 0 || comparison.removedParticipants.length > 0) {
    notes.push(`${comparison.addedParticipants.length} added and ${comparison.removedParticipants.length} removed participant snapshot change${comparison.addedParticipants.length + comparison.removedParticipants.length === 1 ? "" : "s"}.`);
  }
  if (comparison.settingsChanges.length > 0) {
    notes.push(`${comparison.settingsChanges.length} setting${comparison.settingsChanges.length === 1 ? "" : "s"} differ from the saved run.`);
  }

  return notes.join(" ");
}

function summarizeResult(result: MatchingResult): RunComparisonSummary {
  const scoredTeams = result.teams.filter((team) => typeof team.score?.totalScore === "number");
  const assignedCount = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  return {
    averageScore: scoredTeams.length
      ? Math.round(scoredTeams.reduce((sum, team) => sum + (team.score?.totalScore ?? 0), 0) / scoredTeams.length)
      : 0,
    assignedCount,
    teamCount: result.teams.length,
    unassignedCount: result.unassignedParticipants.length,
    warningCount: result.warnings.length
  };
}

function participantTeamMap(result: MatchingResult, participants: Participant[]) {
  const participantsById = participantNameMap(participants);
  const map = new Map<string, { id: string; name: string; team: string }>();
  result.teams.forEach((team) => {
    team.participantIds.forEach((participantId) => {
      map.set(participantId, {
        id: participantId,
        name: participantsById.get(participantId) ?? participantId,
        team: team.name
      });
    });
  });
  result.unassignedParticipants.forEach((participantId) => {
    map.set(participantId, {
      id: participantId,
      name: participantsById.get(participantId) ?? participantId,
      team: "Unassigned"
    });
  });
  return map;
}

function participantNameMap(participants: Participant[]) {
  return new Map(participants.map((participant) => [participant.id, participant.fullName]));
}

function diffParticipants(
  left: Map<string, string>,
  right: Map<string, string>
): Array<{ id: string; name: string }> {
  return Array.from(left.entries())
    .filter(([id]) => !right.has(id))
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function compareSettings(live: MatchingSettings, saved: MatchingSettings): SavedRunComparison["settingsChanges"] {
  const entries: Array<[string, unknown, unknown]> = [
    ["Desired team size", live.desiredTeamSize, saved.desiredTeamSize],
    ["Minimum team size", live.minTeamSize, saved.minTeamSize],
    ["Maximum team size", live.maxTeamSize, saved.maxTeamSize],
    ["Number of teams", live.numberOfTeams ?? "auto", saved.numberOfTeams ?? "auto"],
    ["Require builder", live.requireBuilder, saved.requireBuilder],
    ["Require presenter", live.requirePresenter, saved.requirePresenter],
    ["Prevent beginner-only teams", live.preventBeginnerOnlyTeams, saved.preventBeginnerOnlyTeams],
    ["Distribute advanced participants", live.distributeAdvancedParticipants, saved.distributeAdvancedParticipants],
    ["Role coverage weight", live.weights.roleCoverage, saved.weights.roleCoverage],
    ["Skill balance weight", live.weights.skillBalance, saved.weights.skillBalance],
    ["Experience balance weight", live.weights.experienceBalance, saved.weights.experienceBalance],
    ["Interest alignment weight", live.weights.interestAlignment, saved.weights.interestAlignment],
    ["Availability overlap weight", live.weights.availabilityOverlap, saved.weights.availabilityOverlap],
    ["Preference weight", live.weights.participantPreferences, saved.weights.participantPreferences]
  ];

  return entries
    .filter(([, liveValue, savedValue]) => liveValue !== savedValue)
    .map(([label, liveValue, savedValue]) => ({
      label,
      liveValue: formatSettingValue(liveValue),
      savedValue: formatSettingValue(savedValue)
    }));
}

function formatSettingValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "on" : "off";
  return String(value);
}
