import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import {
  createImportRollbackSnapshot,
  summarizeImportRollback
} from "@/lib/participant-import-rollback";

describe("participant import rollback", () => {
  it("captures previous participants and import counts", () => {
    const snapshot = createImportRollbackSnapshot({
      beforeParticipants: demoParticipants.slice(0, 2),
      afterCount: 4,
      createdCount: 2,
      updatedCount: 0,
      skippedCount: 1,
      createdAt: "2026-06-09T00:00:00.000Z"
    });

    expect(snapshot.beforeParticipants).toHaveLength(2);
    expect(snapshot.afterCount).toBe(4);
    expect(snapshot.createdAt).toBe("2026-06-09T00:00:00.000Z");
  });

  it("summarizes rollback impact", () => {
    const snapshot = createImportRollbackSnapshot({
      beforeParticipants: demoParticipants.slice(0, 2),
      afterCount: 5,
      createdCount: 3,
      updatedCount: 1,
      skippedCount: 0
    });

    expect(summarizeImportRollback(snapshot)).toContain("3 created, 1 updated, 0 skipped");
    expect(summarizeImportRollback(snapshot)).toContain("from 5 to 2 participants");
  });
});
