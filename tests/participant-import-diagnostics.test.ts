import { describe, expect, it } from "vitest";
import { demoParticipants } from "@/lib/demo-data";
import {
  buildParticipantImportDiagnostics,
  filterParticipantImportRows,
  summarizeParticipantImportCohorts
} from "@/lib/participant-import-diagnostics";
import { planParticipantCsvImport } from "@/lib/participant-import";

describe("participant import diagnostics", () => {
  it("surfaces missing columns and invalid rows", () => {
    const plan = planParticipantCsvImport({
      csv: [
        "full_name,email,random_col",
        "Broken,bad-email,value"
      ].join("\n"),
      existingParticipants: demoParticipants,
      activeCohort: "General",
      now: "2026-06-16T00:00:00.000Z"
    });

    const diagnostics = buildParticipantImportDiagnostics(plan);

    expect(plan.unknownHeaders).toContain("random_col");
    expect(plan.missingRecommendedHeaders).toContain("primary_role");
    expect(diagnostics.status).toBe("blocked");
    expect(diagnostics.highlights.join(" ")).toContain("Unknown columns ignored");
    expect(diagnostics.highlights.join(" ")).toContain("Row 2");
  });

  it("filters preview rows by review state", () => {
    const plan = planParticipantCsvImport({
      csv: [
        "full_name,email,primary_role,technical_skills,availability,consent_to_match",
        "Taylor,taylor@example.com,Backend,Node,weekend_morning,true",
        "Avery Chen,avery.chen@example.com,Backend,,weekend_morning,true"
      ].join("\n"),
      existingParticipants: demoParticipants,
      activeCohort: "General",
      mode: "update",
      now: "2026-06-16T00:00:00.000Z"
    });

    expect(filterParticipantImportRows(plan.rowPreviews, "ready")).toHaveLength(1);
    expect(filterParticipantImportRows(plan.rowPreviews, "warnings")).toHaveLength(1);
    expect(filterParticipantImportRows(plan.rowPreviews, "duplicates")).toHaveLength(1);
  });

  it("shows header mapping hints and cohort landing summaries", () => {
    const plan = planParticipantCsvImport({
      csv: [
        "name,email,role,skills,cohort_name,availability,consent_to_match",
        "Taylor,taylor@example.com,Backend,Node,June,weekend_morning,true",
        "Jordan,jordan@example.com,Designer,Figma,July,weekend_evening,true"
      ].join("\n"),
      existingParticipants: [],
      activeCohort: "June",
      now: "2026-06-16T00:00:00.000Z"
    });

    const cohortSummary = summarizeParticipantImportCohorts(plan.rowPreviews, "June");

    expect(plan.headerScan.find((header) => header.sourceHeader === "name")?.status).toBe("aliased");
    expect(plan.headerScan.find((header) => header.sourceHeader === "cohort_name")?.status).toBe("unknown");
    expect(plan.headerScan.find((header) => header.sourceHeader === "cohort_name")?.suggestion).toBe("cohort");
    expect(cohortSummary.activeCohortCount).toBe(2);
    expect(cohortSummary.otherCohortCount).toBe(0);
    expect(cohortSummary.cohortCount).toBe(1);
  });
});
