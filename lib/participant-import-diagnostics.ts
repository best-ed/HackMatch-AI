import type { ParticipantImportPlan, ParticipantImportRowPreview } from "@/lib/participant-import";

export type ParticipantImportPreviewFilter = "all" | "ready" | "warnings" | "errors" | "duplicates";

export type ParticipantImportDiagnostics = {
  status: "ready" | "review" | "blocked";
  summary: string;
  detail: string;
  readyRowCount: number;
  warningRowCount: number;
  duplicateRowCount: number;
  defaultedFieldCount: number;
  highlights: string[];
};

export function buildParticipantImportDiagnostics(plan: ParticipantImportPlan): ParticipantImportDiagnostics {
  const readyRowCount = plan.rowPreviews.filter((row) => row.action === "create" || row.action === "update").length;
  const warningRowCount = plan.rowPreviews.filter((row) => row.warnings.length > 0 && row.errors.length === 0).length;
  const duplicateRowCount = plan.rowPreviews.filter((row) => row.action === "skip" || row.action === "update").length;
  const defaultedFieldCount =
    plan.rowPreviews.reduce((total, row) => total + row.warnings.filter((warning) => warning.includes("will be used")).length, 0) +
    plan.warnings.filter((warning) => warning.includes("will use")).length;

  const highlights: string[] = [];

  if (plan.unknownHeaders.length > 0) {
    highlights.push(`Unknown columns ignored: ${plan.unknownHeaders.join(", ")}.`);
  }

  if (plan.missingRecommendedHeaders.length > 0) {
    highlights.push(`Missing recommended columns: ${plan.missingRecommendedHeaders.join(", ")}.`);
  }

  if (plan.errors.length > 0) {
    highlights.push(plan.errors[0]);
  }

  if (plan.warnings.length > 0) {
    highlights.push(plan.warnings[0]);
  }

  if (warningRowCount > 0) {
    highlights.push(`${warningRowCount} row${warningRowCount === 1 ? "" : "s"} will import with review warnings.`);
  }

  if (duplicateRowCount > 0) {
    highlights.push(`${duplicateRowCount} row${duplicateRowCount === 1 ? "" : "s"} match existing participant records.`);
  }

  const status = plan.errors.length > 0
    ? "blocked"
    : highlights.length > 0
      ? "review"
      : "ready";

  const summary = status === "blocked"
    ? "Import needs fixes before it can run."
    : status === "review"
      ? "Import can proceed, but some rows need review."
      : "Import preview is ready to apply.";

  const detail = `${readyRowCount} ready, ${plan.invalidCount} invalid, ${duplicateRowCount} duplicate match${duplicateRowCount === 1 ? "" : "es"}, ${defaultedFieldCount} defaulted field${defaultedFieldCount === 1 ? "" : "s"}.`;

  return {
    status,
    summary,
    detail,
    readyRowCount,
    warningRowCount,
    duplicateRowCount,
    defaultedFieldCount,
    highlights: highlights.slice(0, 4)
  };
}

export function filterParticipantImportRows(
  rows: ParticipantImportRowPreview[],
  filter: ParticipantImportPreviewFilter
) {
  if (filter === "all") return rows;
  if (filter === "ready") return rows.filter((row) => (row.action === "create" || row.action === "update") && row.warnings.length === 0);
  if (filter === "warnings") return rows.filter((row) => row.warnings.length > 0 && row.errors.length === 0);
  if (filter === "errors") return rows.filter((row) => row.errors.length > 0);
  return rows.filter((row) => row.action === "skip" || row.action === "update");
}
