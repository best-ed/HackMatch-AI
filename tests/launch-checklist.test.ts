import { describe, expect, it } from "vitest";
import { buildLaunchChecklist } from "@/lib/launch-checklist";
import type { DeploymentReadiness } from "@/lib/deployment-readiness";
import type { SupabaseReadiness } from "@/lib/supabase-readiness";

const readyDeployment: DeploymentReadiness = {
  status: "ready",
  title: "Ready",
  detail: "Ready",
  checks: []
};

const localSupabase: SupabaseReadiness = {
  status: "local",
  title: "Local",
  detail: "Local",
  checks: []
};

describe("launch checklist", () => {
  it("marks final saved-run handoff ready when a final run exists", () => {
    const checklist = buildLaunchChecklist({
      deployment: readyDeployment,
      supabase: localSupabase,
      hasFinalRun: true,
      hasSavedRun: true,
      hasRemoteSavedRunSupport: true,
      hasOpenAiKey: false,
      matchableCount: 4,
      assignedCount: 4,
      settingsStatus: "healthy",
      exportStatus: "ready",
      adminProtectionConfigured: true
    });

    expect(checklist.readyCount).toBe(checklist.totalCount);
    expect(checklist.status).toBe("ready");
    expect(checklist.items.find((item) => item.label === "Saved-run handoff")?.status).toBe("ready");
  });

  it("flags a saved run without a final marker for review", () => {
    const checklist = buildLaunchChecklist({
      deployment: readyDeployment,
      supabase: localSupabase,
      hasFinalRun: false,
      hasSavedRun: true,
      hasRemoteSavedRunSupport: true,
      hasOpenAiKey: true,
      matchableCount: 4,
      assignedCount: 4,
      settingsStatus: "healthy",
      exportStatus: "ready",
      adminProtectionConfigured: true
    });

    expect(checklist.status).toBe("review");
    expect(checklist.items.find((item) => item.label === "Saved-run handoff")?.status).toBe("review");
    expect(checklist.items.find((item) => item.label === "AI explanation mode")?.detail).toContain("OpenAI");
  });

  it("flags launch blockers across admin protection, assignment coverage, and export privacy", () => {
    const checklist = buildLaunchChecklist({
      deployment: readyDeployment,
      supabase: localSupabase,
      hasFinalRun: true,
      hasSavedRun: true,
      hasRemoteSavedRunSupport: true,
      hasOpenAiKey: false,
      activeCohort: "June Hackathon",
      matchableCount: 6,
      assignedCount: 4,
      settingsStatus: "warning",
      exportStatus: "review",
      adminProtectionConfigured: false
    });

    expect(checklist.status).toBe("review");
    expect(checklist.items.find((item) => item.label === "Admin protection")?.status).toBe("review");
    expect(checklist.items.find((item) => item.label === "Assignment coverage")?.detail).toContain("2 matchable");
    expect(checklist.items.find((item) => item.label === "Export privacy")?.href).toBe("/admin/teams");
  });
});
