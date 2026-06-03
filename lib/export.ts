import type { MatchingResult, Participant } from "@/lib/matching/types";

function csvEscape(value: string | number | boolean | undefined): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
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
