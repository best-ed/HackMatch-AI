import { describe, expect, it } from "vitest";
import { buildSupabaseEnvSummary } from "@/lib/supabase-env-summary";
import { buildSupabaseFirstSyncPlan } from "@/lib/supabase-first-sync-plan";
import { evaluateSupabaseReadiness } from "@/lib/supabase-readiness";
import { evaluateSupabaseSchemaReadiness } from "@/lib/supabase-schema-readiness";
import { buildSupabaseSyncCoverage } from "@/lib/supabase-sync-coverage";
import { rowToWorkspaceState, workspaceStateToRow } from "@/lib/supabase-workspace-state";

describe("supabase attachment helpers", () => {
  it("summarizes missing Supabase env as local-only mode", () => {
    const summary = buildSupabaseEnvSummary({});

    expect(summary.status).toBe("local");
    expect(summary.checks.find((check) => check.label === "Anon key shape")?.value).toBe("Missing");
  });

  it("round-trips workspace state rows", () => {
    const row = workspaceStateToRow({
      activeCohort: "June Hackathon",
      archivedCohorts: ["May Hackathon", "May Hackathon"],
      adminAuditHistory: [
        {
          id: "1",
          action: "saved-run",
          label: "Saved run",
          detail: "Saved June run.",
          createdAt: "2026-06-22T10:00:00.000Z"
        }
      ]
    });

    const state = rowToWorkspaceState(row);
    expect(state.activeCohort).toBe("June Hackathon");
    expect(state.archivedCohorts).toEqual(["May Hackathon"]);
    expect(state.adminAuditHistory).toHaveLength(1);
  });

  it("describes sync coverage for local fallback and remote-active modes", () => {
    const schema = evaluateSupabaseSchemaReadiness();

    const local = buildSupabaseSyncCoverage({
      persistenceMode: "local",
      schema
    });
    const remote = buildSupabaseSyncCoverage({
      persistenceMode: "supabase",
      schema
    });

    expect(local.items.find((item) => item.label === "Workspace state")?.status).toBe("fallback");
    expect(remote.items.find((item) => item.label === "Workspace state")?.status).toBe("active");
  });

  it("builds a first-sync rollout plan from readiness signals", () => {
    const plan = buildSupabaseFirstSyncPlan({
      readiness: evaluateSupabaseReadiness({
        url: "https://demo.supabase.co",
        anonKey: "header.payloadsignaturemorethanfortycharacters.signature"
      }),
      participantCount: 30,
      savedRunCount: 2,
      backupExports: 0
    });

    expect(plan.steps[0]?.label).toBe("Back up the local workspace");
    expect(plan.steps[2]?.detail).toContain("already look attached");
  });
});
