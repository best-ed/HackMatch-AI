import type { MatchingResult, MatchingSettings, Participant, SavedMatchRun } from "@/lib/matching/types";
import { buildPrivacyAudit } from "@/lib/privacy-audit";

export type CohortFinalizationStatus = "ready" | "review" | "blocked";

export type CohortFinalizationCheck = {
  label: string;
  status: CohortFinalizationStatus;
  detail: string;
};

export type CohortFinalizationGate = {
  cohort: string;
  status: CohortFinalizationStatus;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  checks: CohortFinalizationCheck[];
};

export function evaluateCohortFinalizationGate({
  cohort,
  participants,
  settings,
  result,
  savedRuns
}: {
  cohort: string;
  participants: Participant[];
  settings: MatchingSettings;
  result: MatchingResult;
  savedRuns: SavedMatchRun[];
}): CohortFinalizationGate {
  const matchable = participants.filter((participant) => participant.consentToMatch);
  const assignedCount = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  const privacyAudit = buildPrivacyAudit({ participants, result });
  const finalRun = savedRuns.find((run) => run.isFinal && (run.cohort ?? "General") === cohort);
  const savedRunForCohort = savedRuns.find((run) => (run.cohort ?? "General") === cohort);

  const checks: CohortFinalizationCheck[] = [
    {
      label: "Minimum cohort size",
      status: matchable.length >= settings.minTeamSize ? "ready" : "blocked",
      detail: matchable.length >= settings.minTeamSize
        ? `${matchable.length} matchable participant(s) meet the minimum size.`
        : `Needs at least ${settings.minTeamSize} matchable participant(s); currently ${matchable.length}.`
    },
    {
      label: "Generated assignments",
      status: result.teams.length ? "ready" : "blocked",
      detail: result.teams.length
        ? `${result.teams.length} deterministic team(s) are generated.`
        : "Generate teams before finalizing this cohort."
    },
    {
      label: "Assignment coverage",
      status: assignedCount === matchable.length ? "ready" : settings.allowUnassignedParticipants ? "review" : "blocked",
      detail: assignedCount === matchable.length
        ? "Every matchable participant is assigned."
        : `${Math.max(0, matchable.length - assignedCount)} matchable participant(s) are unassigned.`
    },
    {
      label: "Matcher warnings",
      status: result.warnings.length ? "review" : "ready",
      detail: result.warnings.length
        ? `${result.warnings.length} matcher warning(s) should be reviewed.`
        : "No matcher warnings are present."
    },
    {
      label: "Consent posture",
      status: privacyAudit.status === "blocked" ? "blocked" : privacyAudit.status === "review" ? "review" : "ready",
      detail: privacyAudit.assignedWithoutContactCount
        ? `${privacyAudit.assignedWithoutContactCount} assigned participant(s) have contact sharing off.`
        : "Consent checks are ready for handoff."
    },
    {
      label: "Saved run",
      status: finalRun ? "ready" : savedRunForCohort ? "review" : "blocked",
      detail: finalRun
        ? `${finalRun.name} is marked final for ${cohort}.`
        : savedRunForCohort
          ? "A saved run exists, but none is marked final for this cohort."
          : "Save a match run before finalizing this cohort."
    }
  ];

  const readyCount = checks.filter((check) => check.status === "ready").length;
  const reviewCount = checks.filter((check) => check.status === "review").length;
  const blockedCount = checks.filter((check) => check.status === "blocked").length;

  return {
    cohort,
    status: blockedCount ? "blocked" : reviewCount ? "review" : "ready",
    readyCount,
    reviewCount,
    blockedCount,
    checks
  };
}
