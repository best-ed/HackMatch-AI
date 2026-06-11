import type { MatchingSettings, Participant, SavedMatchRun } from "@/lib/matching/types";
import type { TeamReviewChecklistStore } from "@/lib/team-review-checklist";

export const hackMatchBackupVersion = "hackmatch-backup-v1";
export const teamReviewChecklistStorageKey = "hackmatch.teamReviewChecklist.v1";

export type HackMatchLocalBackup = {
  version: typeof hackMatchBackupVersion;
  exportedAt: string;
  participants: Participant[];
  settings: MatchingSettings;
  savedMatchRuns: SavedMatchRun[];
  activeCohort: string;
  archivedCohorts: string[];
  teamReviewChecklist: TeamReviewChecklistStore;
};

export type HackMatchBackupSummary = {
  participants: number;
  savedRuns: number;
  archivedCohorts: number;
  reviewedTeams: number;
  activeCohort: string;
  exportedAt: string;
};

export type HackMatchBackupParseResult =
  | { ok: true; backup: HackMatchLocalBackup; summary: HackMatchBackupSummary }
  | { ok: false; error: string };

export function createHackMatchBackup({
  participants,
  settings,
  savedMatchRuns,
  activeCohort,
  archivedCohorts,
  teamReviewChecklist = {},
  exportedAt = new Date().toISOString()
}: {
  participants: Participant[];
  settings: MatchingSettings;
  savedMatchRuns: SavedMatchRun[];
  activeCohort: string;
  archivedCohorts: string[];
  teamReviewChecklist?: TeamReviewChecklistStore;
  exportedAt?: string;
}): HackMatchLocalBackup {
  return {
    version: hackMatchBackupVersion,
    exportedAt,
    participants,
    settings,
    savedMatchRuns,
    activeCohort,
    archivedCohorts,
    teamReviewChecklist
  };
}

export function parseHackMatchBackupJson(value: string): HackMatchBackupParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return { ok: false, error: "Backup JSON could not be parsed." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "Backup file must contain a JSON object." };
  }

  if (parsed.version !== hackMatchBackupVersion) {
    return { ok: false, error: "Backup version is not supported by this app build." };
  }

  if (!Array.isArray(parsed.participants)) {
    return { ok: false, error: "Backup is missing the participants list." };
  }

  if (!isRecord(parsed.settings)) {
    return { ok: false, error: "Backup is missing matching settings." };
  }

  if (!Array.isArray(parsed.savedMatchRuns)) {
    return { ok: false, error: "Backup is missing saved match runs." };
  }

  if (typeof parsed.activeCohort !== "string") {
    return { ok: false, error: "Backup is missing the active cohort." };
  }

  if (!Array.isArray(parsed.archivedCohorts)) {
    return { ok: false, error: "Backup is missing archived cohorts." };
  }

  const backup: HackMatchLocalBackup = {
    version: hackMatchBackupVersion,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : new Date().toISOString(),
    participants: parsed.participants as Participant[],
    settings: parsed.settings as MatchingSettings,
    savedMatchRuns: parsed.savedMatchRuns as SavedMatchRun[],
    activeCohort: parsed.activeCohort,
    archivedCohorts: parsed.archivedCohorts.filter((cohort): cohort is string => typeof cohort === "string"),
    teamReviewChecklist: isRecord(parsed.teamReviewChecklist)
      ? (parsed.teamReviewChecklist as TeamReviewChecklistStore)
      : {}
  };

  return {
    ok: true,
    backup,
    summary: summarizeHackMatchBackup(backup)
  };
}

export function summarizeHackMatchBackup(backup: HackMatchLocalBackup): HackMatchBackupSummary {
  return {
    participants: backup.participants.length,
    savedRuns: backup.savedMatchRuns.length,
    archivedCohorts: backup.archivedCohorts.length,
    reviewedTeams: Object.values(backup.teamReviewChecklist).filter((item) => item.reviewed).length,
    activeCohort: backup.activeCohort,
    exportedAt: backup.exportedAt
  };
}

export function hackMatchBackupFilename(exportedAt = new Date().toISOString()): string {
  const stamp = exportedAt.replace(/[:.]/g, "-");
  return `hackmatch-backup-${stamp}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
