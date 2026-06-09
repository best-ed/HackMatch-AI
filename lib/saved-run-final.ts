import type { SavedMatchRun } from "@/lib/matching/types";

export function markFinalSavedRun(
  runs: SavedMatchRun[],
  id: string
): SavedMatchRun[] {
  return runs.map((run) => ({
    ...run,
    isFinal: run.id === id
  }));
}

export function clearFinalSavedRun(runs: SavedMatchRun[]): SavedMatchRun[] {
  return runs.map((run) => ({
    ...run,
    isFinal: undefined
  }));
}

export function getFinalSavedRun(runs: SavedMatchRun[]): SavedMatchRun | undefined {
  return runs.find((run) => run.isFinal);
}
