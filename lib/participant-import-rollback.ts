import type { Participant } from "@/lib/matching/types";

export type ParticipantImportRollbackSnapshot = {
  createdAt: string;
  beforeParticipants: Participant[];
  afterCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
};

export function createImportRollbackSnapshot({
  beforeParticipants,
  afterCount,
  createdCount,
  updatedCount,
  skippedCount,
  createdAt = new Date().toISOString()
}: {
  beforeParticipants: Participant[];
  afterCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  createdAt?: string;
}): ParticipantImportRollbackSnapshot {
  return {
    createdAt,
    beforeParticipants,
    afterCount,
    createdCount,
    updatedCount,
    skippedCount
  };
}

export function summarizeImportRollback(snapshot?: ParticipantImportRollbackSnapshot) {
  if (!snapshot) return "No import rollback is available.";
  const beforeCount = snapshot.beforeParticipants.length;
  const delta = snapshot.afterCount - beforeCount;
  return `${snapshot.createdCount} created, ${snapshot.updatedCount} updated, ${snapshot.skippedCount} skipped. Rollback returns from ${snapshot.afterCount} to ${beforeCount} participant${beforeCount === 1 ? "" : "s"}${delta === 0 ? "" : ` (${delta > 0 ? "+" : ""}${delta})`}.`;
}
