import type { SavedMatchRun } from "@/lib/matching/types";
import type { SavedRunIntegritySummary } from "@/lib/saved-run-integrity";

export type SavedRunVisibilityFilter = "all" | "active-cohort" | "final" | "attention";

export function filterSavedRuns({
  activeCohort,
  filter,
  integrityById,
  query,
  runs
}: {
  activeCohort: string;
  filter: SavedRunVisibilityFilter;
  integrityById: Map<string, SavedRunIntegritySummary>;
  query: string;
  runs: SavedMatchRun[];
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return runs.filter((run) => {
    if (filter === "active-cohort" && (run.cohort ?? "General") !== activeCohort) return false;
    if (filter === "final" && !run.isFinal) return false;
    if (filter === "attention" && (integrityById.get(run.id)?.status ?? "verified") === "verified") return false;

    if (!normalizedQuery) return true;

    const searchableText = [
      run.name,
      run.notes ?? "",
      run.cohort ?? "General",
      run.createdAt,
      run.isFinal ? "final" : "",
      integrityById.get(run.id)?.status ?? ""
    ].join(" ").toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

export function summarizeSavedRunVisibilityCounts({
  activeCohort,
  integrityById,
  runs
}: {
  activeCohort: string;
  integrityById: Map<string, SavedRunIntegritySummary>;
  runs: SavedMatchRun[];
}) {
  return {
    all: runs.length,
    "active-cohort": runs.filter((run) => (run.cohort ?? "General") === activeCohort).length,
    attention: runs.filter((run) => (integrityById.get(run.id)?.status ?? "verified") !== "verified").length,
    final: runs.filter((run) => Boolean(run.isFinal)).length
  } satisfies Record<SavedRunVisibilityFilter, number>;
}
