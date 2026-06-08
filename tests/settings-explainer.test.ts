import { describe, expect, it } from "vitest";
import { explainMatchingSettings } from "@/lib/settings-explainer";
import { demoMatchingSettings } from "@/lib/demo-data";

describe("settings explainer", () => {
  it("explains team sizing, constraints, and weights using current values", () => {
    const explanations = explainMatchingSettings({
      ...demoMatchingSettings,
      desiredTeamSize: 5,
      allowUnassignedParticipants: false,
      weights: {
        ...demoMatchingSettings.weights,
        roleCoverage: 2.5
      }
    });

    expect(explanations.some((item) => item.category === "team-size")).toBe(true);
    expect(explanations.some((item) => item.category === "constraint")).toBe(true);
    expect(explanations.some((item) => item.category === "weight")).toBe(true);
    expect(explanations.find((item) => item.key === "desiredTeamSize")?.currentValue).toBe("5");
    expect(explanations.find((item) => item.key === "allowUnassignedParticipants")?.currentValue).toBe("No");
    expect(explanations.find((item) => item.key === "roleCoverage")?.currentValue).toBe("2.5");
  });
});
