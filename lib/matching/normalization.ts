import type { NormalizedParticipant, Participant } from "./types";

const roleAliases: Record<string, string> = {
  frontend: "builder",
  "front-end": "builder",
  backend: "builder",
  "back-end": "builder",
  "full stack": "builder",
  fullstack: "builder",
  developer: "builder",
  engineer: "builder",
  design: "designer",
  ui: "designer",
  ux: "designer",
  product: "product",
  pm: "product",
  presenter: "presenter",
  pitch: "presenter",
  marketing: "presenter",
  data: "data",
  ai: "data",
  ml: "data"
};

export function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function normalizeRole(role: string): string {
  const normalized = normalizeToken(role);
  return roleAliases[normalized] ?? normalized;
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeToken).filter(Boolean))).sort();
}

export function normalizeParticipant(
  participant: Participant
): NormalizedParticipant {
  return {
    ...participant,
    normalizedPrimaryRole: normalizeRole(participant.primaryRole),
    normalizedSecondaryRoles: uniqueSorted(participant.secondaryRoles).map(normalizeRole),
    normalizedTechnicalSkills: uniqueSorted(participant.technicalSkills),
    normalizedNonTechnicalSkills: uniqueSorted(participant.nonTechnicalSkills),
    normalizedTools: uniqueSorted(participant.tools),
    normalizedInterests: uniqueSorted(participant.interests)
  };
}

export function normalizeParticipants(
  participants: Participant[]
): NormalizedParticipant[] {
  return participants.map(normalizeParticipant).sort((a, b) => a.id.localeCompare(b.id));
}
