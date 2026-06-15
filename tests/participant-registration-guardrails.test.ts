import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import { findExistingRegistrationByEmail } from "@/lib/participant-registration-guardrails";

describe("participant registration guardrails", () => {
  it("finds existing registrations by email and builds participant links", () => {
    const existing = demoParticipants[0];
    const notice = findExistingRegistrationByEmail(` ${existing.email.toUpperCase()} `, demoParticipants);

    expect(notice?.participant.id).toBe(existing.id);
    expect(notice?.confirmationHref).toContain(encodeURIComponent(existing.accessToken ?? existing.email));
    expect(notice?.teamLookupHref).toContain("/participant/team?access=");
  });

  it("ignores blank and unknown emails", () => {
    expect(findExistingRegistrationByEmail("", demoParticipants)).toBeNull();
    expect(findExistingRegistrationByEmail("missing@example.com", demoParticipants)).toBeNull();
  });
});
