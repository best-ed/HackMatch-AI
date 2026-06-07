import { describe, expect, it } from "vitest";
import { buildTeamExportAudit } from "@/lib/export-audit";
import { demoParticipants } from "@/lib/demo-data";
import { generateTeams } from "@/lib/matching/algorithm";
import { demoMatchingSettings } from "@/lib/demo-data";

describe("team export audit", () => {
  it("summarizes team CSV export scope and contact sharing limits", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const audit = buildTeamExportAudit({
      result,
      participants: demoParticipants,
      cohort: "General",
      scope: "live",
      lockedTeamCount: 2
    });

    const assignedCount = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
    const assignedIds = new Set(result.teams.flatMap((team) => team.participantIds));
    const contactSharedCount = demoParticipants.filter(
      (participant) => assignedIds.has(participant.id) && participant.consentToShareContact
    ).length;

    expect(audit.filename).toContain("hackmatch-general-teams-live");
    expect(audit.exportRows).toBe(assignedCount);
    expect(audit.assignedCount).toBe(assignedCount);
    expect(audit.contactSharedCount).toBe(contactSharedCount);
    expect(audit.contactHiddenCount).toBe(assignedCount - contactSharedCount);
    expect(audit.lockedTeamCount).toBe(2);
    expect(audit.checks.map((check) => check.label)).toContain("Contact sharing");
  });
});
