import { describe, expect, it } from "vitest";
import { buildLocalBackupRiskAudit } from "@/lib/local-backup-risk";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { createSavedMatchRun } from "@/lib/saved-run-factory";
import { generateTeams } from "@/lib/matching/algorithm";

describe("local backup risk audit", () => {
  it("flags contact fields, access tokens, and saved snapshots for review", () => {
    const participants = demoParticipants.slice(0, 4).map((participant, index) => ({
      ...participant,
      accessToken: index === 0 ? "hm-TEST01" : participant.accessToken
    }));
    const result = generateTeams(participants, demoMatchingSettings);
    const run = createSavedMatchRun({
      name: "June v1",
      participants,
      result,
      settings: demoMatchingSettings,
      activeCohort: participants[0]?.cohort ?? "General",
      savedRunCount: 0
    });

    const audit = buildLocalBackupRiskAudit({
      participants,
      savedRuns: [run]
    });

    expect(audit.status).toBe("review");
    expect(audit.items.find((item) => item.label === "Direct contact fields")?.status).toBe("review");
    expect(audit.items.find((item) => item.label === "Access tokens")?.status).toBe("review");
    expect(audit.items.find((item) => item.label === "Saved-run snapshots")?.detail).toContain("4 participant snapshot");
  });

  it("stays ready when the backup has no participant-sensitive payloads", () => {
    const audit = buildLocalBackupRiskAudit({
      participants: [],
      savedRuns: []
    });

    expect(audit.status).toBe("ready");
    expect(audit.items.every((item) => item.status === "ready")).toBe(true);
  });
});
