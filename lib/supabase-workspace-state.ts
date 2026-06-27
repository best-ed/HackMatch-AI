import type { AdminAuditEntry } from "@/lib/admin-audit-history";

export type RemoteWorkspaceState = {
  activeCohort: string;
  archivedCohorts: string[];
  adminAuditHistory: AdminAuditEntry[];
};

export type WorkspaceStateRow = {
  id: "default";
  active_cohort: string;
  archived_cohorts: string[];
  admin_audit_history: AdminAuditEntry[];
  updated_at: string;
};

export function workspaceStateToRow(state: RemoteWorkspaceState): WorkspaceStateRow {
  return {
    id: "default",
    active_cohort: state.activeCohort.trim() || "General",
    archived_cohorts: [...new Set(state.archivedCohorts.map((cohort) => cohort.trim()).filter(Boolean))].sort(),
    admin_audit_history: [...state.adminAuditHistory].sort((left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    ),
    updated_at: new Date().toISOString()
  };
}

export function rowToWorkspaceState(row: WorkspaceStateRow): RemoteWorkspaceState {
  return {
    activeCohort: row.active_cohort?.trim() || "General",
    archivedCohorts: Array.isArray(row.archived_cohorts)
      ? row.archived_cohorts.filter((cohort): cohort is string => typeof cohort === "string")
      : [],
    adminAuditHistory: Array.isArray(row.admin_audit_history)
      ? row.admin_audit_history.filter(isAuditEntryLike)
      : []
  };
}

function isAuditEntryLike(value: unknown): value is AdminAuditEntry {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.action === "string"
    && typeof record.label === "string"
    && typeof record.detail === "string"
    && typeof record.createdAt === "string";
}
