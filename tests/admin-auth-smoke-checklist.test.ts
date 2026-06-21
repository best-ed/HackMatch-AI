import { describe, expect, it } from "vitest";
import { buildAdminAuthSmokeChecklist } from "@/lib/admin-auth-smoke-checklist";

describe("admin auth smoke checklist", () => {
  it("turns fully ready when auth, session, and runtime all align", () => {
    const checklist = buildAdminAuthSmokeChecklist({
      nextPath: "/admin/teams",
      setupSummary: {
        enabled: true,
        sessionSecretConfigured: true,
        readyCount: 3,
        totalCount: 3
      },
      session: {
        authenticated: true,
        detail: "Admin session is active for about 7h 59m.",
        status: "active"
      },
      runtimeSignals: {
        hasAdminPasscode: true,
        hasAdminSessionSecret: true,
        adminProtectionConfigured: true,
        authMode: "ready",
        authReadyCount: 3,
        authTotalCount: 3,
        hasOpenAiKey: false
      }
    });

    expect(checklist.status).toBe("ready");
    expect(checklist.readyCount).toBe(4);
  });

  it("flags cooldown and missing session review states", () => {
    const checklist = buildAdminAuthSmokeChecklist({
      nextPath: "/admin/participants",
      setupSummary: {
        enabled: true,
        sessionSecretConfigured: false,
        readyCount: 1,
        totalCount: 3
      },
      session: {
        authenticated: false,
        detail: "No admin session cookie is present. Sign in to access protected organizer routes.",
        status: "missing"
      },
      loginGuardRetryAfterSeconds: 90,
      runtimeReachable: false
    });

    expect(checklist.status).toBe("review");
    expect(checklist.items.find((item) => item.label === "Session and cooldown")?.detail).toContain("1m 30s");
    expect(checklist.items.find((item) => item.label === "Protected APIs")?.detail).toContain("after sign-in");
  });

  it("keeps demo mode actionable when protection is disabled", () => {
    const checklist = buildAdminAuthSmokeChecklist({
      setupSummary: {
        enabled: false,
        sessionSecretConfigured: false,
        readyCount: 0,
        totalCount: 3
      },
      session: {
        authenticated: true,
        detail: "Admin auth is disabled in this environment, so no session cookie is required.",
        status: "not-required"
      },
      runtimeSignals: {
        hasAdminPasscode: false,
        hasAdminSessionSecret: false,
        adminProtectionConfigured: false,
        authMode: "disabled",
        authReadyCount: 0,
        authTotalCount: 3,
        hasOpenAiKey: false
      }
    });

    expect(checklist.items.find((item) => item.label === "Login route")?.detail).toContain("demo mode");
    expect(checklist.items.find((item) => item.label === "Protected APIs")?.detail).toContain("local demo mode");
  });
});
