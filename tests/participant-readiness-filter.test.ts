import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import {
  duplicateParticipantIdsFromGroups,
  participantMatchesReadinessFilter
} from "@/lib/participant-readiness-filter";
import { findParticipantDuplicates } from "@/lib/participant-duplicates";

describe("participant readiness filters", () => {
  it("matches excluded participants", () => {
    const excluded = demoParticipants.find((participant) => !participant.consentToMatch);
    expect(excluded).toBeTruthy();
    expect(
      participantMatchesReadinessFilter({
        participant: excluded!,
        participants: demoParticipants,
        duplicateParticipantIds: new Set(),
        filter: "excluded"
      })
    ).toBe(true);
  });

  it("matches duplicate participants from duplicate groups", () => {
    const duplicateParticipants = [
      demoParticipants[0],
      { ...demoParticipants[1], id: "dupe", email: demoParticipants[0].email }
    ];
    const duplicateIds = duplicateParticipantIdsFromGroups(findParticipantDuplicates(duplicateParticipants));

    expect(duplicateIds.has(demoParticipants[0].id)).toBe(true);
    expect(duplicateIds.has("dupe")).toBe(true);
    expect(
      participantMatchesReadinessFilter({
        participant: duplicateParticipants[0],
        participants: duplicateParticipants,
        duplicateParticipantIds: duplicateIds,
        filter: "duplicates"
      })
    ).toBe(true);
  });
});
