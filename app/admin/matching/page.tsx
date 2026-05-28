import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { generateTeams } from "@/lib/matching/algorithm";

export default function AdminMatchingPage() {
  const result = generateTeams(demoParticipants, demoMatchingSettings);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate teams</h1>
          <p className="mt-2 text-muted-foreground">
            Deterministic output from demo participants and current settings.
          </p>
        </div>
        <Link className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/admin/teams">
          View teams
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><Metric label="Desired size" value={demoMatchingSettings.desiredTeamSize} /></Card>
        <Card><Metric label="Max size" value={demoMatchingSettings.maxTeamSize} /></Card>
        <Card><Metric label="Unassigned" value={result.unassignedParticipants.length} /></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {result.teams.map((team) => (
          <Card key={team.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{team.name}</h2>
              <Badge>Score {team.score?.totalScore}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {team.participantIds.map((id) => demoParticipants.find((p) => p.id === id)?.fullName).join(", ")}
            </div>
          </Card>
        ))}
      </div>
      {result.warnings.length > 0 ? (
        <Card>
          <h2 className="font-semibold">Warnings</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </>
  );
}
