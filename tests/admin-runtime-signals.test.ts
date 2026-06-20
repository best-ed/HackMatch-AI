import { describe, expect, it } from "vitest";
import { readAdminRuntimeSignals } from "@/lib/admin-runtime-signals";

describe("admin runtime signals", () => {
  it("reports launch-ready admin protection and OpenAI mode from server env", () => {
    const signals = readAdminRuntimeSignals({
      ADMIN_PASSCODE: "LaunchCode2026",
      ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong",
      OPENAI_API_KEY: "sk-test-key"
    });

    expect(signals).toEqual({
      hasAdminPasscode: true,
      adminProtectionConfigured: true,
      hasOpenAiKey: true
    });
  });

  it("keeps incomplete auth setup out of the ready state", () => {
    const signals = readAdminRuntimeSignals({
      ADMIN_PASSCODE: "LaunchCode2026"
    });

    expect(signals.hasAdminPasscode).toBe(true);
    expect(signals.adminProtectionConfigured).toBe(false);
    expect(signals.hasOpenAiKey).toBe(false);
  });
});
