import Link from "next/link";
import { Card } from "@/components/ui";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { generateTeams } from "@/lib/matching/algorithm";

export default function AdminPage() {
  const result = generateTeams(demoParticipants, demoMatchingSettings);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <AdminLink href="/admin/participants" title="Participants" value={demoParticipants.length} />
        <AdminLink href="/admin/matching" title="Matching" value={`${result.teams.length} teams`} />
        <AdminLink href="/admin/teams" title="Export" value="CSV" />
      </div>
    </div>
  );
}

function AdminLink({ href, title, value }: { href: string; title: string; value: string | number }) {
  return (
    <Link href={href}>
      <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
      </Card>
    </Link>
  );
}
