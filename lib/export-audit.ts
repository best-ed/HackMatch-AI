import { hackMatchCsvFilename } from "@/lib/export";
import type { MatchingResult, Participant } from "@/lib/matching/types";

export type TeamExportAuditStatus = "ready" | "review" | "blocked";

export type TeamExportAudit = {
  filename: string;
  scope: "live" | "saved";
  cohort: string;
  status: TeamExportAuditStatus;
  teamCount: number;
  assignedCount: number;
  unassignedCount: number;
  exportRows: number;
  contactSharedCount: number;
  contactHiddenCount: number;
  sensitiveContactCount: number;
  warningCount: number;
  lockedTeamCount: number;
  summary: string;
  sensitiveSummary: string;
  checks: Array<{
    label: string;
    detail: string;
    status: TeamExportAuditStatus;
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
  const sensitiveContactCount = assignedParticipants.filter(
    (participant) => participant.consentToShareContact && (participant.email || participant.phone)
  ).length;
  const exportRows = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  const resolvedCohort = cohort?.trim() || "General";
  const filename = hackMatchCsvFilename({
    cohort: resolvedCohort,
    kind: "teams",
    scope
  });

  const checks: TeamExportAudit["checks"] = [
    {
      label: "CSV content",
      detail: exportRows
        ? `${exportRows} participant row(s) will be included in the team CSV.`
        : "No participant rows are available to export yet.",
      status: exportRows ? "ready" : "blocked"
    },
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
        ? `${contactHiddenCount} assigned participant contact record(s) are hidden because sharing is off.`
        : "All assigned participant contact records can be included when available.",
      status: contactHiddenCount ? "review" : "ready"
    },
    {
      label: "Sensitive contact fields",
      detail: sensitiveContactCount
        ? `${sensitiveContactCount} assigned participant(s) may expose email or phone fields in this export.`
        : "No shareable email or phone fields are included in this export.",
      status: sensitiveContactCount ? "review" : "ready"
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
        : "This export reflects current editable data; save a run first for final handoff.",
      status: scope === "saved" ? "ready" : "review"
    }
  ];
  const status = summarizeExportAuditStatus(checks);

  return {
    filename,
    scope,
    cohort: resolvedCohort,
    status,
    teamCount: result.teams.length,
    assignedCount: assignedParticipants.length,
    unassignedCount: result.unassignedParticipants.length,
    exportRows,
    contactSharedCount,
    contactHiddenCount,
    sensitiveContactCount,
    warningCount: result.warnings.length,
    lockedTeamCount,
    summary: `${exportRows} team row${exportRows === 1 ? "" : "s"} for ${result.teams.length} team${result.teams.length === 1 ? "" : "s"} in ${resolvedCohort}.`,
    sensitiveSummary: sensitiveContactCount
      ? `${sensitiveContactCount} shareable contact record${sensitiveContactCount === 1 ? "" : "s"} may appear in the CSV.`
      : "The CSV does not include shareable contact fields for assigned participants.",
    checks
  };
}

function summarizeExportAuditStatus(checks: TeamExportAudit["checks"]): TeamExportAuditStatus {
  if (checks.some((check) => check.status === "blocked")) return "blocked";
  if (checks.some((check) => check.status === "review")) return "review";
  return "ready";
}
