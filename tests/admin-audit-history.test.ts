import { describe, expect, it, vi } from "vitest";
import {
  appendAdminAuditEntry,
  createAdminAuditEntry,
  persistAdminAuditEntry,
  readAdminAuditHistory
} from "@/lib/admin-audit-history";

describe("admin audit history", () => {
  it("creates stable audit entries from action labels", () => {
    const entry = createAdminAuditEntry({
      action: "saved-run",
      label: "Final Run!",
      detail: "Saved 8 teams.",
      createdAt: "2026-06-10T08:00:00.000Z"
    });

    expect(entry).toEqual({
      id: "20260610080000000-saved-run-final-run",
      action: "saved-run",
      label: "Final Run!",
      detail: "Saved 8 teams.",
      createdAt: "2026-06-10T08:00:00.000Z"
    });
  });

  it("keeps newest audit entries first and caps history", () => {
    const older = createAdminAuditEntry({
      action: "renamed-run",
      label: "Older",
      detail: "Renamed.",
      createdAt: "2026-06-10T08:00:00.000Z"
    });
    const newer = createAdminAuditEntry({
      action: "final-run",
      label: "Newer",
      detail: "Marked final.",
      createdAt: "2026-06-10T09:00:00.000Z"
    });

    const history = appendAdminAuditEntry([older], newer, 1);

    expect(history).toEqual([newer]);
  });

  it("persists browser-local audit entries for cross-page history", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem(key: string) {
          return storage.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          storage.set(key, value);
        }
      }
    });

    const history = persistAdminAuditEntry({
      action: "auth-login",
      label: "Admin sign-in",
      detail: "Unlocked admin access."
    });

    expect(history[0]?.action).toBe("auth-login");
    expect(readAdminAuditHistory()[0]?.label).toBe("Admin sign-in");
  });
});
