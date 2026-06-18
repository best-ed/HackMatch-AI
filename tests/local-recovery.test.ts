import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

describe("local recovery command", () => {
  it("blocks recovery while a live HackMatch server is detected", async () => {
    const { formatLocalRecoveryMessage, recoverLocalBuildState } = await loadRecovery();
    const renamePath = vi.fn();

    const result = await recoverLocalBuildState({
      workspaceRoot: "C:\\HackMatch",
      evaluateGuard: async () => ({
        blocked: true,
        matches: [{ baseUrl: "http://localhost:3001", status: 200 }],
        results: [],
        targets: ["http://localhost:3001"]
      }),
      pathExists: async () => true,
      renamePath
    }) as { ok: boolean; status: string; guardReport: { matches: Array<{ baseUrl: string }> } };

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.guardReport.matches[0]?.baseUrl).toBe("http://localhost:3001");
    expect(renamePath).not.toHaveBeenCalled();
    expect(formatLocalRecoveryMessage(result)).toContain("HACKMATCH_RECOVERY_FORCE=1 npm run recover:local");
  });

  it("reports a noop when local build output is already clean", async () => {
    const { formatLocalRecoveryMessage, recoverLocalBuildState } = await loadRecovery();

    const result = await recoverLocalBuildState({
      workspaceRoot: "C:\\HackMatch",
      evaluateGuard: async () => ({ blocked: false, matches: [], results: [], targets: [] }),
      pathExists: async () => false
    }) as { ok: boolean; status: string };

    expect(result.ok).toBe(true);
    expect(result.status).toBe("noop");
    expect(formatLocalRecoveryMessage(result)).toContain("Nothing needed recovery");
  });

  it("moves stale .next output into a timestamped recovery directory", async () => {
    const { recoverLocalBuildState } = await loadRecovery();
    const files = new Set([join("C:\\HackMatch", ".next")]);

    const result = await recoverLocalBuildState({
      workspaceRoot: "C:\\HackMatch",
      now: new Date("2026-06-18T20:15:30.000Z"),
      evaluateGuard: async () => ({ blocked: false, matches: [], results: [], targets: [] }),
      pathExists: async (filePath: string) => files.has(filePath),
      renamePath: async (fromPath: string, toPath: string) => {
        files.delete(fromPath);
        files.add(toPath);
      }
    }) as { ok: boolean; status: string; targetDirName: string; targetPath: string };

    expect(result.ok).toBe(true);
    expect(result.status).toBe("moved");
    expect(result.targetDirName).toBe(".next-stale-2026-06-18-20-15-30-000");
    expect(files.has(result.targetPath)).toBe(true);
  });

  it("chooses the next recovery directory name when a timestamp collision exists", async () => {
    const { findAvailableRecoveryDirectoryName } = await loadRecovery();
    const files = new Set([
      join("C:\\HackMatch", ".next-stale-2026-06-18-20-15-30-000")
    ]);

    const targetDirName = await findAvailableRecoveryDirectoryName({
      workspaceRoot: "C:\\HackMatch",
      now: new Date("2026-06-18T20:15:30.000Z"),
      pathExists: async (filePath: string) => files.has(filePath)
    });

    expect(targetDirName).toBe(".next-stale-2026-06-18-20-15-30-000-2");
  });
});

async function loadRecovery() {
  // @ts-ignore importing runtime helper for focused script tests
  return await import("../scripts/local-recovery.mjs");
}
