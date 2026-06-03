"use client";

import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import type {
  AvailabilitySlot,
  MatchingSettings,
  MatchingResult,
  Participant,
  SavedMatchRun
} from "@/lib/matching/types";
import {
  deleteRemoteParticipant,
  isSupabaseConfigured,
  loadRemoteParticipants,
  loadRemoteSettings,
  saveRemoteParticipant,
  saveRemoteSettings
} from "@/lib/supabase-store";
import { useEffect, useMemo, useState } from "react";

const participantsKey = "hackmatch.participants.v1";
const settingsKey = "hackmatch.settings.v1";
const savedMatchRunsKey = "hackmatch.savedMatchRuns.v1";
const activeCohortKey = "hackmatch.activeCohort.v1";
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

function ensureParticipantAccessToken(participant: Participant): Participant {
  return {
    ...participant,
    accessToken: participant.accessToken || createParticipantAccessToken(),
    cohort: participant.cohort?.trim() || defaultCohort
  };
}

function normalizeParticipantsForStorage(participants: Participant[]): Participant[] {
  return participants.map((participant) =>
    ensureParticipantAccessToken({
      ...participant,
      updatedAt: participant.updatedAt || new Date().toISOString()
    })
  );
}

function normalizeSavedRunsForStorage(runs: SavedMatchRun[]): SavedMatchRun[] {
  return runs.map((run) => ({
    ...run,
    participantsSnapshot: normalizeParticipantsForStorage(run.participantsSnapshot)
  }));
}

export function createBlankParticipant(participants: Participant[]): Participant {
  const timestamp = new Date().toISOString();
  return {
    id: createParticipantId(participants),
    accessToken: createParticipantAccessToken(),
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

      setParticipantsState(localParticipants);
      setSettingsState(localSettings);
      setSavedMatchRunsState(localSavedRuns);
      setActiveCohortState(localActiveCohort);
      writeJson(participantsKey, localParticipants);
      writeJson(savedMatchRunsKey, localSavedRuns);

      if (!isSupabaseConfigured()) {
        setPersistenceMode("local");
        setLoaded(true);
        return;
      }

      try {
        const [remoteParticipants, remoteSettings] = await Promise.all([
          loadRemoteParticipants(),
          loadRemoteSettings()
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
      cohorts: Array.from(new Set([defaultCohort, ...participants.map((participant) => participant.cohort || defaultCohort)])).sort(),
      cohortParticipants:
        activeCohort === "All"
          ? participants
          : participants.filter((participant) => (participant.cohort || defaultCohort) === activeCohort),
      setActiveCohort(next: string) {
        const cleaned = next.trim() || defaultCohort;
        setActiveCohortState(cleaned);
        window.localStorage.setItem(activeCohortKey, cleaned);
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
        const cleaned: Participant = {
          ...participant,
          accessToken: participant.accessToken || createParticipantAccessToken(),
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
        const timestamp = new Date().toISOString();
        const runParticipants =
          activeCohort === "All"
            ? participants
            : participants.filter((participant) => (participant.cohort || defaultCohort) === activeCohort);
        const assignedCount = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
        const scoredTeams = result.teams.filter((team) => typeof team.score?.totalScore === "number");
        const averageScore =
          scoredTeams.length > 0
            ? Math.round(scoredTeams.reduce((sum, team) => sum + (team.score?.totalScore ?? 0), 0) / scoredTeams.length)
            : 0;
        const run: SavedMatchRun = {
          id: `run-${timestamp.replace(/[^0-9]/g, "")}`,
          name: name?.trim() || `Match run ${savedMatchRuns.length + 1}`,
          createdAt: timestamp,
          participantCount: runParticipants.length,
          assignedCount,
          averageScore,
          settingsSnapshot: settings,
          cohort: activeCohort,
          participantsSnapshot: runParticipants,
          result
        };
        const next = [run, ...savedMatchRuns].slice(0, 20);
        setSavedMatchRunsState(next);
        writeJson(savedMatchRunsKey, next);
        return run;
      },
      deleteMatchRun(id: string) {
        const next = savedMatchRuns.filter((run) => run.id !== id);
        setSavedMatchRunsState(next);
        writeJson(savedMatchRunsKey, next);
      },
      renameMatchRun(id: string, name: string) {
        const cleaned = name.trim();
        if (!cleaned) return;
        const next = savedMatchRuns.map((run) =>
          run.id === id ? { ...run, name: cleaned } : run
        );
        setSavedMatchRunsState(next);
        writeJson(savedMatchRunsKey, next);
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
      resetDemoData() {
        const normalizedDemoParticipants = normalizeParticipantsForStorage(demoParticipants);
        setParticipantsState(normalizedDemoParticipants);
        setSettingsState(demoMatchingSettings);
        setSavedMatchRunsState([]);
        writeJson(participantsKey, normalizedDemoParticipants);
        writeJson(settingsKey, demoMatchingSettings);
        writeJson(savedMatchRunsKey, []);
        if (isSupabaseConfigured()) {
          void Promise.all([
            ...normalizedDemoParticipants.map((participant) => saveRemoteParticipant(participant)),
            saveRemoteSettings(demoMatchingSettings)
          ]).catch(() => setPersistenceWarning("Supabase reset failed; local browser storage is still updated."));
        }
      }
    }),
    [activeCohort, loaded, participants, persistenceMode, persistenceWarning, savedMatchRuns, settings]
  );

  return api;
}
