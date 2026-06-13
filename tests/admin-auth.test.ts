import { describe, expect, it } from "vitest";
import {
  createAdminSessionToken,
  isAdminAuthConfigured,
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
      ADMIN_PASSCODE: "launch-code",
      ADMIN_SESSION_SECRET: "session-secret"
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
      ADMIN_PASSCODE: "launch-code"
    });

    expect(summary.enabled).toBe(true);
    expect(summary.sessionSecretConfigured).toBe(false);
    expect(summary.readyCount).toBe(1);
    expect(summary.steps.map((step) => step.status)).toEqual(["ready", "review", "review"]);
  });

  it("verifies the configured passcode without accepting close values", async () => {
    const env = { ADMIN_PASSCODE: "launch-code" };

    await expect(verifyAdminPasscode("launch-code", env)).resolves.toBe(true);
    await expect(verifyAdminPasscode("wrong-code", env)).resolves.toBe(false);
  });

  it("creates and verifies deterministic session tokens", async () => {
    const env = {
      ADMIN_PASSCODE: "launch-code",
      ADMIN_SESSION_SECRET: "session-secret"
    };
    const token = await createAdminSessionToken({
      passcode: env.ADMIN_PASSCODE,
      secret: env.ADMIN_SESSION_SECRET
    });

    expect(token).toMatch(/^hm-admin-/);
    await expect(verifyAdminSessionToken(token, env)).resolves.toBe(true);
    await expect(verifyAdminSessionToken(`${token}-tampered`, env)).resolves.toBe(false);
  });
});
