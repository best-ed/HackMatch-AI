import { describe, expect, it } from "vitest";
import { evaluateSupabaseRlsReadiness } from "@/lib/supabase-rls-readiness";

describe("supabase rls readiness", () => {
  it("keeps anon-client production posture under review", () => {
    const readiness = evaluateSupabaseRlsReadiness({
      hasAdminPasscode: true,
      hasSupabaseEnv: true,
      usesAnonClient: true
    });

    expect(readiness.status).toBe("review");
    expect(readiness.items.find((item) => item.label === "Anon client policy")?.status).toBe("review");
    expect(readiness.items.find((item) => item.label === "Participant contact privacy")?.action).toContain("RLS");
  });

  it("flags local demo mode before remote persistence is configured", () => {
    const readiness = evaluateSupabaseRlsReadiness({
      hasAdminPasscode: false,
      hasSupabaseEnv: false,
      usesAnonClient: true
    });

    expect(readiness.readyCount).toBe(0);
    expect(readiness.items.find((item) => item.label === "Admin access boundary")?.status).toBe("review");
    expect(readiness.items.find((item) => item.label === "Remote env boundary")?.detail).toContain("localStorage");
  });
});
