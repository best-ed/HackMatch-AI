import type { MatchingResult, Participant, SavedMatchRun } from "@/lib/matching/types";

export type CohortHandoffPacket = {
  title: string;
  status: "ready" | "review";
  bullets: string[];
  text: string;
};

export function buildCohortHandoffPacket({
  cohort,
  participants,
  result,
  run
}: {
  cohort: string;
  participants: Participant[];
  result: MatchingResult;
  run?: SavedMatchRun;
}): CohortHandoffPacket {
  const assignedCount = result.teams.reduce((total, team) => total + team.participantIds.length, 0);
  const averageScore = result.teams.length
    ? Math.round(result.teams.reduce((total, team) => total + (team.score?.totalScore ?? 0), 0) / result.teams.length)
    : 0;
  const shareableContacts = participants.filter((participant) => participant.consentToShareContact).length;
  const hiddenContacts = participants.length - shareableContacts;
  const status = run?.isFinal && result.warnings.length === 0 ? "ready" : "review";
  const title = `${cohort} handoff packet`;
  const bullets = [
    `${result.teams.length} team${result.teams.length === 1 ? "" : "s"} generated with ${assignedCount}/${participants.length} participants assigned.`,
    `Average team score is ${averageScore}.`,
    result.warnings.length > 0
      ? `${result.warnings.length} matcher warning${result.warnings.length === 1 ? "" : "s"} should be reviewed before final handoff.`
      : "No matcher warnings are currently blocking handoff.",
    `${shareableContacts}/${participants.length} participant contact record${participants.length === 1 ? "" : "s"} are shareable to teammates.`,
    hiddenContacts > 0
      ? `${hiddenContacts} participant contact record${hiddenContacts === 1 ? "" : "s"} remain hidden by consent.`
      : "No participant contact records are hidden by consent."
  ];

  const text = [
    title,
    `Status: ${status === "ready" ? "Ready to share" : "Review before sharing"}`,
    run ? `Saved run: ${run.name}${run.isFinal ? " (final)" : ""}` : "Saved run: live generated teams",
    ...bullets.map((bullet) => `- ${bullet}`)
  ].join("\n");

  return {
    title,
    status,
    bullets,
    text
  };
}
