"use client";

import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import type {
  AvailabilitySlot,
  MatchingSettings,
  Participant
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
const currentParticipantKey = "hackmatch.currentParticipant.v1";

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
    accessToken: participant.accessToken || createParticipantAccessToken()
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

export function createBlankParticipant(participants: Participant[]): Participant {
  const timestamp = new Date().toISOString();
  return {
    id: createParticipantId(participants),
    accessToken: createParticipantAccessToken(),
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

export function useHackMatchData() {
  const [participants, setParticipantsState] = useState<Participant[]>(demoParticipants);
  const [settings, setSettingsState] = useState<MatchingSettings>(demoMatchingSettings);
  const [loaded, setLoaded] = useState(false);
  const [persistenceMode, setPersistenceMode] = useState<"local" | "supabase">("local");
  const [persistenceWarning, setPersistenceWarning] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const localParticipants = normalizeParticipantsForStorage(readJson(participantsKey, demoParticipants));
      const localSettings = readJson(settingsKey, demoMatchingSettings);

      setParticipantsState(localParticipants);
      setSettingsState(localSettings);
      writeJson(participantsKey, localParticipants);

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
      resetDemoData() {
        const normalizedDemoParticipants = normalizeParticipantsForStorage(demoParticipants);
        setParticipantsState(normalizedDemoParticipants);
        setSettingsState(demoMatchingSettings);
        writeJson(participantsKey, normalizedDemoParticipants);
        writeJson(settingsKey, demoMatchingSettings);
        if (isSupabaseConfigured()) {
          void Promise.all([
            ...normalizedDemoParticipants.map((participant) => saveRemoteParticipant(participant)),
            saveRemoteSettings(demoMatchingSettings)
          ]).catch(() => setPersistenceWarning("Supabase reset failed; local browser storage is still updated."));
        }
      }
    }),
    [loaded, participants, persistenceMode, persistenceWarning, settings]
  );

  return api;
}
