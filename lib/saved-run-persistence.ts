import type { SavedMatchRun } from "@/lib/matching/types";
import type { TeamReviewChecklistItem } from "@/lib/team-review-checklist";

export type SavedMatchRunRow = {
  id: string;
  name: string;
  notes: string | null;
  is_final: boolean;
  cohort: string;
  participant_count: number;
  assigned_count: number;
  average_score: number;
  settings_snapshot: SavedMatchRun["settingsSnapshot"];
  participants_snapshot: SavedMatchRun["participantsSnapshot"];
  result: SavedMatchRun["result"];
  created_at: string;
};

export type TeamReviewChecklistRow = TeamReviewChecklistItem & {
  id: string;
  run_id: string;
  team_id: string;
  updated_at: string;
};

export function savedRunToRow(run: SavedMatchRun): SavedMatchRunRow {
  return {
    id: run.id,
    name: run.name,
    notes: run.notes?.trim() || null,
    is_final: Boolean(run.isFinal),
    cohort: run.cohort ?? "General",
    participant_count: run.participantCount,
    assigned_count: run.assignedCount,
    average_score: run.averageScore,
    settings_snapshot: run.settingsSnapshot,
    participants_snapshot: run.participantsSnapshot,
    result: run.result,
    created_at: run.createdAt
  };
}

export function rowToSavedRun(row: SavedMatchRunRow): SavedMatchRun {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes ?? undefined,
    isFinal: row.is_final || undefined,
    createdAt: row.created_at,
    participantCount: row.participant_count,
    assignedCount: row.assigned_count,
    averageScore: row.average_score,
    cohort: row.cohort,
    settingsSnapshot: row.settings_snapshot,
    participantsSnapshot: row.participants_snapshot,
    result: row.result
  };
}

export function checklistToRow({
  id,
  runId,
  teamId,
  checklist,
  updatedAt = new Date().toISOString()
}: {
  id: string;
  runId: string;
  teamId: string;
  checklist: TeamReviewChecklistItem;
  updatedAt?: string;
}): TeamReviewChecklistRow {
  return {
    id,
    run_id: runId,
    team_id: teamId,
    rolesConfirmed: checklist.rolesConfirmed,
    contactsConfirmed: checklist.contactsConfirmed,
    blockersCleared: checklist.blockersCleared,
    reviewed: checklist.reviewed,
    updated_at: updatedAt
  };
}
