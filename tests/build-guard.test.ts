import { describe, expect, it, vi } from "vitest";

type BuildGuardFetch = (
  input: string
) => Promise<{
  status: number;
  text(): Promise<string>;
  headers?: {
    get(name: string): string | null;
  };
}>;

describe("build guard", () => {
  it("uses localhost defaults when no override is set", async () => {
    const { defaultBuildGuardTargets, getBuildGuardTargets, parseBuildGuardTargets } = await loadBuildGuard();
    expect(parseBuildGuardTargets("")).toEqual(defaultBuildGuardTargets);
    expect(getBuildGuardTargets({})).toEqual(defaultBuildGuardTargets);
  });

  it("parses and deduplicates explicit guard targets", async () => {
    const { parseBuildGuardTargets } = await loadBuildGuard();
    expect(
      parseBuildGuardTargets("http://localhost:3001, http://localhost:3001 http://localhost:3100/")
    ).toEqual(["http://localhost:3001", "http://localhost:3100"]);
  });

  it("detects HackMatch HTML responses and blocks the build", async () => {
    const { evaluateBuildGuard } = await loadBuildGuard();
    const fetchImpl: BuildGuardFetch = vi.fn(async (url: string) => ({
      status: url.includes("3001") ? 200 : 404,
      async text() {
        return url.includes("3001")
          ? "<html><body><h1>HackMatch AI</h1><div>Admin login</div></body></html>"
          : "<html><body>Different app</body></html>";
      }
    }));

    const report = await evaluateBuildGuard({
      fetchImpl,
      targets: ["http://localhost:3000", "http://localhost:3001"],
      timeoutMs: 10
    }) as { blocked: boolean; matches: Array<{ baseUrl: string }> };

    expect(report.blocked).toBe(true);
    expect(report.matches.map((match) => match.baseUrl)).toEqual(["http://localhost:3001"]);
  });

  it("ignores unrelated HTML and unreachable ports", async () => {
    const { evaluateBuildGuard } = await loadBuildGuard();
    const fetchImpl: BuildGuardFetch = vi.fn(async (url: string) => {
      if (url.includes("3000")) {
        throw new Error("connect ECONNREFUSED");
      }

      return {
        status: 200,
        async text() {
          return "<html><body><h1>Unrelated app</h1></body></html>";
        }
      };
    });

    const report = await evaluateBuildGuard({
      fetchImpl,
      targets: ["http://localhost:3000", "http://localhost:3200"],
      timeoutMs: 10
    }) as { blocked: boolean; matches: unknown[] };

    expect(report.blocked).toBe(false);
    expect(report.matches).toEqual([]);
  });

  it("formats a clear operator-facing block message", async () => {
    const { formatBuildGuardMessage } = await loadBuildGuard();
    const message = formatBuildGuardMessage({
      blocked: true,
      matches: [{ baseUrl: "http://localhost:3001", status: 200 }],
      results: [],
      targets: []
    });

    expect(message).toContain("HackMatch build guard blocked this local build.");
    expect(message).toContain("http://localhost:3001");
    expect(message).toContain("HACKMATCH_SKIP_BUILD_GUARD=1 npm run build");
  });

  it("recognizes HackMatch HTML markers conservatively", async () => {
    const { hasHackMatchSecurityHeaders, isHackMatchLocalHtml, isHackMatchLocalResponse } = await loadBuildGuard();
    const headers = {
      get(name: string) {
        const normalized = name.toLowerCase();
        if (normalized === "x-frame-options") return "DENY";
        if (normalized === "referrer-policy") return "strict-origin-when-cross-origin";
        if (normalized === "permissions-policy") {
          return "camera=(), microphone=(), geolocation=(), payment=()";
        }
        return null;
      }
    };

    expect(isHackMatchLocalHtml("<h1>HackMatch AI</h1><p>Admin login</p>")).toBe(true);
    expect(isHackMatchLocalHtml("<h1>Different app</h1><p>Admin login</p>")).toBe(false);
    expect(hasHackMatchSecurityHeaders(headers)).toBe(true);
    expect(isHackMatchLocalResponse("<h1>Different app</h1>", headers)).toBe(true);
  });
});

async function loadBuildGuard() {
  // @ts-ignore Runtime .mjs helper is exercised by Vitest; this import is intentionally dynamic.
  return await import("../scripts/build-guard.mjs");
}
