"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, Search, UserRoundCheck } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { readCurrentParticipantLookup, useHackMatchData } from "@/lib/local-store";

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
  const { participants } = useHackMatchData();
  const [savedLookup, setSavedLookup] = useState("");

  useEffect(() => {
    setSavedLookup(readCurrentParticipantLookup());
  }, []);

  const savedParticipant = useMemo(() => {
    const normalizedLookup = normalizeLookupValue(savedLookup);
    if (!normalizedLookup) return undefined;
    return participants.find((participant) =>
      [
        participant.accessToken ?? "",
        participant.id,
        participant.fullName,
        participant.email,
        participant.email.split("@")[0]
      ].some((value) => normalizeLookupValue(value).includes(normalizedLookup))
    );
  }, [participants, savedLookup]);

  const teamHref = savedLookup
    ? `/participant/team?access=${encodeURIComponent(savedLookup)}`
    : "/participant/team";

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

      <Card className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <UserRoundCheck size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold">Return to your team</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {savedParticipant
                ? `This browser remembers ${savedParticipant.fullName} from ${savedParticipant.cohort ?? "General"}.`
                : savedLookup
                  ? "This browser has a saved lookup value. Open team lookup to check whether it still matches a participant."
                  : "No participant lookup is saved in this browser yet."}
            </p>
            {savedLookup ? (
              <p className="mt-2 break-all text-xs font-medium text-muted-foreground">
                Saved lookup: {savedLookup}
              </p>
            ) : null}
          </div>
        </div>
        <Link
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          href={teamHref}
        >
          Open team lookup <ArrowRight size={16} />
        </Link>
      </Card>

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

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
