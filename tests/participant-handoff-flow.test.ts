import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { buildParticipantConfirmationSummary } from "@/lib/participant-confirmation-summary";
import { buildParticipantHandoffReadiness } from "@/lib/participant-handoff-readiness";
import type { TeamAssignment } from "@/lib/matching/types";
import { buildParticipantStatusChecklist } from "@/lib/participant-status";
import { buildParticipantTeamBrief } from "@/lib/participant-team-view";
import { summarizeTeamHandoffCoverage } from "@/lib/team-handoff-coverage";

const team: TeamAssignment = {
  id: "team-1",
  name: "Team 1",
  participantIds: ["p01", "p02"]
};

describe("participant handoff flow", () => {
  it("summarizes confirmation state for a participant with a visible team", () => {
    const summary = buildParticipantConfirmationSummary({
      participant: demoParticipants[0],
      assignedTeam: team,
      isUnassigned: false
    });

    expect(summary.status).toBe("ready");
    expect(summary.title).toContain("Team 1");
    expect(summary.signals.find((signal) => signal.label === "Matching consent")?.value).toBe("On");
  });

  it("marks handoff blocked when no team is visible yet", () => {
    const participant = {
      ...demoParticipants[0],
      consentToMatch: true
    };
    const brief = buildParticipantTeamBrief([participant], undefined, participant.id);
    const checklist = buildParticipantStatusChecklist({ participant });
    const readiness = buildParticipantHandoffReadiness({
      brief,
      participant,
      statusChecklist: checklist
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.checks.find((check) => check.label === "Assignment")?.status).toBe("blocked");
  });

  it("summarizes review-state contact coverage per team", () => {
    const coverage = summarizeTeamHandoffCoverage([
      {
        ...demoParticipants[0],
        consentToShareContact: true
      },
      {
        ...demoParticipants[1],
        consentToShareContact: false
      }
    ]);

    expect(coverage.status).toBe("review");
    expect(coverage.visibleCount).toBe(1);
    expect(coverage.hiddenCount).toBe(1);
  });
});
