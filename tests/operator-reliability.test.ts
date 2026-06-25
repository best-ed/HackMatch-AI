import { describe, expect, it } from "vitest";
import { createAdminAuditEntry } from "@/lib/admin-audit-history";
import { summarizeBackupOperations } from "@/lib/backup-operations-summary";
import { buildLocalOpsPlaybook } from "@/lib/local-ops-playbook";
import { summarizeLocalStoragePressure } from "@/lib/local-storage-pressure";

describe("operator reliability helpers", () => {
  it("summarizes local storage pressure from diagnostics", () => {
    const summary = summarizeLocalStoragePressure({
      status: "review",
      isAvailable: true,
      totalBytes: 2_500_000,
      keyCount: 4,
      largestKey: "hackmatch.savedMatchRuns.v1",
      largestKeyBytes: 1_500_000,
      items: []
    });

    expect(summary.status).toBe("review");
    expect(summary.title).toContain("attention");
    expect(summary.detail).toContain("hackmatch.savedMatchRuns.v1");
  });

  it("tracks the latest backup export or restore operation", () => {
    const summary = summarizeBackupOperations([
      createAdminAuditEntry({
        action: "backup-export",
        label: "Local backup downloaded",
        detail: "Downloaded backup JSON.",
        createdAt: "2026-06-22T08:00:00.000Z"
      }),
      createAdminAuditEntry({
        action: "backup-restore",
        label: "Local backup restored",
        detail: "Restored backup JSON.",
        createdAt: "2026-06-22T09:15:00.000Z"
      })
    ]);

    expect(summary.exportCount).toBe(1);
    expect(summary.restoreCount).toBe(1);
    expect(summary.latestAction).toBe("backup-restore");
    expect(summary.latestDetail).toContain("Restored");
  });

  it("builds a local operator playbook that reacts to review states", () => {
    const steps = buildLocalOpsPlaybook({
      deploymentStatus: "review",
      storageStatus: "review"
    });

    expect(steps[0]?.label).toBe("Backup browser data");
    expect(steps.some((step) => step.command === "npm run recover:local")).toBe(true);
    expect(steps[steps.length - 1]?.command).toContain("npm run smoke");
  });
});
