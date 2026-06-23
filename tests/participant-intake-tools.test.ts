import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import { averageParticipantCompleteness, evaluateParticipantCompleteness } from "@/lib/participant-completeness";
import { buildParticipantDuplicateQueue } from "@/lib/participant-duplicate-queue";
import { buildDuplicateResolutionPreview } from "@/lib/participant-duplicate-resolution";
import { buildParticipantOperatorNudges } from "@/lib/participant-operator-nudges";

describe("participant intake tools", () => {
  it("prioritizes duplicate groups by the riskiest cause first", () => {
    const groups = [
      {
        reason: "name-institution" as const,
        label: "avery chen general",
        participants: [demoParticipants[0], { ...demoParticipants[0], id: "p-copy-1" }]
      },
      {
        reason: "access-token" as const,
        label: "hm-test",
        participants: [demoParticipants[1], { ...demoParticipants[1], id: "p-copy-2" }]
      }
    ];

    const queue = buildParticipantDuplicateQueue(groups);

    expect(queue.highCount).toBe(1);
    expect(queue.lowCount).toBe(1);
    expect(queue.items[0].reason).toBe("access-token");
  });

  it("suggests the strongest duplicate record to keep and flags merge fields", () => {
    const preview = buildDuplicateResolutionPreview({
      reason: "email",
      label: "avery.chen@example.com",
      participants: [
        {
          ...demoParticipants[0],
          id: "p-thin",
          technicalSkills: [],
          interests: [],
          consentToShareContact: false,
          updatedAt: "2026-06-01T08:00:00.000Z"
        },
        {
          ...demoParticipants[0],
          id: "p-rich",
          phone: "555-0101",
          technicalSkills: ["React", "TypeScript", "Tailwind"],
          interests: ["health", "education"],
          consentToShareContact: true,
          updatedAt: "2026-06-10T08:00:00.000Z"
        }
      ]
    });

    expect(preview.keepId).toBe("p-rich");
    expect(preview.keepReasons.length).toBeGreaterThan(0);
    expect(preview.mergeFieldCount).toBeGreaterThanOrEqual(0);
  });

  it("scores completeness based on profile signal and averages it across participants", () => {
    const thin = {
      ...demoParticipants[0],
      fullName: "",
      technicalSkills: [],
      interests: [],
      availability: [],
      consentToMatch: false
    };

    const rich = demoParticipants[1];

    const thinScore = evaluateParticipantCompleteness(thin);
    const richScore = evaluateParticipantCompleteness(rich);
    const average = averageParticipantCompleteness([thin, rich]);

    expect(thinScore.score).toBeLessThan(richScore.score);
    expect(thinScore.missingCoreFields).toContain("full name");
    expect(average).toBeGreaterThan(thinScore.score);
  });

  it("turns intake gaps into focused organizer nudges", () => {
    const nudges = buildParticipantOperatorNudges({
      averageCompleteness: 62,
      duplicateCount: 3,
      summary: {
        totalCount: 12,
        matchableCount: 9,
        excludedCount: 2,
        incompleteCount: 1,
        lowSignalCount: 4,
        roleCoverage: [],
        issues: []
      }
    });

    expect(nudges[0]?.filter).toBe("incomplete");
    expect(nudges.some((nudge) => nudge.filter === "duplicates")).toBe(true);
    expect(nudges.some((nudge) => nudge.title.includes("Average completeness"))).toBe(true);
  });
});
