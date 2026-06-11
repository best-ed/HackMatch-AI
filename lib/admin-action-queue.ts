import type { DeploymentReadiness } from "@/lib/deployment-readiness";
import type { MatchingResult, SavedMatchRun } from "@/lib/matching/types";
import type { ParticipantIntakeSummary } from "@/lib/participant-intake";
import type { SettingsHealth } from "@/lib/settings-guardrails";

export type AdminActionQueueItem = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
};

export function buildAdminActionQueue({
  intake,
  settingsHealth,
  result,
  matchableCount,
  assignedCount,
  savedRuns,
  finalRun,
  deployment
}: {
  intake: ParticipantIntakeSummary;
  settingsHealth: SettingsHealth;
  result: MatchingResult;
  matchableCount: number;
  assignedCount: number;
  savedRuns: SavedMatchRun[];
  finalRun?: SavedMatchRun;
  deployment: DeploymentReadiness;
}): AdminActionQueueItem[] {
  const items: AdminActionQueueItem[] = [];
  const unassignedMatchable = Math.max(0, matchableCount - assignedCount);

  if (intake.incompleteCount > 0) {
    items.push({
      id: "fix-incomplete-participants",
      priority: "high",
      title: "Fix incomplete participant records",
      detail: `${intake.incompleteCount} participant${intake.incompleteCount === 1 ? "" : "s"} need required fields before matching is reliable.`,
      href: "/admin/participants",
      actionLabel: "Open directory"
    });
  }

  if (settingsHealth.errors.length > 0) {
    items.push({
      id: "fix-settings-errors",
      priority: "high",
      title: "Resolve invalid matching settings",
      detail: `${settingsHealth.errors.length} settings error${settingsHealth.errors.length === 1 ? "" : "s"} block a clean run.`,
      href: "/admin/settings",
      actionLabel: "Open settings"
    });
  }

  if (unassignedMatchable > 0) {
    items.push({
      id: "review-unassigned",
      priority: "medium",
      title: "Review unassigned participants",
      detail: `${unassignedMatchable} matchable participant${unassignedMatchable === 1 ? "" : "s"} are not assigned in the current live run.`,
      href: "/admin/matching",
      actionLabel: "Open match setup"
    });
  }

  if (result.warnings.length > 0) {
    items.push({
      id: "review-matcher-warnings",
      priority: "medium",
      title: "Review matcher warnings",
      detail: `${result.warnings.length} deterministic warning${result.warnings.length === 1 ? "" : "s"} should be checked before final handoff.`,
      href: "/admin/teams",
      actionLabel: "Open team review"
    });
  }

  if (savedRuns.length === 0) {
    items.push({
      id: "save-first-run",
      priority: "medium",
      title: "Save a match run",
      detail: "Freeze a generated run before changing participants or settings again.",
      href: "/admin/teams",
      actionLabel: "Save run"
    });
  } else if (!finalRun) {
    items.push({
      id: "mark-final-run",
      priority: "low",
      title: "Mark the final saved run",
      detail: "Choose the organizer-approved saved run for final exports and handoff.",
      href: "/admin/teams",
      actionLabel: "Mark final"
    });
  }

  if (deployment.status === "review") {
    items.push({
      id: "deployment-review",
      priority: "low",
      title: "Review launch preflight",
      detail: deployment.detail,
      href: "/admin",
      actionLabel: "Review checks"
    });
  }

  if (items.length === 0) {
    items.push({
      id: "ready-for-handoff",
      priority: "low",
      title: "Ready for organizer handoff",
      detail: "Core readiness checks look healthy. Review teams, mark a final run, and export when ready.",
      href: "/admin/teams",
      actionLabel: "Open team review"
    });
  }

  return items.sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority));
}

function priorityRank(priority: AdminActionQueueItem["priority"]) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}
