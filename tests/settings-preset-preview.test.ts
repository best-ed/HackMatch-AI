import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { buildSettingsPresetPreviews } from "@/lib/settings-preset-preview";
import { matchingPresets } from "@/lib/settings-guardrails";

describe("settings preset previews", () => {
  it("explains every preset with objective, tradeoff, change count, and health", () => {
    const previews = buildSettingsPresetPreviews({
      currentSettings: demoMatchingSettings,
      participants: demoParticipants,
      presets: matchingPresets
    });

    expect(previews.map((preview) => preview.id)).toEqual(matchingPresets.map((preset) => preset.id));
    expect(previews.every((preview) => preview.objective.length > 0)).toBe(true);
    expect(previews.every((preview) => preview.tradeoff.length > 0)).toBe(true);
    expect(previews.every((preview) => preview.health.status)).toBe(true);
    expect(previews.find((preview) => preview.id === "balanced")?.changeCount).toBe(0);
    expect(previews.find((preview) => preview.id === "skill-heavy")?.changeCount).toBeGreaterThan(0);
  });

  it("marks presets against the active cohort health", () => {
    const previews = buildSettingsPresetPreviews({
      currentSettings: demoMatchingSettings,
      participants: [],
      presets: matchingPresets
    });

    expect(previews.every((preview) => preview.health.status === "warning")).toBe(true);
    expect(previews[0].health.warnings).toContain("No matchable participants are available in the active cohort.");
  });
});
