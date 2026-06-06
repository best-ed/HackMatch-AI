import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, Search } from "lucide-react";
import { Badge, Card } from "@/components/ui";

const participantActions = [
  {
    href: "/participant/register",
    title: "Register for matching",
    detail: "Submit role, skill, availability, consent, and cohort details.",
    icon: <ClipboardList size={18} />
  },
  {
    href: "/participant/team",
    title: "Find my team",
    detail: "Use an access code, email, name, or ID to preview the deterministic assignment.",
    icon: <Search size={18} />
  }
];

export default function ParticipantPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Participant portal</h1>
          <p className="mt-2 text-muted-foreground">
            Register for a cohort or return with an access link to view your generated team.
          </p>
        </div>
        <Badge>Participant flow</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {participantActions.map((action) => (
          <Link
            className="group block rounded-lg outline-none ring-primary/20 transition focus-visible:ring-4"
            href={action.href}
            key={action.href}
          >
            <Card className="h-full space-y-4 transition group-hover:-translate-y-0.5 group-hover:border-primary/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                {action.icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{action.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{action.detail}</p>
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Continue <ArrowRight size={16} />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="flex flex-wrap items-start gap-3 bg-emerald-50 text-emerald-950">
        <CheckCircle2 className="mt-0.5 text-emerald-700" size={20} />
        <div>
          <h2 className="font-semibold">Deterministic by design</h2>
          <p className="mt-1 text-sm leading-relaxed text-emerald-900/80">
            Team assignments come from the matching algorithm and saved participant data. AI explanations can describe a team, but they do not decide placement.
          </p>
        </div>
      </Card>
    </div>
  );
}
