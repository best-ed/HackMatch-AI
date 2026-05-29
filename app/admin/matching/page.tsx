"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Gauge, Settings2, Users } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { useHackMatchData } from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";
import type { MatchingResult } from "@/lib/matching/types";

export default function AdminMatchingPage() {
  const { participants, settings } = useHackMatchData();
  const result = generateTeams(participants, settings);
  const eligible = participants.filter((participant) => participant.consentToMatch);
  const assigned = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  const scores = result.teams.map((team) => team.score?.totalScore ?? 0);
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
  const readiness = Math.round(
    ((assigned / Math.max(1, eligible.length)) * 0.48 +
      (averageScore / 100) * 0.42 +
      (result.warnings.length === 0 ? 0.1 : 0)) *
      100
  );
  const checks = getViabilityChecks(result, {
    eligibleCount: eligible.length,
    assigned,
    averageScore,
    lowestScore,
    desiredTeamSize: settings.desiredTeamSize,
    maxTeamSize: settings.maxTeamSize
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate teams</h1>
          <p className="mt-2 text-muted-foreground">
            Deterministic output from the editable participant set and current settings.
          </p>
        </div>
        <Link className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/admin/teams">
          View teams
        </Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-emerald-100 text-emerald-800">
              <Gauge size={22} />
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Match readiness</div>
              <div className="text-3xl font-bold">{readiness}%</div>
            </div>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${readiness}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Eligible" value={eligible.length} icon={<Users size={16} />} />
            <Metric label="Assigned" value={assigned} icon={<CheckCircle2 size={16} />} />
            <Metric label="Avg score" value={averageScore} icon={<Gauge size={16} />} />
            <Metric label="Lowest score" value={lowestScore} icon={<AlertTriangle size={16} />} />
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Viability checks</h2>
              <p className="text-sm text-muted-foreground">Actionable signals from the current editable data.</p>
            </div>
            <Link className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold" href="/admin/settings">
              <Settings2 size={16} />
              Tune settings
            </Link>
          </div>
          <div className="grid gap-2">
            {checks.map((check) => (
              <div key={check.label} className="flex items-start gap-3 rounded-md border border-border bg-white p-3">
                <span className={check.ok ? "text-emerald-700" : "text-amber-700"}>
                  {check.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </span>
                <div>
                  <div className="text-sm font-semibold">{check.label}</div>
                  <div className="text-sm text-muted-foreground">{check.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><Metric label="Participants" value={participants.length} icon={<Users size={16} />} /></Card>
        <Card><Metric label="Desired size" value={settings.desiredTeamSize} icon={<Settings2 size={16} />} /></Card>
        <Card><Metric label="Max size" value={settings.maxTeamSize} icon={<Settings2 size={16} />} /></Card>
        <Card><Metric label="Unassigned" value={result.unassignedParticipants.length} icon={<AlertTriangle size={16} />} /></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {result.teams.map((team) => {
          const members = team.participantIds
            .map((id) => participants.find((participant) => participant.id === id))
            .filter(Boolean);
          return (
          <Card key={team.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{team.name}</h2>
                <p className="text-sm text-muted-foreground">{members.length} assigned members</p>
              </div>
              <Badge className={scoreBadgeClass(team.score?.totalScore ?? 0)}>
                Score {team.score?.totalScore}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((member) =>
                member ? (
                  <span key={member.id} className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                    {member.fullName} - {member.primaryRole}
                  </span>
                ) : null
              )}
            </div>
            {team.score ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <ScoreBar label="Roles" value={team.score.roleCoverageScore} />
                <ScoreBar label="Skills" value={team.score.skillCoverageScore} />
                <ScoreBar label="Experience" value={team.score.experienceBalanceScore} />
              </div>
            ) : null}
          </Card>
        );
        })}
      </div>

      {result.warnings.length > 0 ? (
        <Card>
          <h2 className="font-semibold">Warnings</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </Card>
      ) : null}
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
  icon?: React.ReactNode;
}) {
  return (
    <div>
      {icon ? <div className="mb-2 text-primary">{icon}</div> : null}
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
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
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function scoreBadgeClass(score: number): string {
  if (score >= 85) return "bg-emerald-100 text-emerald-800";
  if (score >= 70) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function getViabilityChecks(
  result: MatchingResult,
  stats: {
    eligibleCount: number;
    assigned: number;
    averageScore: number;
    lowestScore: number;
    desiredTeamSize: number;
    maxTeamSize: number;
  }
) {
  return [
    {
      label: "Eligible participants assigned",
      ok: stats.assigned === stats.eligibleCount,
      detail:
        stats.assigned === stats.eligibleCount
          ? "Every participant with consent is currently placed."
          : `${stats.eligibleCount - stats.assigned} matchable participant(s) still need placement.`
    },
    {
      label: "Team score floor",
      ok: stats.lowestScore >= 75,
      detail:
        stats.lowestScore >= 75
          ? `Lowest team score is ${stats.lowestScore}, which is healthy for an MVP run.`
          : `Lowest team score is ${stats.lowestScore}; inspect role coverage or constraints.`
    },
    {
      label: "Warnings",
      ok: result.warnings.length === 0,
      detail:
        result.warnings.length === 0
          ? "No hard-constraint or consent warnings returned."
          : `${result.warnings.length} warning(s) returned by the deterministic matcher.`
    },
    {
      label: "Team sizing",
      ok: result.teams.every(
        (team) =>
          team.participantIds.length <= stats.maxTeamSize &&
          team.participantIds.length > 0
      ),
      detail: `Target is ${stats.desiredTeamSize} per team with max ${stats.maxTeamSize}.`
    }
  ];
}
