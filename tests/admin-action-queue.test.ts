import { describe, expect, it } from "vitest";
import { buildAdminActionQueue } from "@/lib/admin-action-queue";
import type { DeploymentReadiness } from "@/lib/deployment-readiness";
import type { MatchingResult, SavedMatchRun } from "@/lib/matching/types";
import type { ParticipantIntakeSummary } from "@/lib/participant-intake";
import type { SettingsHealth } from "@/lib/settings-guardrails";

const healthyIntake: ParticipantIntakeSummary = {
  totalCount: 4,
  matchableCount: 4,
  excludedCount: 0,
  incompleteCount: 0,
  lowSignalCount: 0,
  roleCoverage: [],
  issues: []
};

const healthySettings: SettingsHealth = {
  status: "healthy",
  errors: [],
  warnings: []
};

const result: MatchingResult = {
  teams: [],
  scoreBreakdowns: {},
  explanations: [],
  warnings: [],
  unassignedParticipants: []
};

const deployment: DeploymentReadiness = {
  status: "ready",
  title: "Ready",
  detail: "Ready",
  checks: []
};

const savedRun = {
  id: "run-1",
  name: "Final run"
} as SavedMatchRun;

describe("admin action queue", () => {
  it("prioritizes blockers before handoff actions", () => {
    const queue = buildAdminActionQueue({
      intake: { ...healthyIntake, incompleteCount: 2 },
      settingsHealth: { ...healthySettings, errors: ["Invalid range"] },
      result,
      matchableCount: 4,
      assignedCount: 4,
      savedRuns: [],
      deployment
    });

    expect(queue[0].priority).toBe("high");
    expect(queue.map((item) => item.id)).toContain("fix-incomplete-participants");
    expect(queue.map((item) => item.id)).toContain("fix-settings-errors");
  });

  it("asks for final run when saved runs exist but none is final", () => {
    const queue = buildAdminActionQueue({
      intake: healthyIntake,
      settingsHealth: healthySettings,
      result,
      matchableCount: 4,
      assignedCount: 4,
      savedRuns: [savedRun],
      deployment
    });

    expect(queue.map((item) => item.id)).toContain("mark-final-run");
  });

  it("returns handoff action when all signals are healthy", () => {
    const queue = buildAdminActionQueue({
      intake: healthyIntake,
      settingsHealth: healthySettings,
      result,
      matchableCount: 4,
      assignedCount: 4,
      savedRuns: [savedRun],
      finalRun: { ...savedRun, isFinal: true },
      deployment
    });

    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("ready-for-handoff");
  });
});
