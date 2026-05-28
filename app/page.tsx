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
      <section className="relative left-1/2 right-1/2 -mx-[50vw] -mt-8 min-h-screen w-screen overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
        <TechHeroBackdrop />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-6 py-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:py-[90px]">
        <div className="liquid-glass min-w-0 space-y-6 rounded-lg p-6">
          <div className="space-y-5">
            <Badge className="w-fit bg-white/10 text-white ring-1 ring-white/20">
              Deterministic matching, explainable output
            </Badge>
            <h1 className="animate-fade-rise max-w-3xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Watch teams <em className="not-italic text-emerald-200">assemble</em> from real constraints.
            </h1>
            <p className="animate-fade-rise-delay max-w-2xl text-base leading-relaxed text-white/72 sm:text-lg">
              Edit participants, tune weights, and see balanced teams form with transparent scores before you add production persistence.
            </p>
            <div className="animate-fade-rise-delay-2 flex flex-wrap gap-3">
              <Link className="liquid-glass inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.03]" href="/admin/matching">
                Generate teams <ArrowRight size={16} />
              </Link>
              <Link className="liquid-glass inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.03]" href="/participant/register">
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
          <Card className="liquid-glass space-y-4 rounded-lg p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-200">Live matching preview</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">Current generated teams</h2>
              </div>
              <Badge className="bg-white/10 text-white ring-1 ring-white/20">{result.teams.length} teams</Badge>
            </div>
            <div className="grid gap-3">
              {previewTeams.map((team) => {
                const members = team.participantIds
                  .map((id) => participantsById.get(id))
                  .filter((participant): participant is Participant => Boolean(participant));
                return (
                  <div key={team.id} className="rounded-lg border border-white/15 bg-white/10 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{team.name}</h3>
                        <p className="text-xs text-white/65">{members.length} assigned members</p>
                      </div>
                      <ScoreRing score={team.score?.totalScore ?? 0} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {members.map((member) => (
                        <span key={member.id} className="rounded-md bg-white/12 px-2 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                          {member.fullName} - {member.primaryRole}
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
            <Card className="liquid-glass space-y-4 rounded-lg p-5 text-white">
              <div className="flex items-center gap-2">
                <BrainCircuit className="text-emerald-200" size={20} />
                <h2 className="text-xl font-bold tracking-tight">Why this team?</h2>
              </div>
              <p className="text-sm text-white/72">{focusExplanation.summary}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Insight title="Strengths" items={focusExplanation.strengths.slice(0, 3)} />
                <Insight title="Watch points" items={[...focusExplanation.weaknesses, ...focusExplanation.warnings].slice(0, 3)} />
              </div>
              <div className="rounded-md bg-white/12 p-4 text-sm text-white/72">
                <span className="font-semibold text-white">Suggested direction: </span>
                {focusExplanation.suggestedProjectDirection}
              </div>
            </Card>
          ) : null}
        </div>
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

function TechHeroBackdrop() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.14)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
      <div className="data-stream data-stream-a" />
      <div className="data-stream data-stream-b" />
      <div className="data-stream data-stream-c" />
      <div className="absolute left-[7%] top-[16%] hidden w-72 rounded-lg border border-emerald-300/20 bg-slate-900/70 p-4 text-xs text-emerald-100 shadow-2xl backdrop-blur md:block">
        <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-wide text-emerald-300/80">
          <span>matching pipeline</span>
          <span>deterministic</span>
        </div>
        {["normalize profiles", "score constraints", "optimize teams"].map((item, index) => (
          <div key={item} className="mb-2 flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded bg-emerald-400/15 text-[10px] text-emerald-200">
              {index + 1}
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="absolute bottom-[12%] right-[7%] hidden w-80 rounded-lg border border-sky-300/20 bg-slate-900/70 p-4 text-xs text-sky-100 shadow-2xl backdrop-blur lg:block">
        <div className="mb-3 text-[10px] uppercase tracking-wide text-sky-300/80">live signals</div>
        <div className="grid grid-cols-2 gap-2">
          {["roles", "skills", "availability", "preferences"].map((item) => (
            <div key={item} className="rounded-md bg-white/8 p-2">
              <div className="mb-1 h-1.5 rounded-full bg-sky-300" />
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(20,184,166,0.2),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.42),rgba(2,6,23,0.88))]" />
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
    <div className="liquid-glass rounded-md p-4 text-white">
      <div className="mb-3 text-emerald-200">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-white/68">{label}</div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-emerald-300 bg-white text-sm font-bold text-slate-950">
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
      <div className="h-2 overflow-hidden rounded-full bg-white/18">
        <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Insight({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-white/15 bg-white/10 p-4">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Sparkles size={16} className="text-emerald-200" />
        {title}
      </div>
      <ul className="space-y-2 text-sm text-white/72">
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
    <div className="liquid-glass min-w-0 overflow-hidden rounded-lg p-4 text-white">
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
    <div className="liquid-glass relative isolate min-h-[210px] overflow-hidden rounded-lg p-5 text-white">
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
