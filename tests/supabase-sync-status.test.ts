import { describe, expect, it } from "vitest";
import { buildSupabaseSyncSummary } from "@/lib/supabase-sync-status";
import type { SupabaseReadiness } from "@/lib/supabase-readiness";
import type { SupabaseSchemaReadiness } from "@/lib/supabase-schema-readiness";

const localReadiness: SupabaseReadiness = {
  status: "local",
  title: "Local-storage MVP mode",
  detail: "Supabase is optional right now.",
  checks: []
};

const readyReadiness: SupabaseReadiness = {
  status: "ready",
  title: "Supabase env looks ready",
  detail: "Env values look ready.",
  checks: []
};

const readySchema: SupabaseSchemaReadiness = {
  readyCount: 4,
  totalCount: 4,
  title: "4/4 persistence surfaces are remote-ready",
  detail: "All covered.",
  items: []
};

describe("supabase sync status", () => {
  it("summarizes local-only mode while preserving fallback detail", () => {
    const summary = buildSupabaseSyncSummary({
      persistenceMode: "local",
      readiness: localReadiness,
      schema: readySchema,
      participantsCount: 31,
      savedRunsCount: 2
    });

    expect(summary.status).toBe("local-only");
    expect(summary.activeModeLabel).toBe("Browser-local active");
    expect(summary.surfaces.find((surface) => surface.label === "Runtime mode")?.status).toBe("local");
  });

  it("summarizes active remote sync when Supabase is the runtime mode", () => {
    const summary = buildSupabaseSyncSummary({
      persistenceMode: "supabase",
      readiness: readyReadiness,
      schema: readySchema,
      participantsCount: 31,
      savedRunsCount: 2
    });

    expect(summary.status).toBe("remote-active");
    expect(summary.title).toBe("Remote sync is active");
    expect(summary.surfaces.find((surface) => surface.label === "Runtime mode")?.status).toBe("synced");
  });

  it("flags sync warnings even when local fallback is available", () => {
    const summary = buildSupabaseSyncSummary({
      persistenceMode: "supabase",
      persistenceWarning: "Supabase save failed; local browser storage is still updated.",
      readiness: readyReadiness,
      schema: readySchema,
      participantsCount: 31,
      savedRunsCount: 2
    });

    expect(summary.status).toBe("needs-review");
    expect(summary.detail).toContain("warning");
  });
});
