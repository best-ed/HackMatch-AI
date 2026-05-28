"use client";

import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Download,
  Gauge,
  Sparkles,
  Users
} from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { useHackMatchData } from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";
import type { Participant } from "@/lib/matching/types";

export default function HomePage() {
  const { participants, settings } = useHackMatchData();
  const result = generateTeams(participants, settings);
  const assigned = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  const previewTeams = result.teams.slice(0, 3);
  const focusTeam = result.teams[0];
  const focusExplanation = result.explanations.find((item) => item.teamId === focusTeam?.id);
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
  const averageScore =
    result.teams.length > 0
      ? Math.round(result.teams.reduce((sum, team) => sum + (team.score?.totalScore ?? 0), 0) / result.teams.length)
      : 0;
  const readiness = Math.round(
    ((assigned / Math.max(1, participants.filter((participant) => participant.consentToMatch).length)) * 0.5 +
      (averageScore / 100) * 0.5) *
      100
  );

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="min-w-0 space-y-6 rounded-lg border border-border bg-white p-6 shadow-soft">
          <div className="space-y-5">
            <Badge className="w-fit bg-emerald-100 text-emerald-800">
              Deterministic matching, explainable output
            </Badge>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              Watch teams assemble from real constraints.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Edit participants, tune weights, and see balanced teams form with transparent scores before you add production persistence.
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

          <div className="grid grid-cols-2 gap-3">
            <Metric label="Readiness" value={`${readiness}%`} icon={<Gauge size={18} />} />
            <Metric label="Avg score" value={averageScore} icon={<CheckCircle2 size={18} />} />
            <Metric label="Participants" value={participants.length} icon={<Users size={18} />} />
            <Metric label="CSV ready" value="Yes" icon={<Download size={18} />} />
          </div>

          <AssemblyStrip participants={participants} teams={previewTeams.map((team) => team.name)} />
          <LogoPanel readiness={readiness} teams={result.teams.length} />
        </div>

        <div className="min-w-0 space-y-4">
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">Live matching preview</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Current generated teams</h2>
              </div>
              <Badge>{result.teams.length} teams</Badge>
            </div>
            <div className="grid gap-3">
              {previewTeams.map((team) => {
                const members = team.participantIds
                  .map((id) => participantsById.get(id))
                  .filter((participant): participant is Participant => Boolean(participant));
                return (
                  <div key={team.id} className="rounded-lg border border-border bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{team.name}</h3>
                        <p className="text-xs text-muted-foreground">{members.length} assigned members</p>
                      </div>
                      <ScoreRing score={team.score?.totalScore ?? 0} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {members.map((member) => (
                        <span key={member.id} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-border">
                          {member.fullName} · {member.primaryRole}
                        </span>
                      ))}
                    </div>
                    {team.score ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <ScoreBar label="Roles" value={team.score.roleCoverageScore} />
                        <ScoreBar label="Skills" value={team.score.skillCoverageScore} />
                        <ScoreBar label="Experience" value={team.score.experienceBalanceScore} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>

          {focusTeam && focusExplanation ? (
            <Card className="space-y-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="text-primary" size={20} />
                <h2 className="text-xl font-bold tracking-tight">Why this team?</h2>
              </div>
              <p className="text-sm text-muted-foreground">{focusExplanation.summary}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Insight title="Strengths" items={focusExplanation.strengths.slice(0, 3)} />
                <Insight title="Watch points" items={[...focusExplanation.weaknesses, ...focusExplanation.warnings].slice(0, 3)} />
              </div>
              <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Suggested direction: </span>
                {focusExplanation.suggestedProjectDirection}
              </div>
            </Card>
          ) : null}
        </div>
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
    <div className="rounded-md border border-border bg-slate-50 p-4">
      <div className="mb-3 text-primary">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-emerald-500 bg-white text-sm font-bold">
      {score}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-medium">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Insight({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Sparkles size={16} className="text-primary" />
        {title}
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function AssemblyStrip({
  participants,
  teams
}: {
  participants: Participant[];
  teams: string[];
}) {
  const visibleParticipants = participants.slice(0, 8);
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-slate-950 p-4 text-white">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold">Team assembly</span>
        <span className="text-slate-300">{teams.slice(0, 3).join(" / ")}</span>
      </div>
      <div className="assembly-track flex w-max max-w-none gap-2">
        {[...visibleParticipants, ...visibleParticipants].map((participant, index) => (
          <span
            key={`${participant.id}-${index}`}
            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-900"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {participant.fullName.split(" ")[0]} · {participant.primaryRole}
          </span>
        ))}
      </div>
    </div>
  );
}

function LogoPanel({ readiness, teams }: { readiness: number; teams: number }) {
  return (
    <div className="relative isolate min-h-[210px] overflow-hidden rounded-lg border border-slate-800 bg-slate-950 p-5 text-white">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/20" />
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/20" />

      <div className="relative z-10 grid h-full gap-5 sm:grid-cols-[0.72fr_1fr] sm:items-center">
        <div className="flex items-center gap-4">
          <div className="logo-mark relative grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white text-slate-950 shadow-2xl">
            <div className="absolute -left-2 top-5 h-4 w-4 rounded-md bg-emerald-500 shadow-lg shadow-emerald-500/30" />
            <div className="absolute -right-2 top-5 h-4 w-4 rounded-md bg-sky-500 shadow-lg shadow-sky-500/30" />
            <div className="absolute -bottom-2 left-5 h-4 w-4 rounded-md bg-amber-400 shadow-lg shadow-amber-400/30" />
            <div className="absolute -bottom-2 right-5 h-4 w-4 rounded-md bg-rose-400 shadow-lg shadow-rose-400/30" />
            <span className="text-3xl font-black tracking-tight">HM</span>
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight">HackMatch AI</div>
            <div className="mt-1 max-w-44 text-sm text-slate-300">
              deterministic team intelligence
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {["roles", "skills", "availability", "explainability"].map((signal, index) => (
              <span
                key={signal}
                className="signal-chip rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100"
                style={{ animationDelay: `${index * 0.18}s` }}
              >
                {signal}
              </span>
            ))}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-3">
            <div className="mb-2 flex justify-between text-xs font-semibold text-slate-300">
              <span>match signal</span>
              <span>{readiness}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${readiness}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-white/10 p-2">
              <div className="text-base font-bold">{teams}</div>
              <div className="text-slate-300">teams</div>
            </div>
            <div className="rounded-md bg-white/10 p-2">
              <div className="text-base font-bold">0</div>
              <div className="text-slate-300">random</div>
            </div>
            <div className="rounded-md bg-white/10 p-2">
              <div className="text-base font-bold">100%</div>
              <div className="text-slate-300">traceable</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
