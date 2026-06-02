import type { AvailabilitySlot, ExperienceLevel, Participant } from "@/lib/matching/types";

export type ParticipantImportMode = "skip" | "update";

export type ParticipantImportPlan = {
  participants: Participant[];
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  invalidCount: number;
  errors: string[];
  warnings: string[];
  rowPreviews: ParticipantImportRowPreview[];
};

export type ParticipantImportRowPreview = {
  rowNumber: number;
  fullName: string;
  email: string;
  action: "create" | "update" | "skip" | "error";
  duplicateName?: string;
  errors: string[];
  warnings: string[];
};

const availabilitySlots: AvailabilitySlot[] = [
  "weekday_morning",
  "weekday_afternoon",
  "weekday_evening",
  "weekend_morning",
  "weekend_afternoon",
  "weekend_evening"
];

const experienceLevels: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

function createImportParticipantId(participants: Participant[]): string {
  const max = participants.reduce((highest, participant) => {
    const numeric = Number(participant.id.replace(/\D/g, ""));
    return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest;
  }, 0);
  return `p${String(max + 1).padStart(2, "0")}`;
}

function createImportAccessToken(seed: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  const token = Array.from({ length: 6 }, (_, index) => alphabet[(hash + index * 17) % alphabet.length]).join("");
  return `hm-${token}`;
}

const columnAliases: Record<string, string> = {
  access: "access_token",
  access_token: "access_token",
  blocked: "blocked_teammates",
  blocked_teammates: "blocked_teammates",
  cohort: "cohort",
  consent_to_match: "consent_to_match",
  consent_to_share_contact: "consent_to_share_contact",
  created_at: "created_at",
  email: "email",
  experience: "experience_level",
  experience_level: "experience_level",
  full_name: "full_name",
  github: "github_url",
  github_url: "github_url",
  id: "participant_id",
  institution: "institution",
  interests: "interests",
  linkedin: "linkedin_url",
  linkedin_url: "linkedin_url",
  name: "full_name",
  non_technical_skills: "non_technical_skills",
  participant_id: "participant_id",
  personal_statement: "personal_statement",
  phone: "phone",
  portfolio: "portfolio_url",
  portfolio_url: "portfolio_url",
  preferred_team_size: "preferred_team_size",
  preferred_teammates: "preferred_teammates",
  primary_role: "primary_role",
  project_ideas: "project_ideas",
  role: "primary_role",
  secondary_roles: "secondary_roles",
  technical_skills: "technical_skills",
  tools: "tools",
  updated_at: "updated_at",
  availability: "availability"
};

function normalizeHeader(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return columnAliases[normalized] ?? normalized;
}

export function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function splitCsvList(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value: string, fallback: boolean): boolean {
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "no", "n", "0"].includes(normalized)) return false;
  return fallback;
}

function parseExperienceLevel(value: string): ExperienceLevel {
  const normalized = value.trim().toLowerCase();
  return experienceLevels.includes(normalized as ExperienceLevel)
    ? (normalized as ExperienceLevel)
    : "beginner";
}

function invalidAvailabilitySlots(value: string): string[] {
  return splitCsvList(value).filter((item) => !availabilitySlots.includes(item as AvailabilitySlot));
}

function parseAvailability(value: string): AvailabilitySlot[] {
  const slots = splitCsvList(value).filter((item): item is AvailabilitySlot =>
    availabilitySlots.includes(item as AvailabilitySlot)
  );
  return slots.length > 0 ? slots : ["weekend_morning"];
}

function getRowValue(row: Record<string, string>, key: string): string {
  return row[key]?.trim() ?? "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function findDuplicate(participant: Participant, participants: Participant[]): Participant | undefined {
  const email = participant.email.toLowerCase();
  const token = participant.accessToken?.toLowerCase();
  return participants.find((existing) => {
    if (participant.id && existing.id === participant.id) return true;
    if (email && existing.email.toLowerCase() === email) return true;
    if (token && existing.accessToken?.toLowerCase() === token) return true;
    return false;
  });
}

export function planParticipantCsvImport({
  csv,
  existingParticipants,
  activeCohort,
  mode = "skip",
  now = new Date().toISOString()
}: {
  csv: string;
  existingParticipants: Participant[];
  activeCohort: string;
  mode?: ParticipantImportMode;
  now?: string;
}): ParticipantImportPlan {
  const rows = parseCsvRows(csv);
  const errors: string[] = [];
  const warnings: string[] = [];
  const rowPreviews: ParticipantImportRowPreview[] = [];

  if (rows.length < 2) {
    return {
      participants: existingParticipants,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      invalidCount: 0,
      errors: ["CSV must include a header row and at least one participant row."],
      warnings,
      rowPreviews
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const planned = [...existingParticipants];
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let invalidCount = 0;

  rows.slice(1).forEach((cells, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const row = headers.reduce<Record<string, string>>((record, header, index) => {
      if (header) record[header] = cells[index] ?? "";
      return record;
    }, {});
    const fullName = getRowValue(row, "full_name");
    const email = getRowValue(row, "email");
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];

    if (!fullName) rowErrors.push("full_name is required.");
    if (!email) rowErrors.push("email is required.");
    if (email && !isValidEmail(email)) rowErrors.push("email must use a valid address format.");

    const rawExperience = getRowValue(row, "experience_level");
    if (rawExperience && !experienceLevels.includes(rawExperience.toLowerCase() as ExperienceLevel)) {
      rowErrors.push(`experience_level must be one of ${experienceLevels.join(", ")}.`);
    }

    const badAvailability = invalidAvailabilitySlots(getRowValue(row, "availability"));
    if (badAvailability.length > 0) {
      rowErrors.push(`availability contains invalid slot(s): ${badAvailability.join(", ")}.`);
    }

    if (!getRowValue(row, "primary_role")) rowWarnings.push("primary_role is missing; Frontend will be used.");
    if (!getRowValue(row, "technical_skills")) rowWarnings.push("technical_skills is empty.");
    if (!getRowValue(row, "consent_to_match")) rowWarnings.push("consent_to_match is missing; true will be used.");

    if (rowErrors.length > 0) {
      invalidCount += 1;
      errors.push(`Row ${rowNumber}: ${rowErrors.join(" ")}`);
      rowPreviews.push({
        rowNumber,
        fullName,
        email,
        action: "error",
        errors: rowErrors,
        warnings: rowWarnings
      });
      return;
    }

    const participant: Participant = {
      id: getRowValue(row, "participant_id") || createImportParticipantId(planned),
      accessToken: getRowValue(row, "access_token") || createImportAccessToken(`${email}-${rowNumber}`),
      cohort: getRowValue(row, "cohort") || activeCohort || "General",
      fullName,
      email,
      phone: getRowValue(row, "phone"),
      institution: getRowValue(row, "institution"),
      githubUrl: getRowValue(row, "github_url"),
      linkedinUrl: getRowValue(row, "linkedin_url"),
      portfolioUrl: getRowValue(row, "portfolio_url"),
      experienceLevel: parseExperienceLevel(getRowValue(row, "experience_level")),
      primaryRole: getRowValue(row, "primary_role") || "Frontend",
      secondaryRoles: splitCsvList(getRowValue(row, "secondary_roles")),
      technicalSkills: splitCsvList(getRowValue(row, "technical_skills")),
      nonTechnicalSkills: splitCsvList(getRowValue(row, "non_technical_skills")),
      tools: splitCsvList(getRowValue(row, "tools")),
      interests: splitCsvList(getRowValue(row, "interests")),
      projectIdeas: getRowValue(row, "project_ideas"),
      preferredTeamSize: Number(getRowValue(row, "preferred_team_size")) || 4,
      preferredTeammates: splitCsvList(getRowValue(row, "preferred_teammates")),
      blockedTeammates: splitCsvList(getRowValue(row, "blocked_teammates")),
      availability: parseAvailability(getRowValue(row, "availability")),
      personalStatement: getRowValue(row, "personal_statement"),
      consentToMatch: parseBoolean(getRowValue(row, "consent_to_match"), true),
      consentToShareContact: parseBoolean(getRowValue(row, "consent_to_share_contact"), false),
      createdAt: getRowValue(row, "created_at") || now,
      updatedAt: getRowValue(row, "updated_at") || now
    };

    const duplicate = findDuplicate(participant, planned);
    if (duplicate) {
      if (mode === "skip") {
        skippedCount += 1;
        rowPreviews.push({
          rowNumber,
          fullName,
          email,
          action: "skip",
          duplicateName: duplicate.fullName,
          errors: [],
          warnings: rowWarnings
        });
        return;
      }

      const updated: Participant = {
        ...duplicate,
        ...participant,
        id: duplicate.id,
        accessToken: participant.accessToken || duplicate.accessToken,
        cohort: participant.cohort || duplicate.cohort,
        createdAt: duplicate.createdAt,
        updatedAt: now
      };
      const duplicateIndex = planned.findIndex((item) => item.id === duplicate.id);
      planned[duplicateIndex] = updated;
      updatedCount += 1;
      rowPreviews.push({
        rowNumber,
        fullName,
        email,
        action: "update",
        duplicateName: duplicate.fullName,
        errors: [],
        warnings: rowWarnings
      });
      return;
    }

    planned.push(participant);
    createdCount += 1;
    rowPreviews.push({
      rowNumber,
      fullName,
      email,
      action: "create",
      errors: [],
      warnings: rowWarnings
    });
  });

  if (!headers.includes("cohort")) {
    warnings.push(`No cohort column found. New rows will use "${activeCohort || "General"}".`);
  }

  return {
    participants: planned,
    createdCount,
    updatedCount,
    skippedCount,
    invalidCount,
    errors,
    warnings,
    rowPreviews
  };
}
