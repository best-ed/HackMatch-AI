"use client";

import Link from "next/link";
import { Download, Settings2, Users } from "lucide-react";
import { Card } from "@/components/ui";
import { useHackMatchData } from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";

export default function AdminPage() {
  const { participants, settings } = useHackMatchData();
  const result = generateTeams(participants, settings);
  const assigned = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Current editable data, deterministic team generation, and export readiness.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <AdminLink href="/admin/participants" title="Participants" value={participants.length} icon={<Users size={20} />} />
        <AdminLink href="/admin/matching" title="Matching" value={`${result.teams.length} teams`} icon={<Settings2 size={20} />} />
        <AdminLink href="/admin/teams" title="Assigned" value={assigned} icon={<Download size={20} />} />
      </div>
    </div>
  );
}

function AdminLink({
  href,
  title,
  value,
  icon
}: {
  href: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="mb-4 text-primary">{icon}</div>
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
      </Card>
    </Link>
  );
}
