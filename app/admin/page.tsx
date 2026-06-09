"use client";

import Link from "next/link";
import { AlertTriangle, CalendarDays, Clock3, Download, Link2, Settings2, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { AdminPersistenceStatus } from "@/components/admin-persistence-status";
import { Badge, Card, EmptyState } from "@/components/ui";
import { buildAdminActionQueue, type AdminActionQueueItem } from "@/lib/admin-action-queue";
import { summarizeCohortOverview } from "@/lib/cohort-overview";
import { evaluateDeploymentReadiness } from "@/lib/deployment-readiness";
import { useHackMatchData } from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";
import { buildParticipantActivityTimeline, type ParticipantActivityItem } from "@/lib/participant-activity";
import { evaluateParticipantIntake } from "@/lib/participant-intake";
import { getFinalSavedRun } from "@/lib/saved-run-final";
import { validateMatchingSettings } from "@/lib/settings-guardrails";
import { evaluateSupabaseReadiness } from "@/lib/supabase-readiness";
import { evaluateSupabaseSchemaReadiness, type SupabaseSchemaReadinessItem } from "@/lib/supabase-schema-readiness";

export default function AdminPage() {
  const {
    participants,
    cohortParticipants,
    settings,
    savedMatchRuns,
    activeCohort,
    cohorts,
    archivedCohorts,
    persistenceMode,
    persistenceWarning
  } = useHackMatchData();
  const result = generateTeams(cohortParticipants, settings);
  const assigned = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  const matchable = cohortParticipants.filter((participant) => participant.consentToMatch);
  const scores = result.teams.map((team) => team.score?.totalScore ?? 0);
  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0;
  const latestRun = savedMatchRuns[0];
  const finalRun = getFinalSavedRun(savedMatchRuns);
  const intakeSummary = evaluateParticipantIntake(cohortParticipants);
  const cohortOverview = summarizeCohortOverview({
    cohort: activeCohort,
    participants,
    savedRuns: savedMatchRuns
  });
  const settingsHealth = validateMatchingSettings(settings, cohortParticipants);
  const supabaseReadiness = evaluateSupabaseReadiness({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
  const supabaseSchemaReadiness = evaluateSupabaseSchemaReadiness();
  const deploymentReadiness = evaluateDeploymentReadiness({
    supabase: supabaseReadiness,
    hasParticipants: participants.length > 0,
    hasGeneratedTeams: result.teams.length > 0,
    hasSavedRun: Boolean(latestRun)
  });
  const actionQueue = buildAdminActionQueue({
    intake: intakeSummary,
    settingsHealth,
    result,
    matchableCount: matchable.length,
    assignedCount: assigned,
    savedRuns: savedMatchRuns,
    finalRun,
    deployment: deploymentReadiness
  });
  const activityTimeline = buildParticipantActivityTimeline({
    participants,
    savedRuns: savedMatchRuns,
    cohort: activeCohort,
    limit: 6
  });
  const dashboardChecks = [
    {
      label: "Participant coverage",
      ok: matchable.length > 0 && assigned === matchable.length,
      detail:
        assigned === matchable.length
          ? "Every matchable participant is currently assigned."
          : `${Math.max(0, matchable.length - assigned)} matchable participant(s) are unassigned.`
    },
    {
      label: "Settings health",
      ok: settingsHealth.status === "healthy",
      detail:
        settingsHealth.status === "healthy"
          ? "Current settings look viable for this cohort."
          : `${settingsHealth.errors.length} error(s), ${settingsHealth.warnings.length} warning(s).`
    },
    {
      label: "Saved run",
      ok: Boolean(latestRun),
      detail: latestRun
        ? `${latestRun.name} saved for ${latestRun.cohort ?? "General"}.`
        : "No saved match run yet."
    },
    {
      label: "Matcher warnings",
      ok: result.warnings.length === 0,
      detail:
        result.warnings.length === 0
          ? "No deterministic matcher warnings right now."
          : `${result.warnings.length} warning(s) need review.`
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizer overview</h1>
          <p className="mt-2 text-muted-foreground">
            Command center for cohorts, participant readiness, deterministic teams, and saved runs.
          </p>
        </div>
        <Badge>{activeCohort} active</Badge>
      </div>
      <AdminPersistenceStatus mode={persistenceMode} warning={persistenceWarning} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard href="/admin/participants" title="Directory" value={cohortParticipants.length} detail={`${matchable.length} matchable in ${activeCohort}`} icon={<Users size={20} />} />
        <MetricCard href="/admin/matching" title="Match setup" value={result.teams.length} detail={`${assigned}/${matchable.length} assigned live`} icon={<Settings2 size={20} />} />
        <MetricCard href="/admin/teams" title="Team review" value={averageScore} detail={`${result.warnings.length} warning(s)`} icon={<ShieldCheck size={20} />} />
        <MetricCard href="/admin/teams" title="Saved runs" value={savedMatchRuns.length} detail={finalRun ? `Final: ${finalRun.name}` : latestRun ? `Latest: ${latestRun.name}` : "None saved"} icon={<Download size={20} />} />
      </div>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Action queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Next best organizer actions based on the current cohort, settings, teams, and saved runs.
            </p>
          </div>
          <Badge className={actionQueue.some((item) => item.priority === "high") ? "bg-rose-100 text-rose-800" : actionQueue.some((item) => item.priority === "medium") ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
            {actionQueue.length} action{actionQueue.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {actionQueue.slice(0, 6).map((item) => (
            <ActionQueueCard item={item} key={item.id} />
          ))}
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Recent activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest participant and saved-run changes for the active cohort.
            </p>
          </div>
          <Badge>{activityTimeline.length} item{activityTimeline.length === 1 ? "" : "s"}</Badge>
        </div>
        {activityTimeline.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {activityTimeline.map((item) => (
              <ActivityCard item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            description="Register participants or save a match run to build an organizer activity trail."
            icon={<Clock3 size={20} />}
            title="No recent activity"
          />
        )}
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Cohort overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Snapshot of the active cohort before setup, review, or export.
            </p>
          </div>
          <Badge>{cohortOverview.cohort}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <OverviewMetric label="Participants" value={cohortOverview.participantCount} />
          <OverviewMetric label="Matchable" value={cohortOverview.matchableCount} />
          <OverviewMetric label="Advanced" value={cohortOverview.advancedCount} />
          <OverviewMetric label="Saved runs" value={cohortOverview.savedRunCount} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <OverviewList title="Top roles" items={cohortOverview.topRoles} />
          <OverviewList title="Top interests" items={cohortOverview.topInterests} />
        </div>
        <div className="rounded-md border border-border bg-white p-3 text-sm text-muted-foreground">
          {cohortOverview.latestRunName
            ? `Latest saved run for this cohort: ${cohortOverview.latestRunName}.`
            : "No saved run exists for this active cohort yet."}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Readiness checks</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                High-signal checks before you save or export teams.
              </p>
            </div>
            <Badge className={dashboardChecks.every((check) => check.ok) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
              {dashboardChecks.filter((check) => check.ok).length}/{dashboardChecks.length} healthy
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {dashboardChecks.map((check) => (
              <div key={check.label} className="rounded-md border border-border bg-white p-4">
                <div className="flex items-center gap-2">
                  {check.ok ? (
                    <ShieldCheck className="text-emerald-700" size={18} />
                  ) : (
                    <AlertTriangle className="text-amber-700" size={18} />
                  )}
                  <div className="font-semibold">{check.label}</div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{check.detail}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-4">
          <div>
            <h2 className="font-semibold">{finalRun ? "Final saved run" : "Latest saved run"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {finalRun ? "Organizer-approved saved run for final handoff." : "Frozen team snapshot currently available for review."}
            </p>
          </div>
          {finalRun || latestRun ? (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold">{(finalRun ?? latestRun)?.name}</div>
                  {finalRun ? <Badge className="bg-emerald-100 text-emerald-800">Final</Badge> : null}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{formatDate((finalRun ?? latestRun)?.createdAt ?? "")}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{(finalRun ?? latestRun)?.cohort ?? "General"}</Badge>
                  <Badge>{(finalRun ?? latestRun)?.result.teams.length} teams</Badge>
                  <Badge>Avg {(finalRun ?? latestRun)?.averageScore}</Badge>
                  <Badge>{(finalRun ?? latestRun)?.assignedCount}/{(finalRun ?? latestRun)?.participantCount} assigned</Badge>
                </div>
              </div>
              <Link className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/admin/teams">
                Review saved runs
              </Link>
            </div>
          ) : (
            <EmptyState
              action={
                <Link className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/admin/teams">
                  Open team review
                </Link>
              }
              description="Generate teams, then save a run from the team review page to freeze assignments, scores, warnings, and export output."
              icon={<Download size={20} />}
              title="No saved run yet"
            />
          )}
        </Card>
      </div>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Supabase plug-readiness</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Remote persistence remains optional; this checks whether the public env vars look launch-ready.
            </p>
          </div>
          <Badge className={supabaseStatusClass(supabaseReadiness.status)}>
            {supabaseReadiness.status}
          </Badge>
        </div>
        <div className="rounded-md border border-border bg-white p-4">
          <div className="font-semibold">{supabaseReadiness.title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{supabaseReadiness.detail}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {supabaseReadiness.checks.map((check) => (
            <div key={check.label} className="rounded-md border border-border bg-white p-4">
              <div className="flex items-center gap-2">
                {check.ok ? (
                  <ShieldCheck className="text-emerald-700" size={18} />
                ) : (
                  <AlertTriangle className="text-amber-700" size={18} />
                )}
                <div className="font-semibold">{check.label}</div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{check.detail}</p>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{supabaseSchemaReadiness.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{supabaseSchemaReadiness.detail}</p>
            </div>
            <Badge>{supabaseSchemaReadiness.readyCount}/{supabaseSchemaReadiness.totalCount}</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {supabaseSchemaReadiness.items.map((item) => (
              <SupabaseSchemaItem item={item} key={item.label} />
            ))}
          </div>
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Deployment preflight</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browser-visible launch checks before a production build and smoke test.
            </p>
          </div>
          <Badge className={deploymentReadiness.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
            {deploymentReadiness.status}
          </Badge>
        </div>
        <div className="rounded-md border border-border bg-white p-4">
          <div className="font-semibold">{deploymentReadiness.title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{deploymentReadiness.detail}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {deploymentReadiness.checks.map((check) => (
            <div key={check.label} className="rounded-md border border-border bg-white p-4">
              <div className="flex items-center gap-2">
                {check.ok ? (
                  <ShieldCheck className="text-emerald-700" size={18} />
                ) : (
                  <AlertTriangle className="text-amber-700" size={18} />
                )}
                <div className="font-semibold">{check.label}</div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{check.detail}</p>
            </div>
          ))}
        </div>
      </Card>
      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">Admin workflow</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Move through the main organizer loop using the same section names as the admin navigation.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <QuickAction href="/admin/participants" title="Directory" detail={`${participants.length} participant profile(s), imports, filters, and access links.`} icon={<Link2 size={18} />} />
          <QuickAction href="/admin/matching" title="Match setup" detail={`${cohorts.length} active cohort option(s), ${archivedCohorts.length} archived.`} icon={<CalendarDays size={18} />} />
          <QuickAction href="/admin/teams" title="Team review" detail={`${result.teams.length} live team(s), explanations, locks, saved runs, and exports.`} icon={<ShieldCheck size={18} />} />
          <QuickAction href="/admin/settings" title="Settings" detail={`${settings.desiredTeamSize} desired team size with draft impact preview.`} icon={<SlidersHorizontal size={18} />} />
        </div>
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">Participant entry</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick path for adding another participant to the active cohort.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <QuickAction href="/participant/register" title="Register participant" detail={`Add one participant to ${activeCohort}.`} icon={<Users size={18} />} />
        </div>
      </section>
    </div>
  );
}

function SupabaseSchemaItem({ item }: { item: SupabaseSchemaReadinessItem }) {
  return (
    <div className="rounded-md border border-border bg-muted/35 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">{item.label}</div>
        <Badge className={supabaseSchemaBadgeClass(item.status)}>{item.status}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
    </div>
  );
}

function supabaseSchemaBadgeClass(status: SupabaseSchemaReadinessItem["status"]) {
  if (status === "ready") return "bg-emerald-100 text-emerald-800";
  if (status === "planned") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-800";
}

function ActivityCard({ item }: { item: ParticipantActivityItem }) {
  return (
    <Link href={item.href}>
      <div className="flex h-full gap-3 rounded-md border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-soft">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Clock3 size={18} />
        </div>
        <div className="min-w-0">
          <div className="font-semibold">{item.title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
          <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.timestamp)}</p>
        </div>
      </div>
    </Link>
  );
}

function supabaseStatusClass(status: "local" | "ready" | "misconfigured") {
  if (status === "ready") return "bg-emerald-100 text-emerald-800";
  if (status === "misconfigured") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-800";
}

function MetricCard({
  href,
  title,
  value,
  detail,
  icon
}: {
  href: string;
  title: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="mb-4 text-primary">{icon}</div>
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
      </Card>
    </Link>
  );
}

function ActionQueueCard({ item }: { item: AdminActionQueueItem }) {
  return (
    <Link href={item.href}>
      <div className="h-full rounded-md border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge className={priorityBadgeClass(item.priority)}>{item.priority}</Badge>
          <span className="text-xs font-semibold text-primary">{item.actionLabel}</span>
        </div>
        <div className="mt-3 font-semibold">{item.title}</div>
        <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
      </div>
    </Link>
  );
}

function OverviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}

function priorityBadgeClass(priority: AdminActionQueueItem["priority"]) {
  if (priority === "high") return "bg-rose-100 text-rose-800";
  if (priority === "medium") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function OverviewList({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="font-semibold">{title}</div>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? items.map((item) => (
          <div className="flex justify-between gap-3 text-sm" key={item.label}>
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-semibold">{item.count}</span>
          </div>
        )) : (
          <div className="text-sm text-muted-foreground">No signal yet.</div>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  detail,
  icon
}: {
  href: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <div className="font-semibold">{title}</div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      </Card>
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
