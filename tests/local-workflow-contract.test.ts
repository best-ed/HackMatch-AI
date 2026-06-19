import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("local workflow contract", () => {
  it("keeps guarded build and recovery scripts wired in package.json", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8")
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.build).toBe("node scripts/build-safe.mjs");
    expect(packageJson.scripts?.["recover:local"]).toBe("node scripts/recover-local.mjs");
  });

  it("documents the recovery command in operator-facing docs", () => {
    const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    const deployment = readFileSync(resolve(process.cwd(), "DEPLOYMENT.md"), "utf8");

    expect(readme).toContain("npm run recover:local");
    expect(deployment).toContain("npm run recover:local");
  });
});
