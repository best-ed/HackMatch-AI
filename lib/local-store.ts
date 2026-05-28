"use client";

import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import type {
  AvailabilitySlot,
  MatchingSettings,
  Participant
} from "@/lib/matching/types";
import { useEffect, useMemo, useState } from "react";

const participantsKey = "hackmatch.participants.v1";
const settingsKey = "hackmatch.settings.v1";

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

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

export function createBlankParticipant(participants: Participant[]): Participant {
  const timestamp = new Date().toISOString();
  return {
    id: createParticipantId(participants),
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

  useEffect(() => {
    setParticipantsState(readJson(participantsKey, demoParticipants));
    setSettingsState(readJson(settingsKey, demoMatchingSettings));
    setLoaded(true);
  }, []);

  const api = useMemo(
    () => ({
      loaded,
      participants,
      settings,
      setParticipants(next: Participant[]) {
        const normalized = next.map((participant) => ({
          ...participant,
          updatedAt: participant.updatedAt || new Date().toISOString()
        }));
        setParticipantsState(normalized);
        writeJson(participantsKey, normalized);
      },
      setSettings(next: MatchingSettings) {
        setSettingsState(next);
        writeJson(settingsKey, next);
      },
      saveParticipant(participant: Participant) {
        const timestamp = new Date().toISOString();
        const cleaned: Participant = {
          ...participant,
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
      },
      deleteParticipant(id: string) {
        const next = participants.filter((participant) => participant.id !== id);
        setParticipantsState(next);
        writeJson(participantsKey, next);
      },
      resetDemoData() {
        setParticipantsState(demoParticipants);
        setSettingsState(demoMatchingSettings);
        writeJson(participantsKey, demoParticipants);
        writeJson(settingsKey, demoMatchingSettings);
      }
    }),
    [loaded, participants, settings]
  );

  return api;
}
