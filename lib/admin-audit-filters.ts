import type { AdminAuditAction, AdminAuditEntry } from "@/lib/admin-audit-history";

export type AdminAuditFilter = "all" | "sensitive" | "auth" | "data";

export function filterAdminAuditHistory(
  history: AdminAuditEntry[],
  filter: AdminAuditFilter
) {
  if (filter === "all") return history;

  return history.filter((entry) => {
    if (filter === "sensitive") return isSensitiveAuditAction(entry.action);
    if (filter === "auth") return isAuthAuditAction(entry.action);
    return isDataMovementAuditAction(entry.action);
  });
}

export function isSensitiveAuditAction(action: AdminAuditAction) {
  return isAuthAuditAction(action) || isDataMovementAuditAction(action);
}

export function isAuthAuditAction(action: AdminAuditAction) {
  return action.startsWith("auth-");
}

export function isDataMovementAuditAction(action: AdminAuditAction) {
  return dataMovementActions.has(action);
}

export function describeAdminAuditFilter(filter: AdminAuditFilter) {
  switch (filter) {
    case "all":
      return {
        label: "All events",
        detail: "Every organizer action recorded in this browser-local audit trail."
      };
    case "sensitive":
      return {
        label: "Sensitive events",
        detail: "Auth, export, share, restore, and backup actions that deserve closer operator review."
      };
    case "auth":
      return {
        label: "Access events",
        detail: "Sign-in, sign-out, refresh, cooldown, and demo-access actions only."
      };
    case "data":
      return {
        label: "Data movement",
        detail: "Exports, access-link handoffs, restores, shares, and local backup events."
      };
  }
}

const dataMovementActions = new Set<AdminAuditAction>([
  "export-participants",
  "export-access-links",
  "export-teams",
  "copied-access-links",
  "participant-import",
  "participant-import-rollback",
  "participant-bulk-update",
  "participant-token-rotation",
  "participant-delete",
  "shared-run",
  "restored-run",
  "backup-export",
  "backup-restore"
]);
