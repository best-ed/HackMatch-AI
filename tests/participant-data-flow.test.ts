import { describe, expect, it } from "vitest";
import {
  hackMatchCsvFilename,
  participantImportTemplateCsv,
  participantLinksToCsv,
  participantsToCsv,
  teamsToCsv
} from "@/lib/export";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { generateTeams } from "@/lib/matching/algorithm";
import { planParticipantCsvImport } from "@/lib/participant-import";
import { validateParticipantRegistration } from "@/lib/participant-validation";

describe("participant data flow", () => {
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
});
