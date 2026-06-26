import type { MatchingResult, Participant } from "@/lib/matching/types";

export type TeamExportManifest = {
  status: "ready" | "review";
  title: string;
  detail: string;
  checks: Array<{
    label: string;
    value: string;
    status: "ready" | "review";
  }>;
};

export function buildTeamExportManifest({
  result,
  participants,
  cohort,
  scope
}: {
  result: MatchingResult;
  participants: Participant[];
  cohort: string;
  scope: "live" | "saved";
}): TeamExportManifest {
  const assignedCount = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  const hiddenContacts = participants.filter((participant) => !participant.consentToShareContact).length;
  const scoreFloor = result.teams.length
    ? Math.min(...result.teams.map((team) => team.score?.totalScore ?? 0))
    : 0;
  const status = result.warnings.length === 0 ? "ready" : "review";

  return {
    status,
    title: status === "ready" ? "Team export manifest looks ready" : "Team export manifest needs review",
    detail: `${scope === "saved" ? "Saved-run" : "Live"} team export for ${cohort} currently covers ${result.teams.length} team(s) and ${assignedCount} assigned participant(s).`,
    checks: [
      {
        label: "Assigned participants",
        value: String(assignedCount),
        status: assignedCount > 0 ? "ready" : "review"
      },
      {
        label: "Matcher warnings",
        value: result.warnings.length === 0 ? "None" : String(result.warnings.length),
        status: result.warnings.length === 0 ? "ready" : "review"
      },
      {
        label: "Hidden contacts",
        value: hiddenContacts === 0 ? "None" : String(hiddenContacts),
        status: hiddenContacts === 0 ? "ready" : "review"
      },
      {
        label: "Score floor",
        value: result.teams.length ? String(scoreFloor) : "No teams",
        status: result.teams.length > 0 ? "ready" : "review"
      }
    ]
  };
}
