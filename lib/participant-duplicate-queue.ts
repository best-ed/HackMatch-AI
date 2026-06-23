import type { DuplicateParticipantGroup } from "@/lib/participant-duplicates";

export type DuplicateQueueItem = DuplicateParticipantGroup & {
  priority: "high" | "medium" | "low";
  reasonDetail: string;
};

export function buildParticipantDuplicateQueue(groups: DuplicateParticipantGroup[]) {
  const items = groups.map<DuplicateQueueItem>((group) => ({
    ...group,
    priority: duplicatePriority(group.reason),
    reasonDetail: duplicateReasonDetail(group.reason)
  }));

  return {
    highCount: items.filter((item) => item.priority === "high").length,
    mediumCount: items.filter((item) => item.priority === "medium").length,
    lowCount: items.filter((item) => item.priority === "low").length,
    items: items.sort(
      (left, right) =>
        priorityRank(left.priority) - priorityRank(right.priority) ||
        right.participants.length - left.participants.length ||
        left.label.localeCompare(right.label)
    )
  };
}

function duplicatePriority(reason: DuplicateParticipantGroup["reason"]) {
  if (reason === "access-token") return "high";
  if (reason === "email") return "medium";
  return "low";
}

function duplicateReasonDetail(reason: DuplicateParticipantGroup["reason"]) {
  if (reason === "access-token") {
    return "Shared access tokens can hand the wrong participant the wrong team link.";
  }
  if (reason === "email") {
    return "Shared emails often mean the same participant was imported or registered twice.";
  }
  return "Name plus institution matches are weaker signals, but still worth checking before matching.";
}

function priorityRank(priority: DuplicateQueueItem["priority"]) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}
