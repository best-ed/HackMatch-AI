import { hackMatchCsvFilename } from "@/lib/export";
import type { MatchingResult, Participant } from "@/lib/matching/types";

export type TeamExportAudit = {
  filename: string;
  scope: "live" | "saved";
  cohort: string;
  teamCount: number;
  assignedCount: number;
  unassignedCount: number;
  exportRows: number;
  contactSharedCount: number;
  contactHiddenCount: number;
  warningCount: number;
  lockedTeamCount: number;
  summary: string;
  checks: Array<{
    label: string;
    detail: string;
    status: "ready" | "review";
  }>;
};

export function buildTeamExportAudit({
  result,
  participants,
  cohort,
  scope,
  lockedTeamCount = 0
}: {
  result: MatchingResult;
  participants: Participant[];
  cohort?: string;
  scope: "live" | "saved";
  lockedTeamCount?: number;
}): TeamExportAudit {
  const assignedIds = new Set(result.teams.flatMap((team) => team.participantIds));
  const assignedParticipants = participants.filter((participant) => assignedIds.has(participant.id));
  const contactSharedCount = assignedParticipants.filter((participant) => participant.consentToShareContact).length;
  const contactHiddenCount = Math.max(0, assignedParticipants.length - contactSharedCount);
  const exportRows = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  const resolvedCohort = cohort?.trim() || "General";
  const filename = hackMatchCsvFilename({
    cohort: resolvedCohort,
    kind: "teams",
    scope
  });

  const checks: TeamExportAudit["checks"] = [
    {
      label: "Assignment coverage",
      detail: result.unassignedParticipants.length
        ? `${result.unassignedParticipants.length} participant(s) remain unassigned and will not appear as team rows.`
        : "Every assigned participant appears in the team export.",
      status: result.unassignedParticipants.length ? "review" : "ready"
    },
    {
      label: "Contact sharing",
      detail: contactHiddenCount
        ? `${contactHiddenCount} assigned participant email(s) are hidden because contact sharing is off.`
        : "All assigned participant emails can be included.",
      status: contactHiddenCount ? "review" : "ready"
    },
    {
      label: "Matcher warnings",
      detail: result.warnings.length
        ? `${result.warnings.length} warning(s) should be reviewed before exporting.`
        : "No matcher warnings are attached to this run.",
      status: result.warnings.length ? "review" : "ready"
    },
    {
      label: scope === "saved" ? "Frozen snapshot" : "Live data",
      detail: scope === "saved"
        ? "This export uses the saved participant and settings snapshot."
        : "This export reflects the current editable participants and settings.",
      status: "ready"
    }
  ];

  return {
    filename,
    scope,
    cohort: resolvedCohort,
    teamCount: result.teams.length,
    assignedCount: assignedParticipants.length,
    unassignedCount: result.unassignedParticipants.length,
    exportRows,
    contactSharedCount,
    contactHiddenCount,
    warningCount: result.warnings.length,
    lockedTeamCount,
    summary: `${exportRows} team row${exportRows === 1 ? "" : "s"} for ${result.teams.length} team${result.teams.length === 1 ? "" : "s"} in ${resolvedCohort}.`,
    checks
  };
}
