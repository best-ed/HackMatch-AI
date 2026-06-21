import { describe, expect, it } from "vitest";
import { buildAdminSecurityPosture } from "@/lib/admin-security-posture";

describe("admin security posture", () => {
  it("summarizes a protected workspace with an active session", () => {
    const posture = buildAdminSecurityPosture({
      enabled: true,
      readyCount: 3,
      totalCount: 3,
      session: {
        authenticated: true,
        detail: "Admin session is active for about 7h 45m.",
        remainingSeconds: 27900,
        status: "active"
      },
      loginGuard: {
        blocked: false,
        remainingAttempts: 5,
        retryAfterSeconds: 0
      }
    });

    expect(posture.tone).toBe("protected");
    expect(posture.title).toBe("Protected organizer workspace");
    expect(posture.chips.map((chip) => chip.label)).toContain("Session active");
    expect(posture.notice).toBeUndefined();
  });

  it("surfaces login cooldown state as a blocked notice", () => {
    const posture = buildAdminSecurityPosture({
      enabled: true,
      readyCount: 3,
      totalCount: 3,
      session: {
        authenticated: false,
        detail: "No admin session cookie is present. Sign in to access protected organizer routes.",
        status: "missing"
      },
      loginGuard: {
        blocked: true,
        remainingAttempts: 0,
        retryAfterSeconds: 48
      }
    });

    expect(posture.tone).toBe("review");
    expect(posture.notice).toMatchObject({
      label: "Login cooldown active",
      tone: "blocked"
    });
    expect(posture.chips.map((chip) => chip.label)).toContain("Login retry in 48s");
  });

  it("keeps demo-mode access visible when auth is disabled", () => {
    const posture = buildAdminSecurityPosture({
      enabled: false,
      readyCount: 0,
      totalCount: 3,
      session: {
        authenticated: true,
        detail: "Admin auth is disabled in this environment, so no session cookie is required.",
        status: "not-required"
      }
    });

    expect(posture.tone).toBe("demo");
    expect(posture.title).toBe("Demo organizer access is open");
    expect(posture.notice?.label).toBe("Protection is still optional here");
  });
});
