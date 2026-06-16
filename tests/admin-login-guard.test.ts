import { describe, expect, it } from "vitest";
import {
  adminLoginAttemptKey,
  adminLoginCooldownWindowSeconds,
  adminLoginMaxAllowedFailures,
  clearAdminLoginGuard,
  describeAdminLoginGuard,
  recordFailedAdminLogin,
  resetAdminLoginGuardStore
} from "@/lib/admin-login-guard";

describe("admin login guard", () => {
  it("tracks remaining attempts before cooldown", () => {
    resetAdminLoginGuardStore();
    const key = "local::browser";

    const first = recordFailedAdminLogin(key, new Date("2026-06-17T10:00:00.000Z"));
    const second = recordFailedAdminLogin(key, new Date("2026-06-17T10:00:01.000Z"));

    expect(first.blocked).toBe(false);
    expect(first.remainingAttempts).toBe(adminLoginMaxAllowedFailures() - 1);
    expect(second.remainingAttempts).toBe(adminLoginMaxAllowedFailures() - 2);
  });

  it("blocks after the configured number of failures and clears after cooldown", () => {
    resetAdminLoginGuardStore();
    const key = "local::browser";
    const start = new Date("2026-06-17T10:00:00.000Z");
    const lastFailureAt = new Date(
      start.getTime() + (adminLoginMaxAllowedFailures() - 1) * 1000
    );

    for (let attempt = 0; attempt < adminLoginMaxAllowedFailures(); attempt += 1) {
      recordFailedAdminLogin(key, new Date(start.getTime() + attempt * 1000));
    }

    const blocked = describeAdminLoginGuard(key, new Date("2026-06-17T10:00:05.000Z"));
    expect(blocked.blocked).toBe(true);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    const afterCooldown = describeAdminLoginGuard(
      key,
      new Date(lastFailureAt.getTime() + (adminLoginCooldownWindowSeconds() + 1) * 1000)
    );
    expect(afterCooldown.blocked).toBe(false);
    expect(afterCooldown.remainingAttempts).toBe(adminLoginMaxAllowedFailures());
  });

  it("uses client ip and user agent to scope attempt keys", () => {
    expect(
      adminLoginAttemptKey({
        forwardedFor: "203.0.113.14, 10.0.0.1",
        realIp: "10.0.0.1",
        userAgent: "HackMatch Browser"
      })
    ).toBe("203.0.113.14::HackMatch Browser");
  });

  it("can clear the guard state after a successful login", () => {
    resetAdminLoginGuardStore();
    const key = "local::browser";

    recordFailedAdminLogin(key, new Date("2026-06-17T10:00:00.000Z"));
    clearAdminLoginGuard(key);

    expect(describeAdminLoginGuard(key, new Date("2026-06-17T10:00:01.000Z")).remainingAttempts)
      .toBe(adminLoginMaxAllowedFailures());
  });
});
