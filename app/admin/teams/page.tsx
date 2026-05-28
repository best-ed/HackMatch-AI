import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { teamsToCsv } from "@/lib/export";
import { generateTeams } from "@/lib/matching/algorithm";

export default function AdminTeamsPage() {
  const result = generateTeams(demoParticipants, demoMatchingSettings);
  const csvPreview = teamsToCsv(result, demoParticipants).split("\n").slice(0, 4).join("\n");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generated teams</h1>
          <p className="mt-2 text-muted-foreground">Assignments, score breakdowns, explanations, and export.</p>
        </div>
        <Link className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/api/teams.csv">
          Download CSV
        </Link>
      </div>
      <div className="grid gap-5">
        {result.teams.map((team) => {
          const explanation = result.explanations.find((item) => item.teamId === team.id);
          return (
            <Card key={team.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{team.name}</h2>
                <Badge>Overall {team.score?.totalScore}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {team.participantIds.map((id) => {
                  const participant = demoParticipants.find((item) => item.id === id);
                  return participant ? (
                    <div key={id} className="rounded-md border border-border p-3">
                      <div className="font-medium">{participant.fullName}</div>
                      <div className="text-sm text-muted-foreground">{participant.primaryRole} · {participant.experienceLevel}</div>
                    </div>
                  ) : null;
                })}
              </div>
              {team.score ? (
                <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Score label="Role" value={team.score.roleCoverageScore} />
                  <Score label="Skill" value={team.score.skillCoverageScore} />
                  <Score label="Experience" value={team.score.experienceBalanceScore} />
                  <Score label="Interest" value={team.score.interestAlignmentScore} />
                  <Score label="Availability" value={team.score.availabilityCompatibilityScore} />
                  <Score label="Preferences" value={team.score.preferenceSatisfactionScore} />
                  <Score label="Penalty" value={team.score.constraintPenalty} />
                </div>
              ) : null}
              {explanation ? (
                <div className="rounded-md bg-muted p-4 text-sm">
                  <div className="font-semibold">Fallback explanation</div>
                  <p className="mt-1 text-muted-foreground">{explanation.summary}</p>
                  <p className="mt-2 text-muted-foreground">{explanation.suggestedProjectDirection}</p>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
      <Card>
        <h2 className="font-semibold">CSV preview</h2>
        <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-xs text-white">{csvPreview}</pre>
      </Card>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="font-semibold">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
