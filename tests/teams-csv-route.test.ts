import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/teams.csv/route";

describe("teams csv route", () => {
  it("retires the legacy public csv endpoint in favor of admin export flow", async () => {
    const response = GET();
    const text = await response.text();

    expect(response.status).toBe(410);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("x-hackmatch-route-status")).toBe("retired");
    expect(response.headers.get("x-hackmatch-route-replacement")).toBe("/admin/teams");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(text).toContain("retired this legacy CSV route");
    expect(text).toContain("/admin/teams");
  });
});
