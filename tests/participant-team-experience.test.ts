import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import { evaluateParticipantIntake } from "@/lib/participant-intake";
import { buildParticipantTeamBrief, formatAvailability } from "@/lib/participant-team-view";
import type { Participant } from "@/lib/matching/types";

describe("participant team experience", () => {
  it("evaluates participant intake quality", () => {
    const intake = evaluateParticipantIntake(demoParticipants);

    expect(intake.totalCount).toBe(demoParticipants.length);
    expect(intake.matchableCount).toBe(demoParticipants.filter((participant) => participant.consentToMatch).length);
    expect(intake.excludedCount).toBe(1);
    expect(intake.roleCoverage.length).toBeGreaterThan(0);
    expect(intake.issues.length).toBeGreaterThan(0);
  });

  it("flags incomplete participant intake records", () => {
    const intake = evaluateParticipantIntake([
      {
        ...demoParticipants[0],
        id: "broken-intake",
        fullName: "",
        email: "",
        primaryRole: "",
        availability: [],
        consentToMatch: false
      }
    ]);

    expect(intake.incompleteCount).toBe(1);
    expect(intake.issues.some((issue) => issue.severity === "blocker")).toBe(true);
  });

  it("builds participant-facing team briefs", () => {
    const members: Participant[] = [
      {
        ...demoParticipants[0],
        interests: ["Health", "Education"],
        availability: ["weekend_morning", "weekday_evening"],
        consentToShareContact: true
      },
      {
        ...demoParticipants[1],
        interests: ["Health", "Climate"],
        availability: ["weekend_morning"],
        consentToShareContact: false
      }
    ];
    const brief = buildParticipantTeamBrief(members, undefined, members[0].id);

    expect(brief.sharedInterests).toEqual(["Health"]);
    expect(brief.sharedAvailability).toEqual(["weekend_morning"]);
    expect(brief.visibleContacts).toHaveLength(1);
    expect(brief.contactPrivacy.visibleCount).toBe(1);
    expect(brief.contactPrivacy.hiddenCount).toBe(1);
    expect(brief.contactPrivacy.viewerCanShareContact).toBe(true);
    expect(brief.contactPrivacy.hiddenNames).toEqual([members[1].fullName]);
    expect(brief.nextSteps.some((step) => step.includes("Weekend Morning"))).toBe(true);
    expect(brief.warnings).toEqual([]);
    expect(formatAvailability("weekday_evening")).toBe("Weekday Evening");
  });

  it("explains the viewer contact sharing state in participant team briefs", () => {
    const members: Participant[] = [
      {
        ...demoParticipants[0],
        consentToShareContact: true
      },
      {
        ...demoParticipants[1],
        consentToShareContact: false
      }
    ];
    const brief = buildParticipantTeamBrief(members, undefined, members[1].id);

    expect(brief.contactPrivacy.viewerCanShareContact).toBe(false);
    expect(brief.contactPrivacy.viewerDetail).toContain("stay hidden");
    expect(brief.contactPrivacy.summary).toContain("1/2");
  });

  it("warns when no teammate contacts can be shared", () => {
    const brief = buildParticipantTeamBrief(
      demoParticipants.slice(0, 2).map((participant) => ({
        ...participant,
        consentToShareContact: false
      }))
    );

    expect(brief.visibleContacts).toHaveLength(0);
    expect(brief.warnings).toContain("No teammates have enabled contact sharing yet.");
  });
});
