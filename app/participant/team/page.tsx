"use client";

import { Badge, Card } from "@/components/ui";
import { useHackMatchData } from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";

export default function ParticipantTeamPage() {
  const { participants, settings } = useHackMatchData();
  const result = generateTeams(participants, settings);
  const participant = participants.find((item) => item.consentToMatch) ?? participants[0];
  const team = participant
    ? result.teams.find((candidate) => candidate.participantIds.includes(participant.id))
    : undefined;
  const members = team
    ? team.participantIds.map((id) => participants.find((p) => p.id === id)).filter(Boolean)
    : [];
  const explanation = result.explanations.find((item) => item.teamId === team?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My team</h1>
        <p className="mt-2 text-muted-foreground">
          Showing the first matchable participant in the editable data set.
        </p>
      </div>
      {team && participant ? (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{team.name}</h2>
              <p className="text-sm text-muted-foreground">Participant: {participant.fullName}</p>
            </div>
            <Badge>Score {team.score?.totalScore}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((member) =>
              member ? (
                <div key={member.id} className="rounded-md border border-border p-4">
                  <div className="font-medium">{member.fullName}</div>
                  <div className="text-sm text-muted-foreground">
                    {member.primaryRole} - {member.experienceLevel}
                  </div>
                </div>
              ) : null
            )}
          </div>
          {explanation ? (
            <div>
              <h3 className="font-semibold">Explanation</h3>
              <p className="mt-2 text-sm text-muted-foreground">{explanation.summary}</p>
            </div>
          ) : null}
        </Card>
      ) : (
        <Card>No team assignment found.</Card>
      )}
    </div>
  );
}
