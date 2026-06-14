import { describe, expect, it } from "vitest";
import {
  createBlankParticipant,
  createUniqueParticipantAccessToken
} from "@/lib/local-store";
import { demoParticipants } from "@/lib/demo-data";

describe("participant access token uniqueness", () => {
  it("retries when a generated participant access token already exists", () => {
    const participants = [
      { ...demoParticipants[0], accessToken: "hm-ABC234" },
      { ...demoParticipants[1], accessToken: "hm-Z8NR6Y" }
    ];
    const generated = ["hm-ABC234", "hm-Z8NR6Y", "hm-UNIQ42"];
    const token = createUniqueParticipantAccessToken(participants, () => generated.shift() ?? "hm-LAST99");

    expect(token).toBe("hm-UNIQ42");
  });

  it("creates blank participant records with unused access tokens", () => {
    const participants = [
      { ...demoParticipants[0], accessToken: "hm-ABC234" },
      { ...demoParticipants[1], accessToken: "hm-Z8NR6Y" }
    ];
    const blank = createBlankParticipant(participants);

    expect(blank.accessToken).toMatch(/^hm-[A-Z2-9]{6}$/);
    expect(participants.map((participant) => participant.accessToken)).not.toContain(blank.accessToken);
  });

  it("fails loudly if token generation cannot escape existing collisions", () => {
    const participants = [{ ...demoParticipants[0], accessToken: "hm-ABC234" }];

    expect(() => createUniqueParticipantAccessToken(participants, () => "hm-ABC234")).toThrow(
      "Could not create a unique participant access token."
    );
  });
});
