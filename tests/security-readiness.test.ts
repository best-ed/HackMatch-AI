import { describe, expect, it } from "vitest";
import { evaluateSecurityReadiness } from "@/lib/security-readiness";

describe("security readiness", () => {
  it("marks a fully configured launch environment ready", () => {
    const readiness = evaluateSecurityReadiness({
      hasAdminPasscode: true,
      hasAdminSessionSecret: true,
      adminPasscode: "LaunchCode2026",
      adminSessionSecret: "LaunchCode2026-Session-Secret-Strong",
      hasSupabaseUrl: true,
      hasSupabaseAnonKey: true,
      hasOpenAiKey: true,
      hasSmokeScript: true
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.readyCount).toBe(readiness.totalCount);
  });

  it("keeps local demo gaps visible for review", () => {
    const readiness = evaluateSecurityReadiness({
      hasAdminPasscode: false,
      hasAdminSessionSecret: false,
      hasSupabaseUrl: false,
      hasSupabaseAnonKey: false,
      hasOpenAiKey: false,
      hasSmokeScript: true
    });

    expect(readiness.status).toBe("review");
    expect(readiness.checks.find((check) => check.label === "Admin passcode")?.status).toBe("review");
    expect(readiness.checks.find((check) => check.label === "Smoke test command")?.status).toBe("ready");
  });

  it("keeps weak auth secrets in review even when they are present", () => {
    const readiness = evaluateSecurityReadiness({
      hasAdminPasscode: true,
      hasAdminSessionSecret: true,
      adminPasscode: "short",
      adminSessionSecret: "short",
      hasSupabaseUrl: true,
      hasSupabaseAnonKey: true,
      hasOpenAiKey: false,
      hasSmokeScript: true
    });

    expect(readiness.checks.find((check) => check.label === "Admin passcode")?.status).toBe("review");
    expect(readiness.checks.find((check) => check.label === "Session secret")?.status).toBe("review");
  });
});
