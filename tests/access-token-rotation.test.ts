import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import {
  accessTokenRotationMessage,
  buildAccessTokenRotationPreview,
  maskAccessToken
} from "@/lib/access-token-rotation";

describe("access token rotation guardrails", () => {
  it("masks access tokens in organizer-facing messages", () => {
    expect(maskAccessToken("hm-Z8NR6Y")).toBe("hm-Z8NR6Y");
    expect(maskAccessToken("894327e7-22f7-4160-b1b4-7f018df4d5fe")).toBe("89432...5fe");
    expect(maskAccessToken()).toBe("not generated");
  });

  it("builds a rotation preview without exposing long token values", () => {
    const participant = {
      ...demoParticipants[0],
      accessToken: "894327e7-22f7-4160-b1b4-7f018df4d5fe"
    };

    expect(buildAccessTokenRotationPreview(participant)).toMatchObject({
      participantId: participant.id,
      participantName: participant.fullName,
      oldTokenLabel: "89432...5fe"
    });
  });

  it("summarizes completed token rotation", () => {
    const participant = {
      ...demoParticipants[0],
      fullName: "Maya Patel"
    };

    expect(accessTokenRotationMessage({
      participant,
      oldToken: "hm-OLD234",
      newToken: "hm-NEW567"
    })).toBe("Maya Patel now uses hm-NEW567. Previous link hm-OLD234 is invalid.");
  });
});
