import type { AdminAuditEntry } from "@/lib/admin-audit-history";

export type BackupOperationsSummary = {
  exportCount: number;
  restoreCount: number;
  latestAction?: "backup-export" | "backup-restore";
  latestAt?: string;
  latestDetail?: string;
};

export function summarizeBackupOperations(
  auditHistory: AdminAuditEntry[]
): BackupOperationsSummary {
  const backupEntries = auditHistory
    .filter((entry) => entry.action === "backup-export" || entry.action === "backup-restore")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const latest = backupEntries[0];

  return {
    exportCount: backupEntries.filter((entry) => entry.action === "backup-export").length,
    restoreCount: backupEntries.filter((entry) => entry.action === "backup-restore").length,
    latestAction: latest?.action as "backup-export" | "backup-restore" | undefined,
    latestAt: latest?.createdAt,
    latestDetail: latest?.detail
  };
}
