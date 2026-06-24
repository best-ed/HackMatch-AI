import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { generateTeams } from "@/lib/matching/algorithm";
import { buildSavedRunSharePreview } from "@/lib/saved-run-share";

describe("saved run share preview", () => {
  it("builds a copyable saved run summary", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const preview = buildSavedRunSharePreview({
      id: "run-test",
      name: "Final May run",
      createdAt: "2026-06-07T08:00:00.000Z",
      participantCount: demoParticipants.length,
      assignedCount: result.teams.flatMap((team) => team.participantIds).length,
      averageScore: 91,
      cohort: "May Hackathon",
      settingsSnapshot: demoMatchingSettings,
      participantsSnapshot: demoParticipants,
      result
    });

    expect(preview.title).toContain("Final May run");
    expect(preview.status).toBe("review");
    expect(preview.text).toContain("Average score: 91");
    expect(preview.text).toContain("Shareable contacts:");
    expect(preview.metrics.some((metric) => metric.label === "Teams")).toBe(true);
    expect(preview.metrics.some((metric) => metric.label === "Contact sharing")).toBe(true);
  });
});
