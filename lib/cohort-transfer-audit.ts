import type { Participant } from "@/lib/matching/types";

export type CohortTransferAudit = {
  status: "ready" | "review";
  targetCohort: string;
  movedCount: number;
  unchangedCount: number;
  sourceCohortCount: number;
  sourceBreakdown: Array<{ cohort: string; count: number }>;
  targetCohortTotal: number;
  targetMatchableCount: number;
  targetExcludedCount: number;
  targetAdvancedCount: number;
  movedRoles: Array<{ label: string; count: number }>;
  movedParticipants: Array<{ id: string; fullName: string; fromCohort: string }>;
  highlights: string[];
  summary: string;
};

export function buildCohortTransferAudit({
  beforeParticipants,
  afterParticipants,
  participantIds,
  targetCohort
}: {
  beforeParticipants: Participant[];
  afterParticipants: Participant[];
  participantIds: string[];
  targetCohort: string;
}): CohortTransferAudit {
  const cleanedTarget = targetCohort.trim() || "General";
  const selectedIds = new Set(participantIds);
  const beforeById = new Map(beforeParticipants.map((participant) => [participant.id, participant]));
  const afterById = new Map(afterParticipants.map((participant) => [participant.id, participant]));

  const movedParticipants = participantIds
    .map((id) => {
      const before = beforeById.get(id);
      const after = afterById.get(id);
      if (!before || !after) return undefined;

      const fromCohort = before.cohort ?? "General";
      const toCohort = after.cohort ?? "General";
      if (fromCohort === cleanedTarget || toCohort !== cleanedTarget) return undefined;

      return {
        id,
        fullName: after.fullName,
        fromCohort
      };
    })
    .filter((participant): participant is { id: string; fullName: string; fromCohort: string } => Boolean(participant));

  const unchangedCount = participantIds.filter((id) => {
    const before = beforeById.get(id);
    const after = afterById.get(id);
    if (!before || !after) return false;
    return (before.cohort ?? "General") === cleanedTarget && (after.cohort ?? "General") === cleanedTarget;
  }).length;

  const targetParticipants = afterParticipants.filter((participant) => (participant.cohort ?? "General") === cleanedTarget);
  const sourceBreakdown = topCounts(movedParticipants.map((participant) => participant.fromCohort)).map(({ label, count }) => ({
    cohort: label,
    count
  }));
  const movedRoles = topCounts(
    movedParticipants
      .map((participant) => afterById.get(participant.id)?.primaryRole ?? "")
      .filter(Boolean)
  );
  const targetMatchableCount = targetParticipants.filter((participant) => participant.consentToMatch).length;
  const targetExcludedCount = targetParticipants.filter((participant) => !participant.consentToMatch).length;
  const targetAdvancedCount = targetParticipants.filter((participant) => participant.experienceLevel === "advanced").length;

  const highlights: string[] = [];
  if (sourceBreakdown.length > 1) {
    highlights.push(`Moved participants came from ${sourceBreakdown.length} source cohorts.`);
  }
  if (targetExcludedCount > 0) {
    highlights.push(`${targetExcludedCount} participant${targetExcludedCount === 1 ? "" : "s"} in ${cleanedTarget} are excluded from matching.`);
  }
  if (targetAdvancedCount === 0) {
    highlights.push(`No advanced participants are currently in ${cleanedTarget}.`);
  }
  if (unchangedCount > 0) {
    highlights.push(`${unchangedCount} selected participant${unchangedCount === 1 ? "" : "s"} were already in ${cleanedTarget}.`);
  }
  if (movedParticipants.length === 0) {
    highlights.push(`No selected participants changed cohort during this action.`);
  }

  const status = highlights.some((highlight) => highlight.includes("excluded") || highlight.includes("No advanced") || highlight.includes("source cohorts"))
    ? "review"
    : "ready";

  return {
    status,
    targetCohort: cleanedTarget,
    movedCount: movedParticipants.length,
    unchangedCount,
    sourceCohortCount: sourceBreakdown.length,
    sourceBreakdown,
    targetCohortTotal: targetParticipants.length,
    targetMatchableCount,
    targetExcludedCount,
    targetAdvancedCount,
    movedRoles,
    movedParticipants: movedParticipants.slice(0, 6),
    highlights,
    summary:
      movedParticipants.length > 0
        ? `Moved ${movedParticipants.length} participant${movedParticipants.length === 1 ? "" : "s"} into ${cleanedTarget}. ${cleanedTarget} now has ${targetParticipants.length} participant${targetParticipants.length === 1 ? "" : "s"}.`
        : `No participants were moved into ${cleanedTarget}.`
  };
}

function topCounts(values: string[]) {
  const counts = new Map<string, number>();
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 4);
}
