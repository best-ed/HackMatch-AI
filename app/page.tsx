"use client";

import Link from "next/link";
import { ArrowRight, Users, SlidersHorizontal, Download } from "lucide-react";
import { Card } from "@/components/ui";
import { useHackMatchData } from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";

export default function HomePage() {
  const { participants, settings } = useHackMatchData();
  const result = generateTeams(participants, settings);
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
            Edit participants and settings in this browser, then regenerate teams to test real viability before adding production persistence.
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
          <Metric label="Participants" value={participants.length} icon={<Users size={18} />} />
          <Metric label="Assigned" value={assigned} icon={<Users size={18} />} />
          <Metric label="Teams" value={result.teams.length} icon={<SlidersHorizontal size={18} />} />
          <Metric label="CSV ready" value="Yes" icon={<Download size={18} />} />
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Editable MVP data</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add, edit, delete, and reset participants locally while preserving deterministic output.
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
          <h2 className="font-semibold">Viability checks</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Change team size, weights, consent, and participant profiles to see warnings and score movement.
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
