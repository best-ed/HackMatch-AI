import { describe, expect, it } from "vitest";
import {
  createAdminSessionToken,
  isAdminAuthConfigured,
  verifyAdminPasscode,
  verifyAdminSessionToken
} from "@/lib/admin-auth";

describe("admin auth", () => {
  it("stays disabled until an admin passcode is configured", () => {
    expect(isAdminAuthConfigured({})).toBe(false);
    expect(isAdminAuthConfigured({ ADMIN_PASSCODE: "  " })).toBe(false);
    expect(isAdminAuthConfigured({ ADMIN_PASSCODE: "secret" })).toBe(true);
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
