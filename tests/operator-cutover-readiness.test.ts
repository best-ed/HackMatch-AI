import { describe, expect, it } from "vitest";
import { createAdminAuditEntry } from "@/lib/admin-audit-history";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { buildParticipantExportManifest } from "@/lib/participant-export-manifest";
import { buildRemoteCutoverChecklist } from "@/lib/remote-cutover-checklist";
import { evaluateSupabaseReadiness } from "@/lib/supabase-readiness";
import { evaluateSupabaseRlsReadiness } from "@/lib/supabase-rls-readiness";
import { evaluateSupabaseSchemaReadiness } from "@/lib/supabase-schema-readiness";
import { buildTeamExportManifest } from "@/lib/team-export-manifest";
import { buildWorkspaceSnapshotSummary } from "@/lib/workspace-snapshot-summary";
import { generateTeams } from "@/lib/matching/algorithm";
import type { SavedMatchRun } from "@/lib/matching/types";

describe("operator cutover helpers", () => {
  it("summarizes the current local workspace snapshot", () => {
    const summary = buildWorkspaceSnapshotSummary({
      participants: demoParticipants.slice(0, 4),
      savedRuns: [
        {
          id: "run-1",
          name: "Snapshot",
          cohort: "General",
          participantCount: 4,
          assignedCount: 4,
          averageScore: 91,
          settingsSnapshot: demoMatchingSettings,
          participantsSnapshot: demoParticipants.slice(0, 4),
          result: generateTeams(demoParticipants.slice(0, 4), demoMatchingSettings),
          createdAt: "2026-06-22T09:00:00.000Z"
        } as SavedMatchRun
      ],
      activeCohort: "General",
      archivedCohorts: ["May Hackathon"],
      auditHistory: [
        createAdminAuditEntry({
          action: "saved-run",
          label: "Saved run",
          detail: "Saved a run for General.",
          createdAt: "2026-06-22T09:05:00.000Z"
        })
      ]
    });

    expect(summary.status).toBe("ready");
    expect(summary.metrics.find((item) => item.label === "Final runs")?.value).toBe("0");
    expect(summary.latestChange).toContain("2026");
  });

  it("builds participant export manifests with consent and token checks", () => {
    const manifest = buildParticipantExportManifest({
      participants: demoParticipants.slice(0, 3).map((participant, index) => ({
        ...participant,
        accessToken: index === 2 ? "" : participant.accessToken,
        consentToShareContact: index === 0
      })),
      scope: "filtered",
      activeCohort: "June Hackathon"
    });

    expect(manifest.status).toBe("review");
    expect(manifest.checks.find((item) => item.label === "Access tokens")?.value).toContain("missing");
  });

  it("builds team export manifests with warning and contact checks", () => {
    const participants = demoParticipants.slice(0, 4).map((participant, index) => ({
      ...participant,
      consentToShareContact: index < 2
    }));
    const result = generateTeams(participants, demoMatchingSettings);
    const manifest = buildTeamExportManifest({
      result,
      participants,
      cohort: "General",
      scope: "live"
    });

    expect(manifest.checks.find((item) => item.label === "Assigned participants")?.value).toBe("4");
    expect(manifest.checks.find((item) => item.label === "Hidden contacts")?.status).toBe("review");
  });

  it("builds a remote cutover checklist from Supabase posture", () => {
    const checklist = buildRemoteCutoverChecklist({
      supabase: evaluateSupabaseReadiness({
        url: "https://demo.supabase.co",
        anonKey: "header.payloadsignaturemorethanfortycharacters.signature"
      }),
      schema: evaluateSupabaseSchemaReadiness(),
      rls: evaluateSupabaseRlsReadiness({
        hasAdminPasscode: true,
        hasSupabaseEnv: true,
        usesAnonClient: true
      }),
      participantCount: 30,
      savedRunCount: 2,
      hasFinalRun: true
    });

    expect(checklist.status).toBe("review");
    expect(checklist.items.find((item) => item.label === "Supabase env")?.status).toBe("ready");
    expect(checklist.items.find((item) => item.label === "Row-level security")?.status).toBe("review");
  });
});
