import { describe, expect, it } from "vitest";
import { buildAdminAccessDiagnostics } from "@/lib/admin-access-diagnostics";

describe("admin access diagnostics", () => {
  it("reports a healthy protected environment when setup, session, and runtime agree", () => {
    const diagnostics = buildAdminAccessDiagnostics({
      setupSummary: {
        enabled: true,
        sessionSecretConfigured: true,
        readyCount: 3,
        totalCount: 3,
        steps: []
      },
      session: {
        authenticated: true,
        detail: "Admin session is active for about 7h 58m.",
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

    expect(diagnostics.status).toBe("ready");
    expect(diagnostics.title).toContain("healthy");
    expect(diagnostics.items.every((item) => item.status === "ready")).toBe(true);
  });

  it("guides login-page review mode when runtime signals are not reachable yet", () => {
    const diagnostics = buildAdminAccessDiagnostics({
      setupSummary: {
        enabled: true,
        sessionSecretConfigured: false,
        readyCount: 1,
        totalCount: 3,
        steps: []
      },
      session: {
        authenticated: false,
        detail: "No admin session cookie is present. Sign in to access protected organizer routes.",
        status: "missing"
      },
      runtimeReachable: false
    });

    expect(diagnostics.status).toBe("review");
    expect(diagnostics.items.find((item) => item.label === "Server runtime")?.detail).toContain("after admin sign-in");
    expect(diagnostics.items.find((item) => item.label === "Access mode")?.detail).toContain("Sign-in needed");
  });

  it("keeps demo mode informative when protection is intentionally disabled", () => {
    const diagnostics = buildAdminAccessDiagnostics({
      setupSummary: {
        enabled: false,
        sessionSecretConfigured: false,
        readyCount: 0,
        totalCount: 3,
        steps: []
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
        hasOpenAiKey: true
      }
    });

    expect(diagnostics.items.find((item) => item.label === "Access mode")?.detail).toContain("Demo mode");
    expect(diagnostics.items.find((item) => item.label === "Server runtime")?.detail).toContain("OpenAI key");
  });
});
