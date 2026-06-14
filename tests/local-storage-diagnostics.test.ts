import { describe, expect, it } from "vitest";
import { buildLocalStorageDiagnostics, formatBytes } from "@/lib/local-storage-diagnostics";

describe("local storage diagnostics", () => {
  it("blocks when browser storage is unavailable", () => {
    const diagnostics = buildLocalStorageDiagnostics({
      available: false,
      entries: [],
      error: "Storage disabled."
    });

    expect(diagnostics.status).toBe("blocked");
    expect(diagnostics.isAvailable).toBe(false);
    expect(diagnostics.items[0].detail).toBe("Storage disabled.");
  });

  it("reports healthy HackMatch local data", () => {
    const diagnostics = buildLocalStorageDiagnostics({
      available: true,
      entries: [
        ["hackmatch.participants.v1", JSON.stringify([{ id: "p01" }])],
        ["hackmatch.settings.v1", JSON.stringify({ desiredTeamSize: 4 })],
        ["hackmatch.savedMatchRuns.v1", "[]"]
      ]
    });

    expect(diagnostics.status).toBe("healthy");
    expect(diagnostics.keyCount).toBe(3);
    expect(diagnostics.totalBytes).toBeGreaterThan(0);
    expect(diagnostics.largestKey).toBeTruthy();
  });

  it("flags large local data for review before storage fills up", () => {
    const largeParticipants = "x".repeat(1_100_000);
    const diagnostics = buildLocalStorageDiagnostics({
      available: true,
      entries: [
        ["hackmatch.participants.v1", largeParticipants],
        ["hackmatch.settings.v1", "{}"]
      ]
    });

    expect(diagnostics.status).toBe("review");
    expect(diagnostics.items.some((item) => item.label === "Storage footprint" && item.status === "review")).toBe(true);
  });

  it("formats storage byte counts for organizer-readable diagnostics", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.00 MB");
  });
});
