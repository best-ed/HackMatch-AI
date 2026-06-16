import { describe, expect, it } from "vitest";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { evaluateDeploymentReadiness } from "@/lib/deployment-readiness";
import { generateTeams } from "@/lib/matching/algorithm";
import {
  adminNavItems,
  contextualParticipantRoutes,
  isAdminSectionActive,
  isNavItemActive,
  isParticipantSectionActive,
  navAriaCurrent,
  participantNavItems,
  primaryNavItems
} from "@/lib/navigation";
import { evaluateSupabaseReadiness } from "@/lib/supabase-readiness";
import { summarizeTeamReview } from "@/lib/team-review";

function assignedIds(result: ReturnType<typeof generateTeams>) {
  return result.teams.flatMap((team) => team.participantIds);
}

describe("team review and platform support", () => {
  it("summarizes team review risks", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const review = summarizeTeamReview(result, demoParticipants);

    expect(review.teamCount).toBe(result.teams.length);
    expect(review.assignedCount).toBe(assignedIds(result).length);
    expect(review.averageScore).toBeGreaterThan(0);
    expect(review.risks.length).toBeGreaterThan(0);
    expect(review.mediumRiskCount + review.highRiskCount).toBeGreaterThanOrEqual(0);
  });

  it("flags high-risk team review items", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const lowScoreResult = {
      ...result,
      teams: [
        {
          ...result.teams[0],
          score: {
            ...result.teams[0].score!,
            totalScore: 52
          }
        },
        ...result.teams.slice(1)
      ]
    };
    const review = summarizeTeamReview(lowScoreResult, demoParticipants);

    expect(review.highRiskCount).toBeGreaterThan(0);
    expect(review.risks.some((risk) => risk.label === "Low score")).toBe(true);
  });

  it("flags actionable team risk categories", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const riskyResult = {
      ...result,
      teams: [
        {
          ...result.teams[0],
          score: {
            ...result.teams[0].score!,
            roleCoverageScore: 50,
            skillCoverageScore: 55,
            availabilityCompatibilityScore: 45,
            constraintPenalty: 30
          }
        },
        ...result.teams.slice(1)
      ]
    };
    const review = summarizeTeamReview(riskyResult, demoParticipants);

    expect(review.coverageRiskCount).toBeGreaterThan(0);
    expect(review.availabilityRiskCount).toBeGreaterThan(0);
    expect(review.constraintRiskCount).toBeGreaterThan(0);
    expect(review.risks.some((risk) => risk.category === "availability")).toBe(true);
  });

  it("evaluates Supabase local-storage mode", () => {
    const readiness = evaluateSupabaseReadiness({});

    expect(readiness.status).toBe("local");
    expect(readiness.checks.every((check) => check.ok)).toBe(false);
  });

  it("evaluates Supabase ready env shape", () => {
    const readiness = evaluateSupabaseReadiness({
      url: "https://abc123.supabase.co",
      anonKey: "header.payload.signature-that-is-long-enough-for-a-public-anon-jwt"
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.checks.every((check) => check.ok)).toBe(true);
  });

  it("flags malformed Supabase env values", () => {
    const readiness = evaluateSupabaseReadiness({
      url: "not-a-url",
      anonKey: "short"
    });

    expect(readiness.status).toBe("misconfigured");
    expect(readiness.checks.some((check) => !check.ok)).toBe(true);
  });

  it("evaluates deployment readiness for local MVP mode", () => {
    const readiness = evaluateDeploymentReadiness({
      supabase: evaluateSupabaseReadiness({}),
      hasParticipants: true,
      hasGeneratedTeams: true,
      hasSavedRun: false
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.checks.find((check) => check.label === "Saved run")?.ok).toBe(false);
  });

  it("flags deployment readiness when Supabase env is malformed", () => {
    const readiness = evaluateDeploymentReadiness({
      supabase: evaluateSupabaseReadiness({ url: "bad-url", anonKey: "short" }),
      hasParticipants: true,
      hasGeneratedTeams: true,
      hasSavedRun: true
    });

    expect(readiness.status).toBe("review");
    expect(readiness.checks.find((check) => check.label === "Persistence mode")?.ok).toBe(false);
  });

  it("keeps primary and admin navigation hierarchy separate", () => {
    expect(primaryNavItems.map((item) => item.href)).toEqual([
      "/",
      "/participant",
      "/admin"
    ]);
    expect(primaryNavItems.some((item) => item.href === "/participant/confirmation")).toBe(false);
    expect(participantNavItems.map((item) => item.href)).toEqual([
      "/participant/register",
      "/participant/team"
    ]);
    expect(contextualParticipantRoutes.map((item) => item.href)).toEqual(["/participant/confirmation"]);
    expect(adminNavItems.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/participants",
      "/admin/matching",
      "/admin/teams",
      "/admin/settings"
    ]);
    expect(adminNavItems.map((item) => item.label)).toEqual([
      "Overview",
      "Directory",
      "Match setup",
      "Team review",
      "Settings"
    ]);
    expect(isNavItemActive("/admin/teams", "/admin")).toBe(true);
    expect(isAdminSectionActive("/admin/teams", "/admin")).toBe(false);
    expect(isAdminSectionActive("/admin/teams", "/admin/teams")).toBe(true);
    expect(isNavItemActive("/participant/confirmation", "/participant")).toBe(true);
    expect(isParticipantSectionActive("/participant/confirmation", "/participant/register")).toBe(false);
    expect(navAriaCurrent("/admin/teams", "/admin", true)).toBe("location");
    expect(navAriaCurrent("/admin/teams", "/admin/teams", true)).toBe("page");
    expect(navAriaCurrent("/admin/teams", "/participant", false)).toBeUndefined();
  });
});
