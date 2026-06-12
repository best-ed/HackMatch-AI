import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import { buildParticipantLinkAudit } from "@/lib/participant-link-audit";

describe("participant link audit", () => {
  it("flags missing and duplicate access tokens as blockers", () => {
    const participants = [
      { ...demoParticipants[0], id: "p-a", accessToken: "hm-ABC123" },
      { ...demoParticipants[1], id: "p-b", accessToken: "hm-ABC123" },
      { ...demoParticipants[2], id: "p-c", accessToken: "" }
    ];

    const audit = buildParticipantLinkAudit(participants);

    expect(audit.status).toBe("blocked");
    expect(audit.duplicateTokenCount).toBe(2);
    expect(audit.missingTokenCount).toBe(1);
    expect(audit.riskParticipantIds).toEqual(["p-a", "p-b", "p-c"]);
  });

  it("asks for review when tokens are legacy shaped or excluded participants still have links", () => {
    const participants = [
      {
        ...demoParticipants[0],
        id: "p-legacy",
        accessToken: "894327e7-22f7-4160-b1b4-7f018df4d5fe"
      },
      {
        ...demoParticipants[1],
        id: "p-excluded",
        accessToken: "hm-Z8NR6Y",
        consentToMatch: false
      }
    ];

    const audit = buildParticipantLinkAudit(participants);

    expect(audit.status).toBe("review");
    expect(audit.nonstandardTokenCount).toBe(1);
    expect(audit.excludedWithTokenCount).toBe(1);
  });

  it("marks unique current-format tokens ready", () => {
    const participants = [
      { ...demoParticipants[0], id: "p-a", accessToken: "hm-ABC234", consentToMatch: true },
      { ...demoParticipants[1], id: "p-b", accessToken: "hm-Z8NR6Y", consentToMatch: true }
    ];

    const audit = buildParticipantLinkAudit(participants);

    expect(audit.status).toBe("ready");
    expect(audit.riskParticipantIds).toHaveLength(0);
  });
});
