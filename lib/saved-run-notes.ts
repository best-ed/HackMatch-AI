import type { SavedMatchRun } from "@/lib/matching/types";

export function cleanSavedRunNote(note: string): string {
  return note.trim().replace(/\s+\n/g, "\n").slice(0, 1000);
}

export function updateSavedRunNotes(
  runs: SavedMatchRun[],
  id: string,
  note: string
): SavedMatchRun[] {
  const cleaned = cleanSavedRunNote(note);
  return runs.map((run) =>
    run.id === id
      ? {
          ...run,
          notes: cleaned || undefined
        }
      : run
  );
}
