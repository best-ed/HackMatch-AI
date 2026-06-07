import { describe, expect, it } from "vitest";
import { hackMatchCsvFilename, participantImportTemplateCsv, participantLinksToCsv, participantsToCsv, teamsToCsv } from "@/lib/export";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { generateTeams } from "@/lib/matching/algorithm";
import { planParticipantCsvImport } from "@/lib/participant-import";
import { validateParticipantRegistration } from "@/lib/participant-validation";
import { evaluateMatchingReadiness } from "@/lib/matching-readiness";
import { evaluateParticipantIntake } from "@/lib/participant-intake";
import { buildParticipantTeamBrief, formatAvailability } from "@/lib/participant-team-view";
import { evaluateDeploymentReadiness } from "@/lib/deployment-readiness";
import { compareMatchingImpact, summarizeMatchingImpact } from "@/lib/settings-impact";
import { summarizeSettingsChanges } from "@/lib/settings-changes";
import { summarizeTeamReview } from "@/lib/team-review";
import { evaluateSupabaseReadiness } from "@/lib/supabase-readiness";
import { buildTeamPlacementExplanations } from "@/lib/team-placement";
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
import { matchingPresets, validateMatchingSettings } from "@/lib/settings-guardrails";
import type { Participant } from "@/lib/matching/types";

function assignedIds(result: ReturnType<typeof generateTeams>) {
  return result.teams.flatMap((team) => team.participantIds);
}

describe("deterministic matching", () => {
  it("returns the same output for the same input and settings", () => {
    const first = generateTeams(demoParticipants, demoMatchingSettings);
    const second = generateTeams(demoParticipants, demoMatchingSettings);
    expect(first.teams).toEqual(second.teams);
    expect(first.scoreBreakdowns).toEqual(second.scoreBreakdowns);
  });

  it("does not place a participant in multiple teams", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const ids = assignedIds(result);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("respects team size constraints", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    for (const team of result.teams) {
      expect(team.participantIds.length).toBeLessThanOrEqual(demoMatchingSettings.maxTeamSize);
    }
  });

  it("does not group blocked teammates", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    for (const team of result.teams) {
      expect(team.participantIds.includes("p06") && team.participantIds.includes("p14")).toBe(false);
    }
  });

  it("excludes participants without consent", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    expect(assignedIds(result)).not.toContain("p30");
    expect(result.unassignedParticipants).toContain("p30");
  });

  it("distributes advanced participants where possible", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const advancedIds = new Set(
      demoParticipants
        .filter((participant) => participant.experienceLevel === "advanced")
        .map((participant) => participant.id)
    );
    const teamsWithAdvanced = result.teams.filter((team) =>
      team.participantIds.some((id) => advancedIds.has(id))
    );
    expect(teamsWithAdvanced.length).toBeGreaterThanOrEqual(
      Math.min(result.teams.length, advancedIds.size)
    );
  });

  it("penalizes beginner-only teams", () => {
    const beginnerOnly: Participant[] = demoParticipants
      .filter((participant) => participant.experienceLevel === "beginner")
      .slice(0, 4)
      .map((participant, index) => ({
        ...participant,
        id: `b${index}`,
        blockedTeammates: [],
        consentToMatch: true
      }));
    const result = generateTeams(beginnerOnly, {
      ...demoMatchingSettings,
      numberOfTeams: 1
    });
    expect(result.teams[0].score?.constraintPenalty).toBeGreaterThan(0);
  });

  it("returns score breakdowns for every team", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    expect(Object.keys(result.scoreBreakdowns)).toHaveLength(result.teams.length);
    for (const team of result.teams) {
      expect(result.scoreBreakdowns[team.id].totalScore).toBeGreaterThanOrEqual(0);
    }
  });

  it("preserves locked team membership", () => {
    const baseline = generateTeams(demoParticipants, demoMatchingSettings);
    const lockedTeam = baseline.teams[0];
    const result = generateTeams(demoParticipants, {
      ...demoMatchingSettings,
      lockedTeams: [{
        id: lockedTeam.id,
        name: lockedTeam.name,
        participantIds: lockedTeam.participantIds,
        locked: true
      }]
    });
    const preserved = result.teams.find((team) => team.id === lockedTeam.id);

    expect(preserved?.locked).toBe(true);
    expect(preserved?.participantIds).toEqual([...lockedTeam.participantIds].sort());
  });

  it("does not reassign locked participants to another team", () => {
    const baseline = generateTeams(demoParticipants, demoMatchingSettings);
    const lockedTeam = baseline.teams[0];
    const result = generateTeams(demoParticipants, {
      ...demoMatchingSettings,
      lockedTeams: [{
        id: lockedTeam.id,
        name: lockedTeam.name,
        participantIds: lockedTeam.participantIds,
        locked: true
      }]
    });
    const lockedIds = new Set(lockedTeam.participantIds);
    const appearances = result.teams.flatMap((team) =>
      team.participantIds
        .filter((participantId) => lockedIds.has(participantId))
        .map((participantId) => `${participantId}:${team.id}`)
    );

    expect(appearances).toHaveLength(lockedTeam.participantIds.length);
    expect(appearances.every((appearance) => appearance.endsWith(`:${lockedTeam.id}`))).toBe(true);
  });

  it("exports generated teams as CSV", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const csv = teamsToCsv(result, demoParticipants);
    expect(csv.split("\n")[0]).toContain("team_id,team_name,team_score");
    expect(csv).toContain("Avery Chen");
  });

  it("exports participants as CSV", () => {
    const csv = participantsToCsv(demoParticipants);
    expect(csv.split("\n")[0]).toContain("participant_id,access_token,cohort");
    expect(csv).toContain("Avery Chen");
    expect(csv).toContain("consent_to_match");
  });

  it("exports a participant import template that can be previewed", () => {
    const csv = participantImportTemplateCsv();
    expect(csv.split("\n")[0]).toContain("full_name,email,cohort");
    expect(csv).toContain("consent_to_match");

    const plan = planParticipantCsvImport({
      csv,
      existingParticipants: [],
      activeCohort: "General",
      now: "2026-06-07T00:00:00.000Z"
    });

    expect(plan.createdCount).toBe(1);
    expect(plan.errors).toEqual([]);
  });

  it("exports participant access links as CSV", () => {
    const csv = participantLinksToCsv(
      demoParticipants.slice(0, 2).map((participant, index) => ({
        ...participant,
        accessToken: `hm-TEST0${index + 1}`
      })),
      "https://hackmatch.example"
    );
    expect(csv.split("\n")[0]).toContain("participant_id,full_name,email,cohort,access_token,team_link");
    expect(csv).toContain("Avery Chen");
    expect(csv).toContain("https://hackmatch.example/participant/team?access=");
  });

  it("builds cohort-aware CSV filenames", () => {
    const filename = hackMatchCsvFilename({
      cohort: "May Hackathon 2026",
      date: new Date("2026-06-07T12:00:00.000Z"),
      kind: "teams",
      scope: "saved"
    });

    expect(filename).toBe("hackmatch-may-hackathon-2026-teams-saved-2026-06-07.csv");
  });

  it("imports participants from exported CSV and skips duplicates by default", () => {
    const csv = participantsToCsv([demoParticipants[0]]);
    const plan = planParticipantCsvImport({
      csv,
      existingParticipants: demoParticipants,
      activeCohort: "General",
      now: "2026-05-31T00:00:00.000Z"
    });

    expect(plan.createdCount).toBe(0);
    expect(plan.skippedCount).toBe(1);
    expect(plan.errors).toEqual([]);
    expect(plan.participants).toHaveLength(demoParticipants.length);
  });

  it("imports new participants and defaults missing cohort to active cohort", () => {
    const csv = [
      "full_name,email,primary_role,technical_skills,availability,consent_to_match",
      "\"Taylor Green\",taylor@example.com,Backend,\"Node; SQL\",weekend_morning,true"
    ].join("\n");
    const plan = planParticipantCsvImport({
      csv,
      existingParticipants: demoParticipants,
      activeCohort: "May Hackathon",
      now: "2026-05-31T00:00:00.000Z"
    });

    const imported = plan.participants.find((participant) => participant.email === "taylor@example.com");
    expect(plan.createdCount).toBe(1);
    expect(imported?.cohort).toBe("May Hackathon");
    expect(imported?.technicalSkills).toEqual(["Node", "SQL"]);
  });

  it("flags invalid participant import rows", () => {
    const csv = [
      "full_name,email,experience_level,availability",
      "Broken Row,not-an-email,expert,moonlight"
    ].join("\n");
    const plan = planParticipantCsvImport({
      csv,
      existingParticipants: demoParticipants,
      activeCohort: "General",
      now: "2026-05-31T00:00:00.000Z"
    });

    expect(plan.invalidCount).toBe(1);
    expect(plan.createdCount).toBe(0);
    expect(plan.rowPreviews[0].action).toBe("error");
    expect(plan.errors.join(" ")).toContain("email must use a valid address format");
    expect(plan.errors.join(" ")).toContain("availability contains invalid slot");
  });

  it("previews duplicate imports as updates when requested", () => {
    const csv = [
      "full_name,email,primary_role,technical_skills,availability,consent_to_match",
      "\"Avery Chen\",avery.chen@example.com,Backend,\"Node; SQL\",weekend_morning,true"
    ].join("\n");
    const plan = planParticipantCsvImport({
      csv,
      existingParticipants: demoParticipants,
      activeCohort: "General",
      mode: "update",
      now: "2026-05-31T00:00:00.000Z"
    });

    expect(plan.updatedCount).toBe(1);
    expect(plan.rowPreviews[0].action).toBe("update");
    expect(plan.rowPreviews[0].duplicateName).toBe("Avery Chen");
  });

  it("validates participant registration quality", () => {
    const validation = validateParticipantRegistration(
      {
        ...demoParticipants[0],
        id: "new-participant",
        fullName: "",
        email: "bad-email",
        primaryRole: "",
        availability: [],
        consentToMatch: false,
        technicalSkills: [],
        interests: [],
        githubUrl: "github.com/not-a-url"
      },
      demoParticipants
    );

    expect(validation.errors).toContain("Full name is required.");
    expect(validation.errors).toContain("Email must be a valid address.");
    expect(validation.errors).toContain("Primary role is required.");
    expect(validation.errors).toContain("Select at least one availability slot.");
    expect(validation.errors).toContain("Consent to match is required for team assignment.");
    expect(validation.warnings).toContain("Add at least one technical skill to improve matching quality.");
  });

  it("blocks duplicate participant registration emails", () => {
    const validation = validateParticipantRegistration(
      {
        ...demoParticipants[0],
        id: "new-participant",
        email: demoParticipants[1].email
      },
      demoParticipants
    );

    expect(validation.errors).toContain("A participant with this email already exists.");
  });

  it("provides deterministic matching settings presets", () => {
    expect(matchingPresets.map((preset) => preset.id)).toEqual([
      "balanced",
      "skill-heavy",
      "beginner-friendly",
      "strict-constraints"
    ]);
    expect(matchingPresets.find((preset) => preset.id === "skill-heavy")?.settings.weights.skillBalance)
      .toBeGreaterThan(demoMatchingSettings.weights.skillBalance);
  });

  it("validates impossible matching settings", () => {
    const health = validateMatchingSettings(
      {
        ...demoMatchingSettings,
        desiredTeamSize: 6,
        minTeamSize: 7,
        maxTeamSize: 5,
        weights: {
          ...demoMatchingSettings.weights,
          roleCoverage: -1
        }
      },
      demoParticipants
    );

    expect(health.status).toBe("error");
    expect(health.errors.some((error) => error.includes("Minimum team size"))).toBe(true);
    expect(health.errors.some((error) => error.includes("Weights cannot be negative"))).toBe(true);
  });

  it("summarizes matching settings impact previews", () => {
    const current = summarizeMatchingImpact(generateTeams(demoParticipants, demoMatchingSettings));
    const draft = summarizeMatchingImpact(generateTeams(demoParticipants, {
      ...demoMatchingSettings,
      numberOfTeams: 6
    }));
    const delta = compareMatchingImpact(current, draft);

    expect(current.teamCount).toBeGreaterThan(0);
    expect(current.assignedCount + current.unassignedCount).toBe(demoParticipants.length);
    expect(draft.teamCount).toBe(6);
    expect(delta.teamCount).toBe(draft.teamCount - current.teamCount);
    expect(delta.averageScore).toBe(draft.averageScore - current.averageScore);
  });

  it("summarizes draft settings changes", () => {
    const changes = summarizeSettingsChanges(demoMatchingSettings, {
      ...demoMatchingSettings,
      desiredTeamSize: demoMatchingSettings.desiredTeamSize + 1,
      requirePresenter: !demoMatchingSettings.requirePresenter,
      weights: {
        ...demoMatchingSettings.weights,
        roleCoverage: demoMatchingSettings.weights.roleCoverage + 0.5
      }
    });

    expect(changes.map((change) => change.label)).toContain("Desired team size");
    expect(changes.map((change) => change.label)).toContain("Require presenter");
    expect(changes.map((change) => change.label)).toContain("Role coverage weight");
  });

  it("evaluates matching readiness with actionable items", () => {
    const result = generateTeams(demoParticipants, demoMatchingSettings);
    const readiness = evaluateMatchingReadiness(result, demoParticipants, demoMatchingSettings);

    expect(readiness.score).toBeGreaterThan(0);
    expect(readiness.eligibleCount).toBe(demoParticipants.filter((participant) => participant.consentToMatch).length);
    expect(readiness.assignedCount).toBe(assignedIds(result).length);
    expect(readiness.items.length).toBeGreaterThan(0);
    expect(readiness.items.every((item) => item.action.length > 0)).toBe(true);
  });

  it("flags readiness blockers for impossible settings", () => {
    const result = generateTeams([], {
      ...demoMatchingSettings,
      minTeamSize: 5,
      desiredTeamSize: 3
    });
    const readiness = evaluateMatchingReadiness(result, [], {
      ...demoMatchingSettings,
      minTeamSize: 5,
      desiredTeamSize: 3
    });

    expect(readiness.items.some((item) => item.severity === "blocker")).toBe(true);
    expect(readiness.items.some((item) => item.title === "No matchable participants")).toBe(true);
  });

  it("evaluates participant intake quality", () => {
    const intake = evaluateParticipantIntake(demoParticipants);

    expect(intake.totalCount).toBe(demoParticipants.length);
    expect(intake.matchableCount).toBe(demoParticipants.filter((participant) => participant.consentToMatch).length);
    expect(intake.excludedCount).toBe(1);
    expect(intake.roleCoverage.length).toBeGreaterThan(0);
    expect(intake.issues.length).toBeGreaterThan(0);
  });

  it("flags incomplete participant intake records", () => {
    const intake = evaluateParticipantIntake([
      {
        ...demoParticipants[0],
        id: "broken-intake",
        fullName: "",
        email: "",
        primaryRole: "",
        availability: [],
        consentToMatch: false
      }
    ]);

    expect(intake.incompleteCount).toBe(1);
    expect(intake.issues.some((issue) => issue.severity === "blocker")).toBe(true);
  });

  it("builds participant-facing team briefs", () => {
    const members: Participant[] = [
      {
        ...demoParticipants[0],
        interests: ["Health", "Education"],
        availability: ["weekend_morning", "weekday_evening"],
        consentToShareContact: true
      },
      {
        ...demoParticipants[1],
        interests: ["Health", "Climate"],
        availability: ["weekend_morning"],
        consentToShareContact: false
      }
    ];
    const brief = buildParticipantTeamBrief(members);

    expect(brief.sharedInterests).toEqual(["Health"]);
    expect(brief.sharedAvailability).toEqual(["weekend_morning"]);
    expect(brief.visibleContacts).toHaveLength(1);
    expect(brief.nextSteps.some((step) => step.includes("Weekend Morning"))).toBe(true);
    expect(brief.warnings).toEqual([]);
    expect(formatAvailability("weekday_evening")).toBe("Weekday Evening");
  });

  it("warns when no teammate contacts can be shared", () => {
    const brief = buildParticipantTeamBrief(
      demoParticipants.slice(0, 2).map((participant) => ({
        ...participant,
        consentToShareContact: false
      }))
    );

    expect(brief.visibleContacts).toHaveLength(0);
    expect(brief.warnings).toContain("No teammates have enabled contact sharing yet.");
  });

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

  it("builds deterministic participant placement explanations", () => {
    const members = demoParticipants.slice(0, 4);
    const first = buildTeamPlacementExplanations(members);
    const second = buildTeamPlacementExplanations(members);

    expect(first).toEqual(second);
    expect(first).toHaveLength(members.length);
    expect(first[0].participantId).toBe(members[0].id);
    expect(first[0].reasons.length).toBeGreaterThan(0);
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
