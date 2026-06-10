export type AdminAuditAction =
  | "saved-run"
  | "renamed-run"
  | "noted-run"
  | "final-run"
  | "duplicated-run"
  | "restored-run"
  | "deleted-run"
  | "shared-run"
  | "locked-team"
  | "checklist";

export type AdminAuditEntry = {
  id: string;
  action: AdminAuditAction;
  label: string;
  detail: string;
  createdAt: string;
};

export function createAdminAuditEntry({
  action,
  label,
  detail,
  createdAt = new Date().toISOString()
}: {
  action: AdminAuditAction;
  label: string;
  detail: string;
  createdAt?: string;
}): AdminAuditEntry {
  return {
    id: `${createdAt.replace(/[^0-9]/g, "")}-${action}-${slugify(label)}`,
    action,
    label: label.trim(),
    detail: detail.trim(),
    createdAt
  };
}

export function appendAdminAuditEntry(
  history: AdminAuditEntry[],
  entry: AdminAuditEntry,
  limit = 20
): AdminAuditEntry[] {
  return [entry, ...history]
    .sort((left, right) => {
      const dateSort = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      if (dateSort !== 0) return dateSort;
      return left.id.localeCompare(right.id);
    })
    .slice(0, limit);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "entry";
}
