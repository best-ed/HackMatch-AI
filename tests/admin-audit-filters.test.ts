import { describe, expect, it } from "vitest";
import {
  describeAdminAuditFilter,
  filterAdminAuditHistory,
  isSensitiveAuditAction
} from "@/lib/admin-audit-filters";
import type { AdminAuditEntry } from "@/lib/admin-audit-history";

describe("admin audit filters", () => {
  const history: AdminAuditEntry[] = [
    {
      id: "1",
      action: "auth-login",
      label: "Admin sign-in",
      detail: "Unlocked admin access.",
      createdAt: "2026-06-21T09:00:00.000Z"
    },
    {
      id: "2",
      action: "saved-run",
      label: "June Run",
      detail: "Saved a match run.",
      createdAt: "2026-06-21T09:05:00.000Z"
    },
    {
      id: "3",
      action: "backup-export",
      label: "Local backup downloaded",
      detail: "Downloaded JSON backup.",
      createdAt: "2026-06-21T09:10:00.000Z"
    }
  ];

  it("keeps only auth and data-movement events in the sensitive view", () => {
    expect(filterAdminAuditHistory(history, "sensitive").map((entry) => entry.id)).toEqual(["1", "3"]);
  });

  it("isolates auth events without mixing in routine organizer actions", () => {
    expect(filterAdminAuditHistory(history, "auth").map((entry) => entry.action)).toEqual(["auth-login"]);
  });

  it("labels exports and auth actions as sensitive", () => {
    expect(isSensitiveAuditAction("auth-refresh")).toBe(true);
    expect(isSensitiveAuditAction("backup-restore")).toBe(true);
    expect(isSensitiveAuditAction("saved-run")).toBe(false);
  });

  it("describes each filter in organizer language", () => {
    expect(describeAdminAuditFilter("data")).toMatchObject({
      label: "Data movement"
    });
  });
});
