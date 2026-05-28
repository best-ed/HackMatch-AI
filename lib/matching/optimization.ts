import { hasBlockedPair } from "./constraints";
import { averageTeamScore, scoreTeam } from "./scoring";
import type {
  MatchingSettings,
  NormalizedParticipant,
  TeamAssignment
} from "./types";

function cloneTeams(teams: TeamAssignment[]): TeamAssignment[] {
  return teams.map((team) => ({
    ...team,
    participantIds: [...team.participantIds]
  }));
}

export function optimizeTeamsWithDeterministicSwaps(
  teams: TeamAssignment[],
  participantsById: Map<string, NormalizedParticipant>,
  settings: MatchingSettings
): TeamAssignment[] {
  let current = cloneTeams(teams);
  let improved = true;

  while (improved) {
    improved = false;
    const baseline = averageTeamScore(current, participantsById, settings);

    for (let a = 0; a < current.length; a += 1) {
      for (let b = a + 1; b < current.length; b += 1) {
        const teamA = current[a];
        const teamB = current[b];
        if (teamA.locked || teamB.locked) continue;

        for (const participantA of [...teamA.participantIds].sort()) {
          for (const participantB of [...teamB.participantIds].sort()) {
            const candidate = cloneTeams(current);
            const candidateA = candidate[a];
            const candidateB = candidate[b];
            candidateA.participantIds = candidateA.participantIds
              .filter((id) => id !== participantA)
              .concat(participantB)
              .sort();
            candidateB.participantIds = candidateB.participantIds
              .filter((id) => id !== participantB)
              .concat(participantA)
              .sort();

            if (
              hasBlockedPair(candidateA.participantIds, participantsById) ||
              hasBlockedPair(candidateB.participantIds, participantsById)
            ) {
              continue;
            }

            const candidateScore = averageTeamScore(candidate, participantsById, settings);
            const oldLocal =
              scoreTeam(teamA, participantsById, settings).totalScore +
              scoreTeam(teamB, participantsById, settings).totalScore;
            const newLocal =
              scoreTeam(candidateA, participantsById, settings).totalScore +
              scoreTeam(candidateB, participantsById, settings).totalScore;

            if (candidateScore > baseline && newLocal > oldLocal) {
              current = candidate;
              improved = true;
              break;
            }
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) break;
    }
  }

  return current;
}
