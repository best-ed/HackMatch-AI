import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import { applyParticipantBulkAction } from "@/lib/participant-bulk-actions";

describe("participant bulk actions", () => {
  it("moves selected participants into a target cohort", () => {
    const result = applyParticipantBulkAction({
      action: "move-cohort",
      cohort: "June Hackathon",
      participantIds: [demoParticipants[0].id, demoParticipants[1].id],
      participants: demoParticipants,
      timestamp: "2026-06-15T10:00:00.000Z"
    });

    expect(result.affectedCount).toBe(2);
    expect(result.participants[0].cohort).toBe("June Hackathon");
    expect(result.participants[1].cohort).toBe("June Hackathon");
    expect(result.participants[0].updatedAt).toBe("2026-06-15T10:00:00.000Z");
    expect(result.participants[2]).toBe(demoParticipants[2]);
  });

  it("updates consent only for selected participants that need the change", () => {
    const participants = [
      { ...demoParticipants[0], consentToMatch: false },
      { ...demoParticipants[1], consentToMatch: true },
      { ...demoParticipants[2], consentToMatch: false }
    ];

    const result = applyParticipantBulkAction({
      action: "mark-matchable",
      participantIds: [participants[0].id, participants[1].id],
      participants,
      timestamp: "2026-06-15T10:00:00.000Z"
    });

    expect(result.affectedCount).toBe(1);
    expect(result.participants[0].consentToMatch).toBe(true);
    expect(result.participants[1]).toBe(participants[1]);
    expect(result.participants[2].consentToMatch).toBe(false);
  });
});
