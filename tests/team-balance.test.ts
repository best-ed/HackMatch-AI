import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import { summarizeTeamBalance } from "@/lib/team-balance";

describe("team balance summary", () => {
  it("summarizes roles, skills, experience, and availability signals", () => {
    const members = demoParticipants.slice(0, 4);
    const summary = summarizeTeamBalance(members);

    expect(summary.roleCount).toBeGreaterThan(0);
    expect(summary.skillCount).toBeGreaterThan(0);
    expect(summary.availabilitySlotCount).toBeGreaterThan(0);
    expect(summary.signals.map((signal) => signal.label)).toEqual([
      "Roles",
      "Skills",
      "Experience",
      "Availability"
    ]);
    expect(summary.signals.every((signal) => signal.value >= 0 && signal.value <= 100)).toBe(true);
  });
});
