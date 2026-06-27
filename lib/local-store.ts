"use client";

import { readAdminAuditHistory } from "@/lib/admin-audit-history";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import {
  archiveCohortList,
  normalizeArchivedCohorts,
  restoreCohortList,
  visibleCohorts
} from "@/lib/cohort-archive";
import { clearFinalSavedRun, markFinalSavedRun } from "@/lib/saved-run-final";
import { createSavedMatchRun } from "@/lib/saved-run-factory";
import { updateSavedRunNotes } from "@/lib/saved-run-notes";
import type { HackMatchLocalBackup } from "@/lib/local-backup";
import { teamReviewChecklistStorageKey } from "@/lib/local-backup";
import type {
  AvailabilitySlot,
  MatchingSettings,
  MatchingResult,
  Participant,
  SavedMatchRun
} from "@/lib/matching/types";
import {
  deleteRemoteParticipant,
  deleteRemoteMatchRun,
  isSupabaseConfigured,
  loadRemoteMatchRuns,
  loadRemoteParticipants,
  loadRemoteSettings,
  loadRemoteWorkspaceState,
  saveRemoteMatchRun,
  saveRemoteParticipant,
  saveRemoteSettings,
  saveRemoteTeamReviewChecklist,
  saveRemoteWorkspaceState
} from "@/lib/supabase-store";
import { useEffect, useMemo, useState } from "react";

const participantsKey = "hackmatch.participants.v1";
const settingsKey = "hackmatch.settings.v1";
const savedMatchRunsKey = "hackmatch.savedMatchRuns.v1";
const activeCohortKey = "hackmatch.activeCohort.v1";
const archivedCohortsKey = "hackmatch.archivedCohorts.v1";
const currentParticipantKey = "hackmatch.currentParticipant.v1";
const defaultCohort = "General";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function syncRemoteWorkspaceState(
  activeCohort: string,
  archivedCohorts: string[],
  setPersistenceWarning: (value: string) => void
) {
  if (!isSupabaseConfigured()) return;

  void saveRemoteWorkspaceState({
    activeCohort,
    archivedCohorts,
    adminAuditHistory: readAdminAuditHistory()
  }).catch(() => setPersistenceWarning("Supabase workspace-state sync failed; local browser storage is still updated."));
}

export function readCurrentParticipantLookup(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(currentParticipantKey) ?? "";
}

export function writeCurrentParticipantLookup(value: string) {
  window.localStorage.setItem(currentParticipantKey, value);
}

export function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinListLines(value: string[]): string {
  return value.join("\n");
}

export function joinList(value: string[]): string {
  return value.join(", ");
}

export function createParticipantId(participants: Participant[]): string {
  const max = participants.reduce((highest, participant) => {
    const numeric = Number(participant.id.replace(/\D/g, ""));
    return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest;
  }, 0);
  return `p${String(max + 1).padStart(2, "0")}`;
}

export function createParticipantAccessToken(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);

  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  const token = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `hm-${token}`;
}

export function createUniqueParticipantAccessToken(
  participants: Participant[],
  generateToken: () => string = createParticipantAccessToken
): string {
  const existingTokens = new Set(
    participants
      .map((participant) => participant.accessToken?.trim().toLowerCase())
      .filter((token): token is string => Boolean(token))
  );

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const token = generateToken();
    if (!existingTokens.has(token.toLowerCase())) return token;
  }

  throw new Error("Could not create a unique participant access token.");
}

function ensureParticipantAccessToken(participant: Participant, participants: Participant[] = []): Participant {
  const existingParticipants = participants.filter((item) => item.id !== participant.id);
  const token = participant.accessToken?.trim();
  const tokenIsDuplicate = token
    ? existingParticipants.some((item) => item.accessToken?.trim().toLowerCase() === token.toLowerCase())
    : false;

  return {
    ...participant,
    accessToken: token && !tokenIsDuplicate
      ? token
      : createUniqueParticipantAccessToken(existingParticipants),
    cohort: participant.cohort?.trim() || defaultCohort
  };
}

function normalizeParticipantsForStorage(participants: Participant[]): Participant[] {
  return participants.reduce<Participant[]>((normalized, participant) => {
    const next = ensureParticipantAccessToken({
      ...participant,
      updatedAt: participant.updatedAt || new Date().toISOString()
    }, normalized);
    return [...normalized, next];
  }, []);
}

function normalizeSavedRunsForStorage(runs: SavedMatchRun[]): SavedMatchRun[] {
  return runs.map((run) => ({
    ...run,
    isFinal: Boolean(run.isFinal) || undefined,
    notes: run.notes?.trim() || undefined,
    participantsSnapshot: normalizeParticipantsForStorage(run.participantsSnapshot)
  }));
}

export function createBlankParticipant(participants: Participant[]): Participant {
  const timestamp = new Date().toISOString();
  return {
    id: createParticipantId(participants),
    accessToken: createUniqueParticipantAccessToken(participants),
    cohort: readActiveCohort(),
    fullName: "",
    email: "",
    phone: "",
    institution: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
    experienceLevel: "beginner",
    primaryRole: "Frontend",
    secondaryRoles: [],
    technicalSkills: [],
    nonTechnicalSkills: [],
    tools: [],
    interests: [],
    projectIdeas: "",
    preferredTeamSize: 4,
    preferredTeammates: [],
    blockedTeammates: [],
    availability: ["weekend_morning"],
    personalStatement: "",
    consentToMatch: true,
    consentToShareContact: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function readActiveCohort(): string {
  if (typeof window === "undefined") return defaultCohort;
  return window.localStorage.getItem(activeCohortKey) || defaultCohort;
}

export function useHackMatchData() {
  const [participants, setParticipantsState] = useState<Participant[]>(demoParticipants);
  const [settings, setSettingsState] = useState<MatchingSettings>(demoMatchingSettings);
  const [savedMatchRuns, setSavedMatchRunsState] = useState<SavedMatchRun[]>([]);
  const [activeCohort, setActiveCohortState] = useState(defaultCohort);
  const [archivedCohorts, setArchivedCohortsState] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [persistenceMode, setPersistenceMode] = useState<"local" | "supabase">("local");
  const [persistenceWarning, setPersistenceWarning] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const localParticipants = normalizeParticipantsForStorage(readJson(participantsKey, demoParticipants));
      const localSettings = readJson(settingsKey, demoMatchingSettings);
      const localSavedRuns = normalizeSavedRunsForStorage(readJson(savedMatchRunsKey, []));
      const localActiveCohort = readActiveCohort();
      const localArchivedCohorts = normalizeArchivedCohorts(readJson(archivedCohortsKey, []));

      setParticipantsState(localParticipants);
      setSettingsState(localSettings);
      setSavedMatchRunsState(localSavedRuns);
      setActiveCohortState(localActiveCohort);
      setArchivedCohortsState(localArchivedCohorts);
      writeJson(participantsKey, localParticipants);
      writeJson(savedMatchRunsKey, localSavedRuns);
      writeJson(archivedCohortsKey, localArchivedCohorts);

      if (!isSupabaseConfigured()) {
        setPersistenceMode("local");
        setLoaded(true);
        return;
      }

      try {
        const [remoteParticipants, remoteSettings, remoteMatchRuns, remoteWorkspaceState] = await Promise.all([
          loadRemoteParticipants(),
          loadRemoteSettings(),
          loadRemoteMatchRuns(),
          loadRemoteWorkspaceState()
        ]);

        if (cancelled) return;

        if (remoteParticipants.length > 0) {
          const normalizedRemoteParticipants = normalizeParticipantsForStorage(remoteParticipants);
          setParticipantsState(normalizedRemoteParticipants);
          writeJson(participantsKey, normalizedRemoteParticipants);
        }
        if (remoteSettings) {
          setSettingsState(remoteSettings);
          writeJson(settingsKey, remoteSettings);
        }
        if (remoteMatchRuns.length > 0) {
          const normalizedRemoteRuns = normalizeSavedRunsForStorage(remoteMatchRuns);
          setSavedMatchRunsState(normalizedRemoteRuns);
          writeJson(savedMatchRunsKey, normalizedRemoteRuns);
        }
        if (remoteWorkspaceState) {
          const remoteActiveCohort = remoteWorkspaceState.activeCohort.trim() || defaultCohort;
          const remoteArchivedCohorts = normalizeArchivedCohorts(remoteWorkspaceState.archivedCohorts);
          setActiveCohortState(remoteActiveCohort);
          setArchivedCohortsState(remoteArchivedCohorts);
          window.localStorage.setItem(activeCohortKey, remoteActiveCohort);
          writeJson(archivedCohortsKey, remoteArchivedCohorts);
        }
        setPersistenceMode("supabase");
        setPersistenceWarning("");
      } catch {
        if (cancelled) return;
        setPersistenceMode("local");
        setPersistenceWarning("Supabase could not be reached; using local browser storage.");
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const api = useMemo(
    () => ({
      loaded,
      persistenceMode,
      persistenceWarning,
      participants,
      settings,
      savedMatchRuns,
      activeCohort,
      archivedCohorts,
      allCohorts: Array.from(new Set([defaultCohort, ...participants.map((participant) => participant.cohort || defaultCohort)])).sort(),
      cohorts: visibleCohorts(
        Array.from(new Set([defaultCohort, ...participants.map((participant) => participant.cohort || defaultCohort)])).sort(),
        archivedCohorts
      ),
      cohortParticipants:
        activeCohort === "All"
          ? participants
          : participants.filter((participant) => (participant.cohort || defaultCohort) === activeCohort),
      setActiveCohort(next: string) {
        const cleaned = next.trim() || defaultCohort;
        setActiveCohortState(cleaned);
        window.localStorage.setItem(activeCohortKey, cleaned);
        syncRemoteWorkspaceState(cleaned, archivedCohorts, setPersistenceWarning);
      },
      archiveCohort(cohort: string) {
        const cleaned = cohort.trim();
        if (!cleaned || cleaned === defaultCohort) return;
        const next = archiveCohortList(archivedCohorts, cleaned);
        setArchivedCohortsState(next);
        writeJson(archivedCohortsKey, next);
        const nextActiveCohort = activeCohort === cleaned ? defaultCohort : activeCohort;
        if (activeCohort === cleaned) {
          setActiveCohortState(defaultCohort);
          window.localStorage.setItem(activeCohortKey, defaultCohort);
        }
        syncRemoteWorkspaceState(nextActiveCohort, next, setPersistenceWarning);
      },
      restoreCohort(cohort: string) {
        const next = restoreCohortList(archivedCohorts, cohort);
        setArchivedCohortsState(next);
        writeJson(archivedCohortsKey, next);
        syncRemoteWorkspaceState(activeCohort, next, setPersistenceWarning);
      },
      setParticipants(next: Participant[]) {
        const normalized = normalizeParticipantsForStorage(next);
        setParticipantsState(normalized);
        writeJson(participantsKey, normalized);
        if (isSupabaseConfigured()) {
          void Promise.all(normalized.map((participant) => saveRemoteParticipant(participant)))
            .catch(() => setPersistenceWarning("Supabase save failed; local browser storage is still updated."));
        }
      },
      setSettings(next: MatchingSettings) {
        setSettingsState(next);
        writeJson(settingsKey, next);
        if (isSupabaseConfigured()) {
          void saveRemoteSettings(next)
            .catch(() => setPersistenceWarning("Supabase settings save failed; local browser storage is still updated."));
        }
      },
      saveParticipant(participant: Participant) {
        const timestamp = new Date().toISOString();
        const existingParticipants = participants.filter((item) => item.id !== participant.id);
        const accessToken = participant.accessToken?.trim();
        const accessTokenIsDuplicate = accessToken
          ? existingParticipants.some((item) => item.accessToken?.trim().toLowerCase() === accessToken.toLowerCase())
          : false;
        const cleaned: Participant = {
          ...participant,
          accessToken: accessToken && !accessTokenIsDuplicate
            ? accessToken
            : createUniqueParticipantAccessToken(existingParticipants),
          cohort: participant.cohort?.trim() || activeCohort || defaultCohort,
          fullName: participant.fullName.trim(),
          email: participant.email.trim(),
          primaryRole: participant.primaryRole.trim() || "Frontend",
          secondaryRoles: participant.secondaryRoles.filter(Boolean),
          technicalSkills: participant.technicalSkills.filter(Boolean),
          nonTechnicalSkills: participant.nonTechnicalSkills.filter(Boolean),
          tools: participant.tools.filter(Boolean),
          interests: participant.interests.filter(Boolean),
          preferredTeammates: participant.preferredTeammates.filter(Boolean),
          blockedTeammates: participant.blockedTeammates.filter(Boolean),
          availability: participant.availability.filter(Boolean) as AvailabilitySlot[],
          createdAt: participant.createdAt || timestamp,
          updatedAt: timestamp
        };
        const exists = participants.some((item) => item.id === cleaned.id);
        const next = exists
          ? participants.map((item) => (item.id === cleaned.id ? cleaned : item))
          : [...participants, cleaned];
        setParticipantsState(next);
        writeJson(participantsKey, next);
        if (isSupabaseConfigured()) {
          void saveRemoteParticipant(cleaned)
            .catch(() => setPersistenceWarning("Supabase participant save failed; local browser storage is still updated."));
        }
        return cleaned;
      },
      deleteParticipant(id: string) {
        const next = participants.filter((participant) => participant.id !== id);
        setParticipantsState(next);
        writeJson(participantsKey, next);
        if (isSupabaseConfigured()) {
          void deleteRemoteParticipant(id)
            .catch(() => setPersistenceWarning("Supabase delete failed; local browser storage is still updated."));
        }
      },
      saveMatchRun(result: MatchingResult, name?: string) {
        const run = createSavedMatchRun({
          result,
          participants,
          settings,
          activeCohort,
          savedRunCount: savedMatchRuns.length,
          name
        });
        const next = [run, ...savedMatchRuns].slice(0, 20);
        setSavedMatchRunsState(next);
        writeJson(savedMatchRunsKey, next);
        if (isSupabaseConfigured()) {
          void saveRemoteMatchRun(run)
            .catch(() => setPersistenceWarning("Supabase saved-run save failed; local browser storage is still updated."));
        }
        return run;
      },
      deleteMatchRun(id: string) {
        const next = savedMatchRuns.filter((run) => run.id !== id);
        setSavedMatchRunsState(next);
        writeJson(savedMatchRunsKey, next);
        if (isSupabaseConfigured()) {
          void deleteRemoteMatchRun(id)
            .catch(() => setPersistenceWarning("Supabase saved-run delete failed; local browser storage is still updated."));
        }
      },
      renameMatchRun(id: string, name: string) {
        const cleaned = name.trim();
        if (!cleaned) return;
        const next = savedMatchRuns.map((run) =>
          run.id === id ? { ...run, name: cleaned } : run
        );
        setSavedMatchRunsState(next);
        writeJson(savedMatchRunsKey, next);
        const updated = next.find((run) => run.id === id);
        if (updated && isSupabaseConfigured()) {
          void saveRemoteMatchRun(updated)
            .catch(() => setPersistenceWarning("Supabase saved-run rename failed; local browser storage is still updated."));
        }
      },
      updateMatchRunNotes(id: string, note: string) {
        const next = updateSavedRunNotes(savedMatchRuns, id, note);
        setSavedMatchRunsState(next);
        writeJson(savedMatchRunsKey, next);
        const updated = next.find((run) => run.id === id);
        if (updated && isSupabaseConfigured()) {
          void saveRemoteMatchRun(updated)
            .catch(() => setPersistenceWarning("Supabase saved-run notes save failed; local browser storage is still updated."));
        }
      },
      markMatchRunFinal(id: string) {
        const next = markFinalSavedRun(savedMatchRuns, id);
        setSavedMatchRunsState(next);
        writeJson(savedMatchRunsKey, next);
        if (isSupabaseConfigured()) {
          void Promise.all(next.map((run) => saveRemoteMatchRun(run)))
            .catch(() => setPersistenceWarning("Supabase final-run save failed; local browser storage is still updated."));
        }
      },
      clearFinalMatchRun() {
        const next = clearFinalSavedRun(savedMatchRuns);
        setSavedMatchRunsState(next);
        writeJson(savedMatchRunsKey, next);
        if (isSupabaseConfigured()) {
          void Promise.all(next.map((run) => saveRemoteMatchRun(run)))
            .catch(() => setPersistenceWarning("Supabase final-run clear failed; local browser storage is still updated."));
        }
      },
      duplicateMatchRun(id: string) {
        const source = savedMatchRuns.find((run) => run.id === id);
        if (!source) return undefined;
        const timestamp = new Date().toISOString();
        const copy: SavedMatchRun = {
          ...source,
          id: `run-${timestamp.replace(/[^0-9]/g, "")}`,
          name: `${source.name} copy`,
          createdAt: timestamp
        };
        const next = [copy, ...savedMatchRuns].slice(0, 20);
        setSavedMatchRunsState(next);
        writeJson(savedMatchRunsKey, next);
        if (isSupabaseConfigured()) {
          void saveRemoteMatchRun(copy)
            .catch(() => setPersistenceWarning("Supabase saved-run duplicate failed; local browser storage is still updated."));
        }
        return copy;
      },
      restoreMatchRunSnapshot(id: string) {
        const run = savedMatchRuns.find((item) => item.id === id);
        if (!run) return;
        const restoredParticipants = normalizeParticipantsForStorage(run.participantsSnapshot);
        const restoredSettings = run.settingsSnapshot;
        const restoredCohort = run.cohort || defaultCohort;

        setParticipantsState(restoredParticipants);
        setSettingsState(restoredSettings);
        setActiveCohortState(restoredCohort);
        writeJson(participantsKey, restoredParticipants);
        writeJson(settingsKey, restoredSettings);
        window.localStorage.setItem(activeCohortKey, restoredCohort);

        if (isSupabaseConfigured()) {
          void Promise.all([
            ...restoredParticipants.map((participant) => saveRemoteParticipant(participant)),
            saveRemoteSettings(restoredSettings)
          ]).catch(() => setPersistenceWarning("Supabase restore failed; local browser storage is still updated."));
        }
      },
      restoreLocalBackup(backup: HackMatchLocalBackup) {
        const restoredParticipants = normalizeParticipantsForStorage(backup.participants);
        const restoredRuns = normalizeSavedRunsForStorage(backup.savedMatchRuns);
        const restoredCohort = backup.activeCohort.trim() || defaultCohort;
        const restoredArchivedCohorts = normalizeArchivedCohorts(backup.archivedCohorts);

        setParticipantsState(restoredParticipants);
        setSettingsState(backup.settings);
        setSavedMatchRunsState(restoredRuns);
        setActiveCohortState(restoredCohort);
        setArchivedCohortsState(restoredArchivedCohorts);
        writeJson(participantsKey, restoredParticipants);
        writeJson(settingsKey, backup.settings);
        writeJson(savedMatchRunsKey, restoredRuns);
        writeJson(archivedCohortsKey, restoredArchivedCohorts);
        writeJson(teamReviewChecklistStorageKey, backup.teamReviewChecklist);
        window.localStorage.setItem(activeCohortKey, restoredCohort);
        syncRemoteWorkspaceState(restoredCohort, restoredArchivedCohorts, setPersistenceWarning);

        if (isSupabaseConfigured()) {
          void Promise.all([
            ...restoredParticipants.map((participant) => saveRemoteParticipant(participant)),
            ...restoredRuns.map((run) => saveRemoteMatchRun(run)),
            ...Object.entries(backup.teamReviewChecklist).map(([key, checklist]) =>
              saveRemoteTeamReviewChecklist(key, checklist)
            ),
            saveRemoteSettings(backup.settings)
          ]).catch(() => setPersistenceWarning("Backup restored locally; Supabase sync did not fully complete."));
        }
      },
      resetDemoData() {
        const normalizedDemoParticipants = normalizeParticipantsForStorage(demoParticipants);
        setParticipantsState(normalizedDemoParticipants);
        setSettingsState(demoMatchingSettings);
        setSavedMatchRunsState([]);
        setArchivedCohortsState([]);
        writeJson(participantsKey, normalizedDemoParticipants);
        writeJson(settingsKey, demoMatchingSettings);
        writeJson(savedMatchRunsKey, []);
        writeJson(archivedCohortsKey, []);
        syncRemoteWorkspaceState(activeCohort, [], setPersistenceWarning);
        if (isSupabaseConfigured()) {
          void Promise.all([
            ...normalizedDemoParticipants.map((participant) => saveRemoteParticipant(participant)),
            saveRemoteSettings(demoMatchingSettings)
          ]).catch(() => setPersistenceWarning("Supabase reset failed; local browser storage is still updated."));
        }
      }
    }),
    [activeCohort, archivedCohorts, loaded, participants, persistenceMode, persistenceWarning, savedMatchRuns, settings]
  );

  return api;
}
