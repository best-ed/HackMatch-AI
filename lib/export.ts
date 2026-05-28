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
