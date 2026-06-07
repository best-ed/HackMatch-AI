import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import { findParticipantDuplicates } from "@/lib/participant-duplicates";

describe("participant duplicate review", () => {
  it("finds likely duplicate participant records", () => {
    const duplicates = findParticipantDuplicates([
      demoParticipants[0],
      {
        ...demoParticipants[1],
        id: "duplicate",
        email: demoParticipants[0].email,
        fullName: demoParticipants[0].fullName,
        institution: demoParticipants[0].institution
      }
    ]);

    expect(duplicates.some((group) => group.reason === "email")).toBe(true);
    expect(duplicates.some((group) => group.reason === "name-institution")).toBe(true);
  });
});
