import type { Participant } from "@/lib/matching/types";

export type TeamHandoffCoverage = {
  status: "ready" | "review";
  visibleCount: number;
  hiddenCount: number;
  summary: string;
};

export function summarizeTeamHandoffCoverage(members: Participant[]): TeamHandoffCoverage {
  const visibleCount = members.filter((member) => member.consentToShareContact).length;
  const hiddenCount = members.length - visibleCount;

  return {
    status: hiddenCount === 0 ? "ready" : "review",
    visibleCount,
    hiddenCount,
    summary:
      hiddenCount === 0
        ? "All assigned members can share contact details with teammates."
        : `${hiddenCount} assigned member${hiddenCount === 1 ? "" : "s"} still hide contact details, so the organizer may need to coordinate introductions.`
  };
}
