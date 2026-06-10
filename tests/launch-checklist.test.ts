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
      hasOpenAiKey: false
    });

    expect(checklist.readyCount).toBe(checklist.totalCount);
    expect(checklist.items.find((item) => item.label === "Saved-run handoff")?.status).toBe("ready");
  });

  it("flags a saved run without a final marker for review", () => {
    const checklist = buildLaunchChecklist({
      deployment: readyDeployment,
      supabase: localSupabase,
      hasFinalRun: false,
      hasSavedRun: true,
      hasRemoteSavedRunSupport: true,
      hasOpenAiKey: true
    });

    expect(checklist.items.find((item) => item.label === "Saved-run handoff")?.status).toBe("review");
    expect(checklist.items.find((item) => item.label === "AI explanation mode")?.detail).toContain("OpenAI");
  });
});
