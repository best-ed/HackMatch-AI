import { describe, expect, it } from "vitest";
import { buildAdminSessionWarning } from "@/lib/admin-session-warning";

describe("admin session warning", () => {
  it("stays quiet when the session has plenty of time left", () => {
    const warning = buildAdminSessionWarning({
      status: "active",
      remainingSeconds: 60 * 30
    });

    expect(warning).toBeUndefined();
  });

  it("warns when the session is within the reminder window", () => {
    const warning = buildAdminSessionWarning({
      status: "active",
      remainingSeconds: 60 * 10
    });

    expect(warning?.label).toBe("Session ending soon");
    expect(warning?.detail).toContain("10m");
  });

  it("escalates when only a few minutes remain", () => {
    const warning = buildAdminSessionWarning({
      status: "active",
      remainingSeconds: 60 * 4
    });

    expect(warning?.label).toBe("Session ending very soon");
    expect(warning?.detail).toContain("4m");
  });
});
