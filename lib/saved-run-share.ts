import type { SavedMatchRun } from "@/lib/matching/types";

export type SavedRunSharePreview = {
  title: string;
  metrics: Array<{ label: string; value: string | number }>;
  text: string;
};

export function buildSavedRunSharePreview(run: SavedMatchRun): SavedRunSharePreview {
  const warningCount = run.result.warnings.length;
  const teamCount = run.result.teams.length;
  const lockedCount = run.settingsSnapshot.lockedTeams?.length ?? 0;
  const title = `${run.name} - ${run.cohort ?? "General"}`;
  const metrics = [
    { label: "Teams", value: teamCount },
    { label: "Assigned", value: `${run.assignedCount}/${run.participantCount}` },
    { label: "Average score", value: run.averageScore },
    { label: "Warnings", value: warningCount },
    { label: "Locked teams", value: lockedCount }
  ];
  const text = [
    title,
    `Saved: ${formatDate(run.createdAt)}`,
    `Teams: ${teamCount}`,
    `Assigned: ${run.assignedCount}/${run.participantCount}`,
    `Average score: ${run.averageScore}`,
    `Warnings: ${warningCount}`,
    `Locked teams: ${lockedCount}`
  ].join("\n");

  return { title, metrics, text };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
