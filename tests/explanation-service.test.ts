import { describe, expect, it } from "vitest";
import { explainGeneratedTeams } from "@/lib/ai/explanation-service";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";

describe("AI explanation service", () => {
  it("uses deterministic fallback explanations without an API key", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const result = await explainGeneratedTeams(demoParticipants, demoMatchingSettings);

    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }

    expect(result.provider).toBe("fallback");
    expect(result.explanations.length).toBeGreaterThan(0);
    expect(result.warnings).toContain(
      "OPENAI_API_KEY is not configured; using deterministic fallback explanations."
    );
  });
});
