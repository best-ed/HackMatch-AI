import type { Participant, ScoreBreakdown } from "@/lib/matching/types";

export type TeamBalanceSignal = {
  label: string;
  value: number;
  detail: string;
  status: "strong" | "review" | "risk";
};

export type TeamBalanceSummary = {
  roleCount: number;
  skillCount: number;
  advancedCount: number;
  beginnerCount: number;
  availabilitySlotCount: number;
  signals: TeamBalanceSignal[];
};

export function summarizeTeamBalance(
  members: Participant[],
  score?: ScoreBreakdown
): TeamBalanceSummary {
  const roleCount = new Set(members.map((member) => member.primaryRole.trim()).filter(Boolean)).size;
  const skillCount = new Set(members.flatMap((member) => member.technicalSkills.map((skill) => skill.trim()).filter(Boolean))).size;
  const advancedCount = members.filter((member) => member.experienceLevel === "advanced").length;
  const beginnerCount = members.filter((member) => member.experienceLevel === "beginner").length;
  const availabilitySlotCount = new Set(members.flatMap((member) => member.availability)).size;
  const experienceValue = members.length
    ? Math.round(((advancedCount * 2 + (members.length - advancedCount - beginnerCount)) / (members.length * 2)) * 100)
    : 0;

  return {
    roleCount,
    skillCount,
    advancedCount,
    beginnerCount,
    availabilitySlotCount,
    signals: [
      {
        label: "Roles",
        value: score?.roleCoverageScore ?? Math.min(100, roleCount * 25),
        detail: `${roleCount} distinct role${roleCount === 1 ? "" : "s"}`,
        status: signalStatus(score?.roleCoverageScore ?? roleCount * 25)
      },
      {
        label: "Skills",
        value: score?.skillCoverageScore ?? Math.min(100, skillCount * 12),
        detail: `${skillCount} technical skill${skillCount === 1 ? "" : "s"}`,
        status: signalStatus(score?.skillCoverageScore ?? skillCount * 12)
      },
      {
        label: "Experience",
        value: score?.experienceBalanceScore ?? experienceValue,
        detail: `${advancedCount} advanced, ${beginnerCount} beginner`,
        status: signalStatus(score?.experienceBalanceScore ?? experienceValue)
      },
      {
        label: "Availability",
        value: score?.availabilityCompatibilityScore ?? Math.min(100, availabilitySlotCount * 16),
        detail: `${availabilitySlotCount} listed window${availabilitySlotCount === 1 ? "" : "s"}`,
        status: signalStatus(score?.availabilityCompatibilityScore ?? availabilitySlotCount * 16)
      }
    ]
  };
}

function signalStatus(value: number): TeamBalanceSignal["status"] {
  if (value >= 80) return "strong";
  if (value >= 65) return "review";
  return "risk";
}
