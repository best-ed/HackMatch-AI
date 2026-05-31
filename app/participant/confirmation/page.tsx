"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import {
  readCurrentParticipantLookup,
  useHackMatchData,
  writeCurrentParticipantLookup
} from "@/lib/local-store";

export default function ParticipantConfirmationPage() {
  const { participants } = useHackMatchData();
  const [lookup, setLookup] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get("access") ?? readCurrentParticipantLookup();
    setLookup(access);
    if (access) {
      writeCurrentParticipantLookup(access);
    }
  }, []);

  const participant = useMemo(() => {
    const normalizedLookup = normalizeLookupValue(lookup);
    if (!normalizedLookup) return undefined;
    return participants.find((item) =>
      [item.accessToken ?? "", item.id, item.email, item.fullName].some((value) =>
        normalizeLookupValue(value).includes(normalizedLookup)
      )
    );
  }, [lookup, participants]);

  const teamUrl = participant?.accessToken
    ? `/participant/team?access=${encodeURIComponent(participant.accessToken)}`
    : "/participant/team";
  const absoluteTeamUrl =
    typeof window === "undefined" ? teamUrl : new URL(teamUrl, window.location.origin).toString();

  async function copyAccessLink() {
    await navigator.clipboard?.writeText(absoluteTeamUrl);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Badge className="bg-emerald-100 text-emerald-800">Registration saved</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">You&apos;re registered</h1>
        <p className="mt-2 text-muted-foreground">
          Keep this access link. It is the easiest way to return to your team assignment once organizers generate teams.
        </p>
      </div>

      {participant ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold">{participant.fullName}</h2>
              <p className="text-sm text-muted-foreground">{participant.email}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Cohort" value={participant.cohort ?? "General"} />
              <Detail label="Primary role" value={participant.primaryRole} />
              <Detail label="Experience" value={participant.experienceLevel} />
              <Detail label="Access code" value={participant.accessToken ?? "Not generated"} />
            </div>
            <div className="flex flex-wrap gap-2">
              {participant.technicalSkills.slice(0, 6).map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <h2 className="font-semibold">Access link</h2>
              <p className="mt-2 break-all rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {absoluteTeamUrl}
              </p>
            </div>
            <div className="grid gap-2">
              <Button onClick={copyAccessLink} type="button">Copy access link</Button>
              <Link className="rounded-md border border-border bg-white px-4 py-2 text-center text-sm font-semibold" href={teamUrl}>
                View my team
              </Link>
              <Link className="rounded-md border border-border bg-white px-4 py-2 text-center text-sm font-semibold" href="/participant/register">
                Register another participant
              </Link>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <h2 className="font-semibold">Registration not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The saved access token did not match a local participant. Try registering again or open the team page with your access link.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">What happens next?</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Step label="1" text="Organizers review participants and choose the active cohort." />
          <Step label="2" text="Teams are generated deterministically from that cohort." />
          <Step label="3" text="Return with your access link to see your assignment." />
        </div>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function Step({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {label}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
