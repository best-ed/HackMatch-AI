import type { SavedMatchRun } from "@/lib/matching/types";

export type SavedRunSharePreview = {
  title: string;
  status: "ready" | "review";
  metrics: Array<{ label: string; value: string | number }>;
  text: string;
};

export function buildSavedRunSharePreview(run: SavedMatchRun): SavedRunSharePreview {
  const warningCount = run.result.warnings.length;
  const teamCount = run.result.teams.length;
  const lockedCount = run.settingsSnapshot.lockedTeams?.length ?? 0;
  const shareableContacts = run.participantsSnapshot.filter((participant) => participant.consentToShareContact).length;
  const hiddenContacts = run.participantsSnapshot.length - shareableContacts;
  const status = run.isFinal && warningCount === 0 ? "ready" : "review";
  const title = `${run.name} - ${run.cohort ?? "General"}`;
  const metrics = [
    { label: "Share status", value: status },
    { label: "Teams", value: teamCount },
    { label: "Assigned", value: `${run.assignedCount}/${run.participantCount}` },
    { label: "Average score", value: run.averageScore },
    { label: "Warnings", value: warningCount },
    { label: "Locked teams", value: lockedCount },
    { label: "Contact sharing", value: `${shareableContacts}/${run.participantsSnapshot.length}` }
  ];
  const text = [
    title,
    `Saved: ${formatDate(run.createdAt)}`,
    `Share status: ${status === "ready" ? "Ready to hand off" : "Review before sharing"}`,
    `Final run: ${run.isFinal ? "Yes" : "No"}`,
    `Teams: ${teamCount}`,
    `Assigned: ${run.assignedCount}/${run.participantCount}`,
    `Average score: ${run.averageScore}`,
    `Warnings: ${warningCount}`,
    `Locked teams: ${lockedCount}`,
    `Shareable contacts: ${shareableContacts}/${run.participantsSnapshot.length}`,
    hiddenContacts > 0 ? `Hidden contact records: ${hiddenContacts}` : "Hidden contact records: 0"
  ].join("\n");

  return { title, status, metrics, text };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
