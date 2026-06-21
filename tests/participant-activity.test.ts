import { describe, expect, it } from "vitest";
import { createAdminAuditEntry } from "@/lib/admin-audit-history";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import type { MatchingResult, SavedMatchRun } from "@/lib/matching/types";
import { buildParticipantActivityTimeline } from "@/lib/participant-activity";

const emptyResult: MatchingResult = {
  teams: [],
  scoreBreakdowns: {},
  explanations: [],
  warnings: [],
  unassignedParticipants: []
};

function savedRun(overrides: Partial<SavedMatchRun>): SavedMatchRun {
  return {
    id: "run-1",
    name: "Match run 1",
    createdAt: "2026-06-09T08:00:00.000Z",
    participantCount: 2,
    assignedCount: 2,
    averageScore: 91,
    cohort: "June",
    settingsSnapshot: demoMatchingSettings,
    participantsSnapshot: [],
    result: emptyResult,
    ...overrides
  };
}

describe("participant activity timeline", () => {
  it("sorts participant and saved run activity by most recent timestamp", () => {
    const participants = [
      {
        ...demoParticipants[0],
        id: "p-old",
        fullName: "Old Participant",
        cohort: "June",
        createdAt: "2026-06-08T08:00:00.000Z",
        updatedAt: "2026-06-08T08:00:00.000Z"
      },
      {
        ...demoParticipants[1],
        id: "p-new",
        fullName: "New Participant",
        cohort: "June",
        createdAt: "2026-06-09T09:00:00.000Z",
        updatedAt: "2026-06-09T09:00:00.000Z"
      }
    ];

    const timeline = buildParticipantActivityTimeline({
      participants,
      savedRuns: [savedRun({ id: "run-2", createdAt: "2026-06-09T10:00:00.000Z" })],
      cohort: "June"
    });

    expect(timeline.map((item) => item.id)).toEqual([
      "saved-run-run-2",
      "participant-created-p-new",
      "participant-created-p-old"
    ]);
  });

  it("limits activity to the active cohort", () => {
    const timeline = buildParticipantActivityTimeline({
      participants: [
        { ...demoParticipants[0], id: "p-june", cohort: "June" },
        { ...demoParticipants[1], id: "p-july", cohort: "July" }
      ],
      savedRuns: [
        savedRun({ id: "run-june", cohort: "June" }),
        savedRun({ id: "run-july", cohort: "July" })
      ],
      cohort: "June"
    });

    expect(timeline.map((item) => item.id)).toContain("participant-created-p-june");
    expect(timeline.map((item) => item.id)).toContain("saved-run-run-june");
    expect(timeline.map((item) => item.id)).not.toContain("participant-created-p-july");
    expect(timeline.map((item) => item.id)).not.toContain("saved-run-run-july");
  });

  it("surfaces admin auth audit events alongside organizer activity", () => {
    const timeline = buildParticipantActivityTimeline({
      participants: [
        {
          ...demoParticipants[0],
          id: "p-june",
          fullName: "June Builder",
          cohort: "June",
          createdAt: "2026-06-09T08:00:00.000Z",
          updatedAt: "2026-06-09T08:00:00.000Z"
        }
      ],
      savedRuns: [],
      auditHistory: [
        createAdminAuditEntry({
          action: "auth-refresh",
          label: "Admin session refreshed",
          detail: "Extended the current organizer session before continuing admin work.",
          createdAt: "2026-06-09T10:45:00.000Z"
        }),
        createAdminAuditEntry({
          action: "auth-login",
          label: "Admin sign-in",
          detail: "Unlocked admin access and continued to team review.",
          createdAt: "2026-06-09T10:30:00.000Z"
        })
      ],
      cohort: "June"
    });

    expect(timeline.map((item) => item.id)).toEqual([
      "admin-audit-20260609104500000-auth-refresh-admin-session-refreshed",
      "admin-audit-20260609103000000-auth-login-admin-sign-in",
      "participant-created-p-june"
    ]);
    expect(timeline[0]).toMatchObject({
      kind: "admin_auth",
      href: "/admin/login"
    });
  });

  it("surfaces sensitive organizer operations in the timeline", () => {
    const timeline = buildParticipantActivityTimeline({
      participants: [],
      savedRuns: [],
      auditHistory: [
        createAdminAuditEntry({
          action: "backup-export",
          label: "Local backup downloaded",
          detail: "Downloaded backup JSON for June Hackathon with 30 participants.",
          createdAt: "2026-06-09T11:00:00.000Z"
        }),
        createAdminAuditEntry({
          action: "export-teams",
          label: "june-hackathon-teams.csv",
          detail: "Downloaded saved-run team export for June Hackathon.",
          createdAt: "2026-06-09T10:45:00.000Z"
        })
      ],
      cohort: "June"
    });

    expect(timeline.map((item) => item.id)).toEqual([
      "admin-op-20260609110000000-backup-export-local-backup-downloaded",
      "admin-op-20260609104500000-export-teams-june-hackathon-teams-csv"
    ]);
    expect(timeline[0]).toMatchObject({
      kind: "admin_operation",
      href: "/admin/settings"
    });
    expect(timeline[1]).toMatchObject({
      kind: "admin_operation",
      href: "/admin/teams"
    });
  });
});
