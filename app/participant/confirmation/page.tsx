"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SectionTrail } from "@/components/section-trail";
import { Badge, Button, Card } from "@/components/ui";
import { clipboardStatusMessage, copyTextToClipboard } from "@/lib/clipboard";
import {
  readCurrentParticipantLookup,
  useHackMatchData,
  writeCurrentParticipantLookup
} from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";

export default function ParticipantConfirmationPage() {
  const { participants, settings } = useHackMatchData();
  const [lookup, setLookup] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

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
  const cohortParticipants = participant
    ? participants.filter((item) => (item.cohort ?? "General") === (participant.cohort ?? "General"))
    : participants;
  const result = useMemo(
    () => generateTeams(cohortParticipants, settings),
    [cohortParticipants, settings]
  );
  const assignedTeam = participant?.consentToMatch
    ? result.teams.find((team) => team.participantIds.includes(participant.id))
    : undefined;
  const isUnassigned = participant ? result.unassignedParticipants.includes(participant.id) : false;

  async function copyAccessLink() {
    const result = await copyTextToClipboard(absoluteTeamUrl);
    setCopyStatus(clipboardStatusMessage(result, "Access link copied."));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <SectionTrail items={[{ href: "/participant", label: "Participant" }, { label: "Confirmation" }]} />
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
              {copyStatus ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800" role="status">
                  {copyStatus}
                </div>
              ) : null}
              <Link className="rounded-md border border-border bg-white px-4 py-2 text-center text-sm font-semibold" href={teamUrl}>
                View my team
              </Link>
              <Link className="rounded-md border border-border bg-white px-4 py-2 text-center text-sm font-semibold" href="/participant/register">
                Register another participant
              </Link>
            </div>
          </Card>
          <Card className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Assignment status</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Status is based on the current local participant data and matching settings.
                </p>
              </div>
              <Badge className={assignmentBadgeClass(Boolean(assignedTeam), Boolean(participant.consentToMatch), isUnassigned)}>
                {assignmentLabel(Boolean(assignedTeam), Boolean(participant.consentToMatch), isUnassigned)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {assignmentDetail(assignedTeam?.name, Boolean(participant.consentToMatch), isUnassigned)}
            </p>
            {assignedTeam ? (
              <Link className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={teamUrl}>
                Open {assignedTeam.name}
              </Link>
            ) : null}
          </Card>
        </div>
      ) : (
        <Card className="space-y-4">
          <h2 className="font-semibold">Registration not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Confirmation is only shown after registration or from a valid saved access token. The current browser lookup did not match a local participant.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link className="rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground" href="/participant/register">
              Register participant
            </Link>
            <Link className="rounded-md border border-border bg-white px-4 py-2 text-center text-sm font-semibold" href="/participant/team">
              Open team lookup
            </Link>
          </div>
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

function assignmentLabel(hasTeam: boolean, hasConsent: boolean, isUnassigned: boolean) {
  if (!hasConsent) return "Not matchable";
  if (hasTeam) return "Team ready";
  if (isUnassigned) return "Unassigned";
  return "Waiting";
}

function assignmentDetail(teamName: string | undefined, hasConsent: boolean, isUnassigned: boolean) {
  if (!hasConsent) return "This profile is saved, but matching consent is off, so organizers will not place it on a team.";
  if (teamName) return `Current deterministic matching places this participant on ${teamName}.`;
  if (isUnassigned) return "Current matching settings leave this participant unassigned. Organizers may adjust cohort size or constraints.";
  return "No team assignment is visible yet. Return with this access link after organizers review the cohort.";
}

function assignmentBadgeClass(hasTeam: boolean, hasConsent: boolean, isUnassigned: boolean) {
  if (!hasConsent || isUnassigned) return "bg-amber-100 text-amber-800";
  if (hasTeam) return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-800";
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
