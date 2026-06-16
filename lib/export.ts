import type { MatchingResult, Participant } from "@/lib/matching/types";

export type TeamCsvScope = "live" | "saved";

export type TeamCsvArtifact = {
  assignedCount: number;
  cohort: string;
  csv: string;
  filename: string;
  scope: TeamCsvScope;
};

function csvEscape(value: string | number | boolean | undefined): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function slugifyFilenamePart(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "general";
}

export function exportDateStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function hackMatchCsvFilename({
  cohort,
  date = new Date(),
  kind,
  scope
}: {
  cohort?: string;
  date?: Date;
  kind: "participants" | "teams" | "access-links" | "participant-import-template";
  scope?: "all" | "filtered" | "live" | "saved";
}): string {
  const parts = [
    "hackmatch",
    slugifyFilenamePart(cohort ?? "general"),
    kind,
    scope,
    exportDateStamp(date)
  ].filter(Boolean);
  return `${parts.join("-")}.csv`;
}

export function teamsToCsv(
  result: MatchingResult,
  participants: Participant[]
): string {
  const byId = new Map(participants.map((participant) => [participant.id, participant]));
  const rows = [
    [
      "team_id",
      "team_name",
      "team_score",
      "participant_id",
      "full_name",
      "email",
      "primary_role",
      "experience_level",
      "contact_shared"
    ]
  ];

  for (const team of result.teams) {
    for (const participantId of team.participantIds) {
      const participant = byId.get(participantId);
      rows.push([
        team.id,
        team.name,
        String(team.score?.totalScore ?? ""),
        participantId,
        participant?.fullName ?? "",
        participant?.consentToShareContact ? (participant.email ?? "") : "",
        participant?.primaryRole ?? "",
        participant?.experienceLevel ?? "",
        String(participant?.consentToShareContact ?? false)
      ]);
    }
  }

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function buildTeamCsvArtifact({
  cohort,
  date = new Date(),
  participants,
  result,
  scope = "live"
}: {
  cohort?: string;
  date?: Date;
  participants: Participant[];
  result: MatchingResult;
  scope?: TeamCsvScope;
}): TeamCsvArtifact {
  const resolvedCohort = cohort?.trim() || "General";
  const assignedCount = result.teams.reduce((total, team) => total + team.participantIds.length, 0);

  return {
    assignedCount,
    cohort: resolvedCohort,
    csv: teamsToCsv(result, participants),
    filename: hackMatchCsvFilename({
      cohort: resolvedCohort,
      date,
      kind: "teams",
      scope
    }),
    scope
  };
}

export function participantsToCsv(participants: Participant[]): string {
  const rows = [
    [
      "participant_id",
      "access_token",
      "cohort",
      "full_name",
      "email",
      "phone",
      "institution",
      "github_url",
      "linkedin_url",
      "portfolio_url",
      "experience_level",
      "primary_role",
      "secondary_roles",
      "technical_skills",
      "non_technical_skills",
      "tools",
      "interests",
      "project_ideas",
      "preferred_team_size",
      "preferred_teammates",
      "blocked_teammates",
      "availability",
      "personal_statement",
      "consent_to_match",
      "consent_to_share_contact",
      "created_at",
      "updated_at"
    ]
  ];

  for (const participant of participants) {
    rows.push([
      participant.id,
      participant.accessToken ?? "",
      participant.cohort ?? "General",
      participant.fullName,
      participant.email,
      participant.phone ?? "",
      participant.institution ?? "",
      participant.githubUrl ?? "",
      participant.linkedinUrl ?? "",
      participant.portfolioUrl ?? "",
      participant.experienceLevel,
      participant.primaryRole,
      participant.secondaryRoles.join("; "),
      participant.technicalSkills.join("; "),
      participant.nonTechnicalSkills.join("; "),
      participant.tools.join("; "),
      participant.interests.join("; "),
      participant.projectIdeas ?? "",
      String(participant.preferredTeamSize ?? ""),
      participant.preferredTeammates.join("; "),
      participant.blockedTeammates.join("; "),
      participant.availability.join("; "),
      participant.personalStatement ?? "",
      String(participant.consentToMatch),
      String(participant.consentToShareContact),
      participant.createdAt,
      participant.updatedAt
    ]);
  }

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function participantImportTemplateCsv(): string {
  const rows = [
    [
      "full_name",
      "email",
      "cohort",
      "phone",
      "institution",
      "github_url",
      "linkedin_url",
      "portfolio_url",
      "experience_level",
      "primary_role",
      "secondary_roles",
      "technical_skills",
      "non_technical_skills",
      "tools",
      "interests",
      "project_ideas",
      "preferred_team_size",
      "preferred_teammates",
      "blocked_teammates",
      "availability",
      "personal_statement",
      "consent_to_match",
      "consent_to_share_contact"
    ],
    [
      "Maya Okafor",
      "maya.okafor@example.com",
      "General",
      "+1 555 0100",
      "State University",
      "https://github.com/mayaokafor",
      "https://linkedin.com/in/mayaokafor",
      "https://mayaokafor.dev",
      "intermediate",
      "Full Stack",
      "Backend; Product",
      "React; TypeScript; PostgreSQL",
      "Pitching; User research",
      "Figma; Supabase",
      "Climate tech; Civic tech",
      "A lightweight tool for local community reporting",
      "4",
      "Jordan Lee",
      "",
      "weekday_evening; weekend_morning",
      "I like turning fuzzy problem statements into practical demos.",
      "true",
      "true"
    ]
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function participantLinksToCsv(
  participants: Participant[],
  origin: string
): string {
  const rows = [
    [
      "participant_id",
      "full_name",
      "email",
      "cohort",
      "access_token",
      "team_link"
    ]
  ];

  for (const participant of participants) {
    const accessToken = participant.accessToken ?? "";
    rows.push([
      participant.id,
      participant.fullName,
      participant.email,
      participant.cohort ?? "General",
      accessToken,
      accessToken ? `${origin}/participant/team?access=${encodeURIComponent(accessToken)}` : ""
    ]);
  }

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
