import Link from "next/link";
import { ArrowRight, Users, SlidersHorizontal, Download } from "lucide-react";
import { Card } from "@/components/ui";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { generateTeams } from "@/lib/matching/algorithm";

export default function HomePage() {
  const result = generateTeams(demoParticipants, demoMatchingSettings);
  const assigned = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Deterministic hackathon matching
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Build balanced teams first. Explain them second.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            HackMatch AI creates repeatable team assignments using transparent
            constraints and scoring. AI explanations are isolated from the
            assignment algorithm.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/admin/matching">
              Generate teams <ArrowRight size={16} />
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" href="/participant/register">
              Register participant
            </Link>
          </div>
        </div>
        <Card className="grid grid-cols-2 gap-4">
          <Metric label="Participants" value={demoParticipants.length} icon={<Users size={18} />} />
          <Metric label="Assigned" value={assigned} icon={<Users size={18} />} />
          <Metric label="Teams" value={result.teams.length} icon={<SlidersHorizontal size={18} />} />
          <Metric label="CSV ready" value="Yes" icon={<Download size={18} />} />
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Deterministic core</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Same participant data and settings produce the same assignments every
            time.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Transparent scoring</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Each team gets a role, skill, experience, interest, availability,
            preference, and penalty breakdown.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Separated explanations</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The explanation layer summarizes generated teams without influencing
            assignments.
          </p>
        </Card>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-3 text-primary">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
