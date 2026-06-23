import type { ParticipantIntakeSummary } from "@/lib/participant-intake";
import type { ParticipantReadinessFilter } from "@/lib/participant-readiness-filter";

export type ParticipantOperatorNudge = {
  title: string;
  detail: string;
  filter?: ParticipantReadinessFilter;
};

export function buildParticipantOperatorNudges({
  averageCompleteness,
  duplicateCount,
  summary
}: {
  averageCompleteness: number;
  duplicateCount: number;
  summary: ParticipantIntakeSummary;
}): ParticipantOperatorNudge[] {
  const nudges: ParticipantOperatorNudge[] = [];

  if (summary.incompleteCount > 0) {
    nudges.push({
      title: "Fix incomplete profiles first",
      detail: `${summary.incompleteCount} participant record${summary.incompleteCount === 1 ? "" : "s"} are missing required fields that matching depends on.`,
      filter: "incomplete"
    });
  }

  if (duplicateCount > 0) {
    nudges.push({
      title: "Clear duplicate records before import drift grows",
      detail: `${duplicateCount} participant record${duplicateCount === 1 ? "" : "s"} appear inside duplicate groups, which can distort cohort counts and link handoffs.`,
      filter: "duplicates"
    });
  }

  if (averageCompleteness < 70) {
    nudges.push({
      title: "Average completeness is still thin",
      detail: `Directory completeness is ${averageCompleteness}, so generated teams may lean on sparse profiles more than you want.`
    });
  }

  if (summary.lowSignalCount > 0) {
    nudges.push({
      title: "Collect stronger matching signal",
      detail: `${summary.lowSignalCount} participant profile${summary.lowSignalCount === 1 ? "" : "s"} could use skills, interests, or teammate preferences for better deterministic fits.`,
      filter: "low-signal"
    });
  }

  if (summary.excludedCount > 0) {
    nudges.push({
      title: "Review excluded participants separately",
      detail: `${summary.excludedCount} participant${summary.excludedCount === 1 ? "" : "s"} are currently outside matching because consent is off.`
    });
  }

  if (nudges.length === 0) {
    nudges.push({
      title: "Directory is in solid shape",
      detail: "The current participant set has enough coverage to move into matching or run one last manual pass."
    });
  }

  return nudges.slice(0, 3);
}
