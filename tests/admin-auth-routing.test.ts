import { describe, expect, it } from "vitest";
import {
  buildAdminLoginDestination,
  isAdminLoginPath,
  resolveAuthenticatedAdminDestination,
  sanitizeAdminNextPath
} from "@/lib/admin-auth-routing";

describe("admin auth routing", () => {
  it("sanitizes unsafe next paths", () => {
    expect(sanitizeAdminNextPath(null)).toBe("/admin");
    expect(sanitizeAdminNextPath("/")).toBe("/admin");
    expect(sanitizeAdminNextPath("/participant/team")).toBe("/admin");
    expect(sanitizeAdminNextPath("/admin/login")).toBe("/admin");
    expect(sanitizeAdminNextPath("/admin/teams")).toBe("/admin/teams");
  });

  it("builds login destinations from the requested admin url", () => {
    const nextUrl = {
      pathname: "/admin/teams",
      search: "?filter=attention"
    };

    expect(buildAdminLoginDestination(nextUrl as never)).toBe("/admin/teams?filter=attention");
  });

  it("resolves authenticated login redirects safely", () => {
    expect(resolveAuthenticatedAdminDestination("/admin/participants")).toBe("/admin/participants");
    expect(resolveAuthenticatedAdminDestination("/admin/login?next=/admin")).toBe("/admin");
  });

  it("recognizes login routes precisely", () => {
    expect(isAdminLoginPath("/admin/login")).toBe(true);
    expect(isAdminLoginPath("/admin/login/reset")).toBe(true);
    expect(isAdminLoginPath("/admin")).toBe(false);
  });
});
