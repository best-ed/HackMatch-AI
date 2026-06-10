import { describe, expect, it } from "vitest";
import { appendAdminAuditEntry, createAdminAuditEntry } from "@/lib/admin-audit-history";

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
});
