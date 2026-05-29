"use client";

import type {
  AvailabilitySlot,
  ExperienceLevel,
  MatchingSettings,
  Participant
} from "@/lib/matching/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type ParticipantRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  institution: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  experience_level: ExperienceLevel;
  primary_role: string;
  secondary_roles: string[];
  technical_skills: string[];
  non_technical_skills: string[];
  tools: string[];
  interests: string[];
  project_ideas: string | null;
  preferred_team_size: number | null;
  preferred_teammates: string[];
  blocked_teammates: string[];
  availability: AvailabilitySlot[];
  personal_statement: string | null;
  consent_to_match: boolean;
  consent_to_share_contact: boolean;
  created_at: string;
  updated_at: string;
};

type SettingsRow = {
  id: "default";
  desired_team_size: number;
  min_team_size: number;
  max_team_size: number;
  number_of_teams: number | null;
  allow_unassigned_participants: boolean;
  require_builder: boolean;
  require_presenter: boolean;
  prevent_beginner_only_teams: boolean;
  distribute_advanced_participants: boolean;
  weights: MatchingSettings["weights"];
  updated_at: string;
};

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function loadRemoteParticipants(): Promise<Participant[]> {
  const rows = await supabaseRequest<ParticipantRow[]>(
    "/participants?select=*&order=created_at.asc"
  );
  return rows.map(rowToParticipant);
}

export async function saveRemoteParticipant(participant: Participant) {
  await supabaseRequest<ParticipantRow[]>(
    "/participants?on_conflict=id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([participantToRow(participant)])
    }
  );
}

export async function deleteRemoteParticipant(id: string) {
  await supabaseRequest(`/participants?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export async function loadRemoteSettings(): Promise<MatchingSettings | undefined> {
  const rows = await supabaseRequest<SettingsRow[]>(
    "/matching_settings?id=eq.default&select=*&limit=1"
  );
  return rows[0] ? rowToSettings(rows[0]) : undefined;
}

export async function saveRemoteSettings(settings: MatchingSettings) {
  await supabaseRequest<SettingsRow[]>(
    "/matching_settings?on_conflict=id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([settingsToRow(settings)])
    }
  );
}

async function supabaseRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${supabaseAnonKey}`,
      "content-type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function rowToParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? "",
    institution: row.institution ?? "",
    githubUrl: row.github_url ?? "",
    linkedinUrl: row.linkedin_url ?? "",
    portfolioUrl: row.portfolio_url ?? "",
    experienceLevel: row.experience_level,
    primaryRole: row.primary_role,
    secondaryRoles: row.secondary_roles ?? [],
    technicalSkills: row.technical_skills ?? [],
    nonTechnicalSkills: row.non_technical_skills ?? [],
    tools: row.tools ?? [],
    interests: row.interests ?? [],
    projectIdeas: row.project_ideas ?? "",
    preferredTeamSize: row.preferred_team_size ?? undefined,
    preferredTeammates: row.preferred_teammates ?? [],
    blockedTeammates: row.blocked_teammates ?? [],
    availability: row.availability ?? [],
    personalStatement: row.personal_statement ?? "",
    consentToMatch: row.consent_to_match,
    consentToShareContact: row.consent_to_share_contact,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function participantToRow(participant: Participant): ParticipantRow {
  return {
    id: participant.id,
    full_name: participant.fullName,
    email: participant.email,
    phone: participant.phone ?? null,
    institution: participant.institution ?? null,
    github_url: participant.githubUrl ?? null,
    linkedin_url: participant.linkedinUrl ?? null,
    portfolio_url: participant.portfolioUrl ?? null,
    experience_level: participant.experienceLevel,
    primary_role: participant.primaryRole,
    secondary_roles: participant.secondaryRoles,
    technical_skills: participant.technicalSkills,
    non_technical_skills: participant.nonTechnicalSkills,
    tools: participant.tools,
    interests: participant.interests,
    project_ideas: participant.projectIdeas ?? null,
    preferred_team_size: participant.preferredTeamSize ?? null,
    preferred_teammates: participant.preferredTeammates,
    blocked_teammates: participant.blockedTeammates,
    availability: participant.availability,
    personal_statement: participant.personalStatement ?? null,
    consent_to_match: participant.consentToMatch,
    consent_to_share_contact: participant.consentToShareContact,
    created_at: participant.createdAt,
    updated_at: participant.updatedAt
  };
}

function rowToSettings(row: SettingsRow): MatchingSettings {
  return {
    desiredTeamSize: row.desired_team_size,
    minTeamSize: row.min_team_size,
    maxTeamSize: row.max_team_size,
    numberOfTeams: row.number_of_teams ?? undefined,
    allowUnassignedParticipants: row.allow_unassigned_participants,
    requireBuilder: row.require_builder,
    requirePresenter: row.require_presenter,
    preventBeginnerOnlyTeams: row.prevent_beginner_only_teams,
    distributeAdvancedParticipants: row.distribute_advanced_participants,
    weights: row.weights
  };
}

function settingsToRow(settings: MatchingSettings): SettingsRow {
  return {
    id: "default",
    desired_team_size: settings.desiredTeamSize,
    min_team_size: settings.minTeamSize,
    max_team_size: settings.maxTeamSize,
    number_of_teams: settings.numberOfTeams ?? null,
    allow_unassigned_participants: settings.allowUnassignedParticipants,
    require_builder: settings.requireBuilder,
    require_presenter: settings.requirePresenter,
    prevent_beginner_only_teams: settings.preventBeginnerOnlyTeams,
    distribute_advanced_participants: settings.distributeAdvancedParticipants,
    weights: settings.weights,
    updated_at: new Date().toISOString()
  };
}
