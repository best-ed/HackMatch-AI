import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import {
  createHackMatchBackup,
  hackMatchBackupFilename,
  parseHackMatchBackupJson,
  summarizeHackMatchBackup
} from "@/lib/local-backup";

describe("local backup guardrails", () => {
  it("creates a portable backup snapshot with organizer state", () => {
    const backup = createHackMatchBackup({
      participants: demoParticipants.slice(0, 2),
      settings: demoMatchingSettings,
      savedMatchRuns: [],
      activeCohort: "June build",
      archivedCohorts: ["May build"],
      teamReviewChecklist: {
        "run-1::team-1": {
          rolesConfirmed: true,
          contactsConfirmed: true,
          blockersCleared: true,
          reviewed: true
        }
      },
      exportedAt: "2026-06-11T10:00:00.000Z"
    });

    expect(backup.version).toBe("hackmatch-backup-v1");
    expect(summarizeHackMatchBackup(backup)).toMatchObject({
      participants: 2,
      savedRuns: 0,
      archivedCohorts: 1,
      reviewedTeams: 1,
      activeCohort: "June build"
    });
  });

  it("parses a valid backup and rejects unsupported shapes", () => {
    const backup = createHackMatchBackup({
      participants: demoParticipants.slice(0, 1),
      settings: demoMatchingSettings,
      savedMatchRuns: [],
      activeCohort: "General",
      archivedCohorts: []
    });

    const parsed = parseHackMatchBackupJson(JSON.stringify(backup));
    const invalid = parseHackMatchBackupJson(JSON.stringify({ version: "old", participants: [] }));

    expect(parsed.ok).toBe(true);
    expect(parsed.ok ? parsed.summary.participants : 0).toBe(1);
    expect(invalid.ok).toBe(false);
  });

  it("uses a filesystem-friendly backup filename", () => {
    expect(hackMatchBackupFilename("2026-06-11T10:00:00.000Z")).toBe(
      "hackmatch-backup-2026-06-11T10-00-00-000Z.json"
    );
  });
});
