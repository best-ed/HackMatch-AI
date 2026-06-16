import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { buildTeamCsvArtifact } from "@/lib/export";
import { generateTeams } from "@/lib/matching/algorithm";
import { GET } from "@/app/api/teams.csv/route";

describe("teams csv route", () => {
  it("returns the shared csv artifact and parity headers", async () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const artifact = buildTeamCsvArtifact({
      cohort: "General",
      participants: demoParticipants,
      result,
      scope: "live"
    });

    const response = GET();
    const text = await response.text();

    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain(artifact.filename);
    expect(response.headers.get("x-hackmatch-export-kind")).toBe("teams");
    expect(response.headers.get("x-hackmatch-export-scope")).toBe("live");
    expect(response.headers.get("x-hackmatch-export-cohort")).toBe("General");
    expect(response.headers.get("x-hackmatch-export-assigned")).toBe(String(artifact.assignedCount));
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(text).toBe(artifact.csv);
  });
});
