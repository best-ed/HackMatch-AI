"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Archive, CheckCircle2, Gauge, RotateCcw, Settings2, Users } from "lucide-react";
import { AdminDataLoadNotice } from "@/components/admin-data-load-notice";
import { AdminPersistenceStatus } from "@/components/admin-persistence-status";
import { SectionTrail } from "@/components/section-trail";
import { Badge, Card, EmptyState } from "@/components/ui";
import { clipboardStatusMessage, copyTextToClipboard } from "@/lib/clipboard";
import { compareCohortHealth, type CohortHealthRow } from "@/lib/cohort-health";
import { useHackMatchData } from "@/lib/local-store";
import { evaluateMatchingReadiness } from "@/lib/matching-readiness";
import { generateTeams } from "@/lib/matching/algorithm";
import { matchingPresets } from "@/lib/settings-guardrails";

export default function AdminMatchingPage() {
  const {
    cohortParticipants,
    participants,
    settings,
    setSettings,
    savedMatchRuns,
    activeCohort,
    setActiveCohort,
    cohorts,
    allCohorts,
    archivedCohorts,
    archiveCohort,
    restoreCohort,
    loaded,
    persistenceMode,
    persistenceWarning
  } = useHackMatchData();
  const [newCohort, setNewCohort] = useState("");
  const [setupCohort, setSetupCohort] = useState(activeCohort);
  const [setupPresetId, setSetupPresetId] = useState("balanced");
  const [setupDesiredTeamSize, setSetupDesiredTeamSize] = useState(settings.desiredTeamSize);
  const [setupMinTeamSize, setSetupMinTeamSize] = useState(settings.minTeamSize);
  const [setupMaxTeamSize, setSetupMaxTeamSize] = useState(settings.maxTeamSize);
  const [setupStatus, setSetupStatus] = useState("");
  const result = generateTeams(cohortParticipants, settings);
  const readiness = evaluateMatchingReadiness(result, cohortParticipants, settings);
  const cohortHealth = compareCohortHealth({
    cohorts,
    participants,
    savedRuns: savedMatchRuns,
    settings
  });
  const registrationUrl =
    typeof window === "undefined"
      ? "/participant/register"
      : new URL(`/participant/register?cohort=${encodeURIComponent(activeCohort)}`, window.location.origin).toString();

  function applyEventSetup() {
    const preset = matchingPresets.find((item) => item.id === setupPresetId) ?? matchingPresets[0];
    const cleanedCohort = setupCohort.trim() || activeCohort;
    setActiveCohort(cleanedCohort);
    setSettings({
      ...preset.settings,
      desiredTeamSize: setupDesiredTeamSize,
      minTeamSize: setupMinTeamSize,
      maxTeamSize: setupMaxTeamSize,
      numberOfTeams: settings.numberOfTeams,
      lockedTeams: settings.lockedTeams ?? []
    });
    setSetupStatus(`Event setup applied for ${cleanedCohort}.`);
  }

  async function copyRegistrationLink() {
    if (typeof window === "undefined") return;
    const result = await copyTextToClipboard(registrationUrl);
    setSetupStatus(clipboardStatusMessage(result, "Registration link copied."));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionTrail items={[{ href: "/admin", label: "Admin" }, { label: "Match setup" }]} />
          <h1 className="text-3xl font-bold tracking-tight">Matching workspace</h1>
          <p className="mt-2 text-muted-foreground">
            Configure the active cohort, preview readiness, and generate deterministic teams.
          </p>
        </div>
        <Link className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/admin/teams">
          Open team review
        </Link>
      </div>
      <AdminPersistenceStatus
        mode={persistenceMode}
        warning={persistenceWarning}
        detail="Cohort selection is stored locally; participant and settings edits can sync to Supabase when env vars are configured."
      />
      <AdminDataLoadNotice loaded={loaded} label="matching workspace" />
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Event setup</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure the active cohort, matching preset, team size, and registration link in one pass.
            </p>
          </div>
          <Badge>{setupPresetId.replace("-", " ")}</Badge>
        </div>
        {setupStatus ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
            {setupStatus}
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_120px_120px_120px]">
          <label className="space-y-2 text-sm font-medium">
            <span>Event cohort</span>
            <input
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              list="event-setup-cohorts"
              onChange={(event) => setSetupCohort(event.target.value)}
              placeholder="June Build Night"
              value={setupCohort}
            />
            <datalist id="event-setup-cohorts">
              {cohorts.map((cohort) => <option key={cohort} value={cohort} />)}
            </datalist>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Preset</span>
            <select
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              onChange={(event) => setSetupPresetId(event.target.value)}
              value={setupPresetId}
            >
              {matchingPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
          </label>
          <NumberInput label="Desired" value={setupDesiredTeamSize} onChange={setSetupDesiredTeamSize} />
          <NumberInput label="Min" value={setupMinTeamSize} onChange={setSetupMinTeamSize} />
          <NumberInput label="Max" value={setupMaxTeamSize} onChange={setSetupMaxTeamSize} />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div className="break-all rounded-md border border-border bg-white px-3 py-2 text-sm text-muted-foreground">
            {registrationUrl}
          </div>
          <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={() => void copyRegistrationLink()} type="button">
            Copy registration link
          </button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={applyEventSetup} type="button">
            Apply setup
          </button>
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Active matching cohort</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick an existing group or type a new cohort name to isolate matching runs.
            </p>
          </div>
          <Badge>{cohortParticipants.length} participant(s) in {activeCohort}</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <label className="space-y-2 text-sm font-medium">
            <span>Active cohort name</span>
            <input
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              value={activeCohort}
              onChange={(event) => setActiveCohort(event.target.value)}
              placeholder="May Hackathon, Finals Group A, Nairobi Build Night"
            />
            <span className="block text-xs font-normal text-muted-foreground">
              Free-form names are allowed.
            </span>
          </label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="space-y-2 text-sm font-medium">
              <span>Create or switch cohort</span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
                value={newCohort}
                onChange={(event) => setNewCohort(event.target.value)}
                placeholder="May Hackathon"
              />
            </label>
            <div className="flex items-end">
              <button
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                onClick={() => {
                  if (!newCohort.trim()) return;
                  setActiveCohort(newCohort);
                  setNewCohort("");
                }}
                type="button"
              >
                Use cohort
              </button>
            </div>
          </div>
        </div>
        <label className="block space-y-2 text-sm font-medium">
          <span>Switch to existing cohort</span>
          <select
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            value={cohorts.includes(activeCohort) ? activeCohort : ""}
            onChange={(event) => setActiveCohort(event.target.value)}
          >
            <option value="" disabled>
              Select saved cohort
            </option>
            {cohorts.map((cohort) => (
              <option key={cohort} value={cohort}>
                {cohort}
              </option>
            ))}
          </select>
        </label>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Cohort health comparison</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare active cohorts before switching setup or generating teams.
            </p>
          </div>
          <Badge>{cohortHealth.length} cohort{cohortHealth.length === 1 ? "" : "s"}</Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {cohortHealth.map((row) => (
            <CohortHealthCard
              active={row.cohort === activeCohort}
              key={row.cohort}
              onSelect={() => setActiveCohort(row.cohort)}
              row={row}
            />
          ))}
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Cohort archive</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hide completed cohorts from active setup lists without deleting participants or saved runs.
            </p>
          </div>
          <Badge>{archivedCohorts.length} archived</Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-md border border-border bg-white p-4">
            <div className="flex items-center gap-2 font-semibold">
              <Archive size={18} />
              Active cohorts
            </div>
            <div className="mt-3 grid gap-2">
              {cohorts.map((cohort) => (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2" key={cohort}>
                  <span className="text-sm font-medium">{cohort}</span>
                  <button
                    className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={cohort === "General"}
                    onClick={() => archiveCohort(cohort)}
                    type="button"
                  >
                    Archive
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-white p-4">
            <div className="flex items-center gap-2 font-semibold">
              <RotateCcw size={18} />
              Archived cohorts
            </div>
            {archivedCohorts.length ? (
              <div className="mt-3 grid gap-2">
                {archivedCohorts.map((cohort) => (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2" key={cohort}>
                    <span className="text-sm font-medium">{cohort}</span>
                    <button
                      className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold"
                      onClick={() => restoreCohort(cohort)}
                      type="button"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                className="mt-3"
                description="Completed events can be archived here after their final saved run is recorded."
                icon={<Archive size={20} />}
                title="No archived cohorts"
              />
            )}
          </div>
        </div>
        {allCohorts.length !== cohorts.length ? (
          <p className="text-xs text-muted-foreground">
            Showing {cohorts.length} of {allCohorts.length} known cohort{allCohorts.length === 1 ? "" : "s"} in active setup lists.
          </p>
        ) : null}
      </Card>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-emerald-100 text-emerald-800">
              <Gauge size={22} />
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Match readiness</div>
              <div className="text-3xl font-bold">{readiness.score}%</div>
            </div>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${readiness.score}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Eligible" value={readiness.eligibleCount} icon={<Users size={16} />} />
            <Metric label="Assigned" value={readiness.assignedCount} icon={<CheckCircle2 size={16} />} />
            <Metric label="Avg score" value={readiness.averageScore} icon={<Gauge size={16} />} />
            <Metric label="Lowest score" value={readiness.lowestScore} icon={<AlertTriangle size={16} />} />
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
            {readiness.items.map((item) => (
              <div key={`${item.title}-${item.detail}`} className="flex items-start gap-3 rounded-md border border-border bg-white p-3">
                <span className={readinessIconClass(item.severity)}>
                  {item.severity === "info" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold">{item.title}</div>
                    <Badge className={readinessBadgeClass(item.severity)}>{item.severity}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.detail}</div>
                  <div className="mt-2 text-xs font-medium text-foreground">{item.action}</div>
                  <Link
                    className="mt-3 inline-flex rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-primary transition hover:-translate-y-0.5"
                    href={item.actionHref}
                  >
                    {item.actionLabel}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><Metric label="Participants" value={cohortParticipants.length} icon={<Users size={16} />} /></Card>
        <Card><Metric label="Desired size" value={settings.desiredTeamSize} icon={<Settings2 size={16} />} /></Card>
        <Card><Metric label="Max size" value={settings.maxTeamSize} icon={<Settings2 size={16} />} /></Card>
        <Card><Metric label="Unassigned" value={result.unassignedParticipants.length} icon={<AlertTriangle size={16} />} /></Card>
      </div>

      {result.teams.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {result.teams.map((team) => {
          const members = team.participantIds
            .map((id) => cohortParticipants.find((participant) => participant.id === id))
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
      ) : (
        <EmptyState
          action={
            <Link className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/participant/register">
              Register participant
            </Link>
          }
          description="This cohort does not have enough matchable participants under the current settings. Add participants, switch cohorts, or tune team size constraints."
          icon={<Users size={20} />}
          title="No teams generated for this cohort"
        />
      )}

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

function CohortHealthCard({
  active,
  row,
  onSelect
}: {
  active: boolean;
  row: CohortHealthRow;
  onSelect: () => void;
}) {
  return (
    <button
      className={`rounded-md border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft ${
        active ? "border-primary ring-2 ring-primary/15" : "border-border"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{row.cohort}</div>
          <p className="mt-1 text-sm text-muted-foreground">{row.detail}</p>
        </div>
        <Badge className={cohortHealthBadgeClass(row.status)}>{row.status}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <MiniMetric label="Participants" value={row.participantCount} />
        <MiniMetric label="Matchable" value={row.matchableCount} />
        <MiniMetric label="Advanced" value={row.advancedCount} />
        <MiniMetric label="Saved runs" value={row.savedRunCount} />
      </div>
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <div className="font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{label}</span>
      <input
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
        min={1}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
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

function readinessIconClass(severity: "blocker" | "warning" | "info") {
  if (severity === "blocker") return "text-rose-700";
  if (severity === "warning") return "text-amber-700";
  return "text-emerald-700";
}

function readinessBadgeClass(severity: "blocker" | "warning" | "info") {
  if (severity === "blocker") return "bg-rose-100 text-rose-800";
  if (severity === "warning") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function cohortHealthBadgeClass(status: CohortHealthRow["status"]) {
  if (status === "blocked") return "bg-rose-100 text-rose-800";
  if (status === "watch") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}
