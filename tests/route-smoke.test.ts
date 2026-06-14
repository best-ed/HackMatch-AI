import { describe, expect, it } from "vitest";
import { adminNavItems, participantNavItems, primaryNavItems } from "@/lib/navigation";
import { buildSmokeTargets, smokeRoutes, validateSmokeRoutes } from "@/lib/route-smoke";

describe("route smoke contract", () => {
  it("keeps smoke routes valid and unique", () => {
    expect(validateSmokeRoutes()).toEqual([]);
    expect(new Set(smokeRoutes).size).toBe(smokeRoutes.length);
  });

  it("covers primary, participant, and admin navigation routes", () => {
    const expectedRoutes = [
      ...primaryNavItems.map((item) => item.href),
      ...participantNavItems.map((item) => item.href),
      ...adminNavItems.map((item) => item.href)
    ];

    expectedRoutes.forEach((route) => {
      expect(smokeRoutes).toContain(route);
    });
  });

  it("covers contextual routes that are easy to break during polish", () => {
    expect(smokeRoutes).toContain("/participant/confirmation");
    expect(smokeRoutes).toContain("/admin/login");
  });

  it("builds normalized smoke targets from a base URL", () => {
    expect(buildSmokeTargets("http://localhost:3001/")).toContain("http://localhost:3001/admin/teams");
    expect(buildSmokeTargets("http://localhost:3001/")).toContain("http://localhost:3001/participant/confirmation");
  });
});
