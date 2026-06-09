import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import type { TeamAssignment } from "@/lib/matching/types";
import { buildParticipantStatusChecklist } from "@/lib/participant-status";

const team: TeamAssignment = {
  id: "team-1",
  name: "Team 1",
  participantIds: ["p01"]
};

describe("participant status checklist", () => {
  it("marks lookup, consent, assignment, and contact sharing complete when available", () => {
    const participant = {
      ...demoParticipants[0],
      consentToMatch: true,
      consentToShareContact: true
    };

    const checklist = buildParticipantStatusChecklist({ participant, team });

    expect(checklist.map((item) => item.status)).toEqual([
      "complete",
      "complete",
      "complete",
      "complete"
    ]);
  });

  it("shows pending states before a participant lookup resolves", () => {
    const checklist = buildParticipantStatusChecklist({});

    expect(checklist.every((item) => item.status === "pending")).toBe(true);
  });

  it("warns when consent or assignment is missing", () => {
    const participant = {
      ...demoParticipants[1],
      consentToMatch: false,
      consentToShareContact: false
    };

    const checklist = buildParticipantStatusChecklist({ participant });

    expect(checklist.find((item) => item.id === "consent")?.status).toBe("warning");
    expect(checklist.find((item) => item.id === "assignment")?.status).toBe("warning");
    expect(checklist.find((item) => item.id === "contact-sharing")?.status).toBe("warning");
  });
});
