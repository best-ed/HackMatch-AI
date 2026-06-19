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
  | "checklist"
  | "auth-demo-access"
  | "auth-login"
  | "auth-logout"
  | "auth-cooldown";

export type AdminAuditEntry = {
  id: string;
  action: AdminAuditAction;
  label: string;
  detail: string;
  createdAt: string;
};

export const adminAuditHistoryStorageKey = "hackmatch.adminAuditHistory.v1";

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

export function readAdminAuditHistory(): AdminAuditEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(adminAuditHistoryStorageKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed as AdminAuditEntry[] : [];
  } catch {
    return [];
  }
}

export function writeAdminAuditHistory(history: AdminAuditEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(adminAuditHistoryStorageKey, JSON.stringify(history));
}

export function persistAdminAuditEntry(
  input: {
    action: AdminAuditAction;
    label: string;
    detail: string;
    createdAt?: string;
  },
  limit = 20
): AdminAuditEntry[] {
  const current = readAdminAuditHistory();
  const entry = createAdminAuditEntry(input);
  const next = appendAdminAuditEntry(current, entry, limit);
  writeAdminAuditHistory(next);
  return next;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "entry";
}
