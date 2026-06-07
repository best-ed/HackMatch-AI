const defaultCohort = "General";

export function normalizeArchivedCohorts(cohorts: string[]): string[] {
  return Array.from(
    new Set(
      cohorts
        .map((cohort) => cohort.trim())
        .filter((cohort) => cohort && cohort !== defaultCohort)
    )
  ).sort((left, right) => left.localeCompare(right));
}

export function visibleCohorts(allCohorts: string[], archivedCohorts: string[]): string[] {
  const archived = new Set(normalizeArchivedCohorts(archivedCohorts));
  const visible = allCohorts.filter((cohort) => !archived.has(cohort));
  return visible.includes(defaultCohort)
    ? visible
    : [defaultCohort, ...visible].sort((left, right) => left.localeCompare(right));
}

export function archiveCohortList(current: string[], cohort: string): string[] {
  return normalizeArchivedCohorts([...current, cohort]);
}

export function restoreCohortList(current: string[], cohort: string): string[] {
  return normalizeArchivedCohorts(current.filter((item) => item !== cohort));
}
