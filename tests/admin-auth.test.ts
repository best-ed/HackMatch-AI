import { describe, expect, it } from "vitest";
import {
  buildAdminAuthGuidance,
  buildAdminAuthSurfaceSummary,
  adminSessionCookieClearOptions,
  adminSessionCookieOptions,
  createAdminSessionToken,
  evaluateAdminPasscodeQuality,
  evaluateAdminSessionSecretQuality,
  isAdminAuthConfigured,
  summarizeAdminSession,
  summarizeAdminAuthSetup,
  verifyAdminPasscode,
  verifyAdminSessionToken
} from "@/lib/admin-auth";

describe("admin auth", () => {
  it("stays disabled until an admin passcode is configured", () => {
    expect(isAdminAuthConfigured({})).toBe(false);
    expect(isAdminAuthConfigured({ ADMIN_PASSCODE: "  " })).toBe(false);
    expect(isAdminAuthConfigured({ ADMIN_PASSCODE: "secret" })).toBe(true);
  });

  it("summarizes setup steps without exposing secret values", () => {
    const summary = summarizeAdminAuthSetup({
      ADMIN_PASSCODE: "LaunchCode2026",
      ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
    });

    expect(summary.enabled).toBe(true);
    expect(summary.sessionSecretConfigured).toBe(true);
    expect(summary.readyCount).toBe(3);
    expect(summary.steps).toHaveLength(3);
    expect(JSON.stringify(summary)).not.toContain("launch-code");
    expect(JSON.stringify(summary)).not.toContain("session-secret");
  });

  it("keeps setup in review when session secret is missing", () => {
    const summary = summarizeAdminAuthSetup({
      ADMIN_PASSCODE: "LaunchCode2026"
    });

    expect(summary.enabled).toBe(true);
    expect(summary.sessionSecretConfigured).toBe(false);
    expect(summary.readyCount).toBe(1);
    expect(summary.steps.map((step) => step.status)).toEqual(["ready", "review", "review"]);
  });

  it("builds actionable guidance for disabled and partially configured admin auth", () => {
    expect(
      buildAdminAuthGuidance({
        enabled: false,
        sessionSecretConfigured: false,
        readyCount: 0,
        totalCount: 3
      })
    ).toMatchObject({
      mode: "disabled",
      badgeLabel: "Auth disabled"
    });

    expect(
      buildAdminAuthGuidance({
        enabled: true,
        sessionSecretConfigured: false,
        readyCount: 1,
        totalCount: 3
      })
    ).toMatchObject({
      mode: "review",
      badgeLabel: "Setup review"
    });
  });

  it("builds ready guidance once admin auth setup is complete", () => {
    expect(
      buildAdminAuthGuidance({
        enabled: true,
        sessionSecretConfigured: true,
        readyCount: 3,
        totalCount: 3
      })
    ).toMatchObject({
      mode: "ready",
      badgeLabel: "Protection ready"
    });
  });

  it("builds compact auth mode summaries for admin surfaces", () => {
    expect(
      buildAdminAuthSurfaceSummary({
        enabled: false,
        readyCount: 0,
        totalCount: 3
      })
    ).toMatchObject({
      mode: "demo",
      modeLabel: "Demo mode"
    });

    expect(
      buildAdminAuthSurfaceSummary({
        enabled: true,
        readyCount: 2,
        totalCount: 3,
        session: {
          authenticated: true,
          detail: "Admin session is active for about 7h 40m.",
          status: "active"
        }
      })
    ).toMatchObject({
      mode: "review",
      modeLabel: "Setup review"
    });

    expect(
      buildAdminAuthSurfaceSummary({
        enabled: true,
        readyCount: 3,
        totalCount: 3,
        session: {
          authenticated: false,
          detail: "The admin session cookie has expired. Sign in again to restore protected access.",
          status: "expired"
        }
      })
    ).toMatchObject({
      mode: "review",
      modeLabel: "Sign-in needed"
    });
  });

  it("verifies the configured passcode without accepting close values", async () => {
    const env = { ADMIN_PASSCODE: "launch-code" };

    await expect(verifyAdminPasscode("launch-code", env)).resolves.toBe(true);
    await expect(verifyAdminPasscode("wrong-code", env)).resolves.toBe(false);
  });

  it("creates and verifies signed session tokens with expiry metadata", async () => {
    const env = {
      ADMIN_PASSCODE: "launch-code",
      ADMIN_SESSION_SECRET: "session-secret"
    };
    const token = await createAdminSessionToken({
      passcode: env.ADMIN_PASSCODE,
      secret: env.ADMIN_SESSION_SECRET,
      issuedAt: new Date("2026-06-17T09:00:00.000Z")
    });

    expect(token).toMatch(/^hm-admin-v2\.\d+\.\d+\.[a-f0-9]{64}$/);
    await expect(
      verifyAdminSessionToken(token, env, new Date("2026-06-17T09:00:01.000Z"))
    ).resolves.toBe(true);
    await expect(verifyAdminSessionToken(`${token}-tampered`, env)).resolves.toBe(false);
  });

  it("rejects expired session tokens on the server", async () => {
    const env = {
      ADMIN_PASSCODE: "launch-code",
      ADMIN_SESSION_SECRET: "session-secret"
    };
    const token = await createAdminSessionToken({
      passcode: env.ADMIN_PASSCODE,
      secret: env.ADMIN_SESSION_SECRET,
      issuedAt: new Date("2026-06-17T09:00:00.000Z"),
      maxAgeSeconds: 10
    });

    await expect(
      verifyAdminSessionToken(token, env, new Date("2026-06-17T09:00:09.000Z"))
    ).resolves.toBe(true);
    await expect(
      verifyAdminSessionToken(token, env, new Date("2026-06-17T09:00:11.000Z"))
    ).resolves.toBe(false);
  });

  it("rejects malformed legacy-looking tokens", async () => {
    const env = {
      ADMIN_PASSCODE: "launch-code",
      ADMIN_SESSION_SECRET: "session-secret"
    };

    await expect(verifyAdminSessionToken("hm-admin-old-style-token", env)).resolves.toBe(false);
    await expect(verifyAdminSessionToken("hm-admin-v2.bad.expires.signature", env)).resolves.toBe(false);
  });

  it("summarizes active sessions with expiry details", async () => {
    const env = {
      ADMIN_PASSCODE: "launch-code",
      ADMIN_SESSION_SECRET: "session-secret"
    };
    const token = await createAdminSessionToken({
      passcode: env.ADMIN_PASSCODE,
      secret: env.ADMIN_SESSION_SECRET,
      issuedAt: new Date("2026-06-17T09:00:00.000Z"),
      maxAgeSeconds: 120
    });

    const summary = await summarizeAdminSession(
      token,
      env,
      new Date("2026-06-17T09:01:00.000Z")
    );

    expect(summary.status).toBe("active");
    expect(summary.authenticated).toBe(true);
    expect(summary.remainingSeconds).toBe(60);
    expect(summary.expiresAt).toBe("2026-06-17T09:02:00.000Z");
  });

  it("summarizes missing or expired sessions for protected environments", async () => {
    const env = {
      ADMIN_PASSCODE: "launch-code",
      ADMIN_SESSION_SECRET: "session-secret"
    };
    const token = await createAdminSessionToken({
      passcode: env.ADMIN_PASSCODE,
      secret: env.ADMIN_SESSION_SECRET,
      issuedAt: new Date("2026-06-17T09:00:00.000Z"),
      maxAgeSeconds: 10
    });

    await expect(summarizeAdminSession(undefined, env)).resolves.toMatchObject({
      authenticated: false,
      status: "missing"
    });
    await expect(
      summarizeAdminSession(token, env, new Date("2026-06-17T09:00:11.000Z"))
    ).resolves.toMatchObject({
      authenticated: false,
      status: "expired"
    });
  });

  it("flags weak passcodes and stronger passcodes separately", () => {
    expect(
      evaluateAdminPasscodeQuality({ ADMIN_PASSCODE: "short" })
    ).toMatchObject({ status: "review", label: "weak" });
    expect(
      evaluateAdminPasscodeQuality({ ADMIN_PASSCODE: "LaunchCode2026" })
    ).toMatchObject({ status: "ready", label: "strong" });
  });

  it("flags missing, reused, and stronger session secrets separately", () => {
    expect(
      evaluateAdminSessionSecretQuality({ ADMIN_PASSCODE: "LaunchCode2026" })
    ).toMatchObject({ status: "review", label: "missing" });
    expect(
      evaluateAdminSessionSecretQuality({
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026"
      })
    ).toMatchObject({ status: "review", label: "reused" });
    expect(
      evaluateAdminSessionSecretQuality({
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
      })
    ).toMatchObject({ status: "ready", label: "strong" });
  });

  it("uses consistent hardened cookie defaults for admin sessions", () => {
    expect(adminSessionCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
      priority: "high"
    });

    expect(adminSessionCookieClearOptions()).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
      priority: "high"
    });
  });
});
