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
    expect(audit.sensitiveContactCount).toBe(contactSharedCount);
    expect(audit.lockedTeamCount).toBe(2);
    expect(audit.checks.map((check) => check.label)).toContain("Contact sharing");
    expect(audit.checks.map((check) => check.label)).toContain("Sensitive contact fields");
    expect(audit.status).toBe("review");
    expect(audit.sensitiveSummary).toContain("shareable contact");
  });

  it("keeps saved exports under review when assigned contacts are hidden", () => {
    const participants = demoParticipants.slice(0, 3).map((participant) => ({
      ...participant,
      consentToShareContact: false
    }));
    const result = {
      teams: [{ id: "team-1", name: "Team 1", participantIds: participants.map((participant) => participant.id) }],
      scoreBreakdowns: {},
      explanations: [],
      warnings: [],
      unassignedParticipants: []
    };

    const audit = buildTeamExportAudit({
      result,
      participants,
      cohort: "June",
      scope: "saved"
    });

    expect(audit.status).toBe("review");
    expect(audit.contactHiddenCount).toBe(3);
    expect(audit.sensitiveContactCount).toBe(0);
  });

  it("blocks exports with no team rows", () => {
    const audit = buildTeamExportAudit({
      result: {
        teams: [],
        scoreBreakdowns: {},
        explanations: [],
        warnings: [],
        unassignedParticipants: []
      },
      participants: [],
      cohort: "Empty",
      scope: "saved"
    });

    expect(audit.status).toBe("blocked");
    expect(audit.checks.find((check) => check.label === "CSV content")?.status).toBe("blocked");
  });
});
