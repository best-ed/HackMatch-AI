import { Badge, Card } from "@/components/ui";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { generateTeams } from "@/lib/matching/algorithm";

export default function ParticipantTeamPage() {
  const result = generateTeams(demoParticipants, demoMatchingSettings);
  const participant = demoParticipants[0];
  const team = result.teams.find((candidate) =>
    candidate.participantIds.includes(participant.id)
  );
  const members = team
    ? team.participantIds.map((id) => demoParticipants.find((p) => p.id === id)).filter(Boolean)
    : [];
  const explanation = result.explanations.find((item) => item.teamId === team?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My team</h1>
        <p className="mt-2 text-muted-foreground">
          Demo participant: {participant.fullName}
        </p>
      </div>
      {team ? (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{team.name}</h2>
            <Badge>Score {team.score?.totalScore}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((member) =>
              member ? (
                <div key={member.id} className="rounded-md border border-border p-4">
                  <div className="font-medium">{member.fullName}</div>
                  <div className="text-sm text-muted-foreground">
                    {member.primaryRole} · {member.experienceLevel}
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
