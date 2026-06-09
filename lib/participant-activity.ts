import type { Participant, SavedMatchRun } from "@/lib/matching/types";

export type ParticipantActivityItem = {
  id: string;
  kind: "participant_created" | "participant_updated" | "saved_run";
  title: string;
  detail: string;
  timestamp: string;
  href: string;
};

export function buildParticipantActivityTimeline({
  participants,
  savedRuns,
  cohort,
  limit = 6
}: {
  participants: Participant[];
  savedRuns: SavedMatchRun[];
  cohort: string;
  limit?: number;
}): ParticipantActivityItem[] {
  const scopedParticipants =
    cohort === "All"
      ? participants
      : participants.filter((participant) => (participant.cohort || "General") === cohort);

  const participantItems = scopedParticipants.map((participant) => {
    const createdAt = participant.createdAt || participant.updatedAt;
    const updatedAt = participant.updatedAt || participant.createdAt;
    const isUpdate = Boolean(updatedAt && createdAt && updatedAt !== createdAt);

    return {
      id: `${isUpdate ? "participant-updated" : "participant-created"}-${participant.id}`,
      kind: isUpdate ? "participant_updated" as const : "participant_created" as const,
      title: isUpdate ? `${participant.fullName} updated` : `${participant.fullName} registered`,
      detail: `${participant.primaryRole} · ${participant.experienceLevel}${participant.consentToMatch ? "" : " · not matchable"}`,
      timestamp: isUpdate ? updatedAt : createdAt,
      href: "/admin/participants"
    };
  });

  const runItems = savedRuns
    .filter((run) => cohort === "All" || (run.cohort || "General") === cohort)
    .map((run) => ({
      id: `saved-run-${run.id}`,
      kind: "saved_run" as const,
      title: `${run.name} saved`,
      detail: `${run.result.teams.length} team${run.result.teams.length === 1 ? "" : "s"} · avg ${run.averageScore}`,
      timestamp: run.createdAt,
      href: "/admin/teams"
    }));

  return [...participantItems, ...runItems]
    .filter((item) => Boolean(item.timestamp))
    .sort((left, right) => {
      const timeSort = new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
      if (timeSort !== 0) return timeSort;
      return left.id.localeCompare(right.id);
    })
    .slice(0, limit);
}
