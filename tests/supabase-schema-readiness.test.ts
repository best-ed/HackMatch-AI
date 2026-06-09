import { describe, expect, it } from "vitest";
import { evaluateSupabaseSchemaReadiness } from "@/lib/supabase-schema-readiness";

describe("supabase schema readiness", () => {
  it("reports which persistence surfaces are remote-ready today", () => {
    const readiness = evaluateSupabaseSchemaReadiness();

    expect(readiness.readyCount).toBe(3);
    expect(readiness.totalCount).toBe(4);
    expect(readiness.items.map((item) => item.label)).toEqual([
      "Participants",
      "Matching settings",
      "Saved match runs",
      "Team review checklist"
    ]);
    expect(readiness.items.find((item) => item.label === "Saved match runs")?.status).toBe("ready");
    expect(readiness.items.find((item) => item.label === "Team review checklist")?.status).toBe("planned");
  });
});
