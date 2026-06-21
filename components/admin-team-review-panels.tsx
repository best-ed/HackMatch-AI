"use client";

import { useMemo, useState } from "react";
import { Archive } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui";
import type { AdminAuditEntry, AdminAuditAction } from "@/lib/admin-audit-history";
import {
  describeAdminAuditFilter,
  filterAdminAuditHistory,
  isSensitiveAuditAction,
  type AdminAuditFilter
} from "@/lib/admin-audit-filters";
import type { CohortFinalizationGate, CohortFinalizationStatus } from "@/lib/cohort-finalization";
import type { TeamExportAudit } from "@/lib/export-audit";
import type { TeamReviewSummary } from "@/lib/team-review";

export function TeamRunScopePanel({
  activeCohort,
  activeRunCohort,
  cohortParticipantCount,
  cohorts,
  isViewingSavedRun,
  onSetActiveCohort
}: {
  activeCohort: string;
  activeRunCohort?: string;
  cohortParticipantCount: number;
  cohorts: string[];
  isViewingSavedRun: boolean;
  onSetActiveCohort: (cohort: string) => void;
}) {
  return (
    <Card className="flex flex-wrap items-end justify-between gap-4">
      <label className="space-y-2 text-sm font-medium">
        <span>Active cohort</span>
        <input
          className="w-72 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
          list="teams-cohorts"
          value={activeCohort}
          onChange={(event) => onSetActiveCohort(event.target.value)}
          disabled={isViewingSavedRun}
        />
        <datalist id="teams-cohorts">
          {cohorts.map((cohort) => <option key={cohort} value={cohort} />)}
        </datalist>
      </label>
      <Badge>
        {isViewingSavedRun
          ? `${activeRunCohort ?? "Saved cohort"} snapshot`
          : `${cohortParticipantCount} participant(s) in cohort`}
      </Badge>
    </Card>
  );
}

export function TeamLocksPanel({ lockedCount }: { lockedCount: number }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-semibold">Team locks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lock a live team to preserve its exact membership while regenerating the rest.
        </p>
      </div>
      <Badge>{lockedCount} locked</Badge>
    </Card>
  );
}

export function FinalizationGatePanel({ gate }: { gate: CohortFinalizationGate }) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Cohort finalization gate</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirm the active cohort is ready before treating a saved run as final.
          </p>
        </div>
        <Badge className={finalizationStatusClass(gate.status)}>
          {gate.status}
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <PanelMetric label="Ready checks" value={gate.readyCount} />
        <PanelMetric label="Review checks" value={gate.reviewCount} />
        <PanelMetric label="Blocked checks" value={gate.blockedCount} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {gate.checks.map((check) => (
          <div className="rounded-md border border-border bg-white p-4" key={check.label}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">{check.label}</div>
              <Badge className={finalizationStatusClass(check.status)}>
                {check.status}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{check.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ReviewBriefPanel({ summary }: { summary: TeamReviewSummary }) {
  const hasMediumRisk = summary.risks.some((risk) => risk.severity === "medium");

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Review brief</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fast scan of the currently selected team run before export or sharing.
          </p>
        </div>
        <Badge className={summary.highRiskCount ? "bg-rose-100 text-rose-800" : hasMediumRisk ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
          {summary.highRiskCount ? `${summary.highRiskCount} high risk` : hasMediumRisk ? "Needs review" : "Ready"}
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <PanelMetric label="Teams" value={summary.teamCount} />
        <PanelMetric label="Assigned" value={summary.assignedCount} />
        <PanelMetric label="Unassigned" value={summary.unassignedCount} />
        <PanelMetric label="Avg score" value={summary.averageScore} />
        <PanelMetric label="Lowest score" value={summary.lowestScore} />
        <PanelMetric label="Locked" value={summary.lockedCount} />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <PanelMetric label="Coverage risks" value={summary.coverageRiskCount} />
        <PanelMetric label="Availability risks" value={summary.availabilityRiskCount} />
        <PanelMetric label="Constraint risks" value={summary.constraintRiskCount} />
        <PanelMetric label="Medium risks" value={summary.mediumRiskCount} />
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        {summary.risks.slice(0, 6).map((risk) => (
          <div key={`${risk.teamId}-${risk.label}-${risk.detail}`} className="rounded-md border border-border bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">{risk.teamName}</div>
              <Badge className={reviewRiskClass(risk.severity)}>{risk.label}</Badge>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{risk.detail}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function OperationsHistoryPanel({ history }: { history: AdminAuditEntry[] }) {
  const [filter, setFilter] = useState<AdminAuditFilter>("all");
  const filteredHistory = useMemo(() => filterAdminAuditHistory(history, filter), [filter, history]);
  const filterSummary = describeAdminAuditFilter(filter);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Operations history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browser-local audit trail for admin access events, saved-run actions, locks, shares, restores, and checklist review.
          </p>
        </div>
        <Badge>{filteredHistory.length} event{filteredHistory.length === 1 ? "" : "s"}</Badge>
      </div>
      {history.length ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "sensitive", "auth", "data"] as const).map((value) => (
              <button
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  filter === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white text-foreground hover:bg-muted"
                }`}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
              >
                {describeAdminAuditFilter(value).label}
              </button>
            ))}
          </div>
          <div className="rounded-md border border-border bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
            {filterSummary.detail}
          </div>
        <div className="grid gap-2">
          {filteredHistory.slice(0, 8).map((entry) => (
            <div className="rounded-md border border-border bg-white p-3" key={entry.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{entry.label}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.detail}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isSensitiveAuditAction(entry.action) ? (
                    <Badge className="bg-amber-100 text-amber-800">sensitive</Badge>
                  ) : null}
                  <Badge className={auditActionClass(entry.action)}>{auditActionLabel(entry.action)}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      ) : (
        <EmptyState
          description="Sign in, sign out, save, rename, mark final, restore, lock, share, or review teams to build an organizer history in this browser."
          icon={<Archive size={20} />}
          title="No operations recorded yet"
        />
      )}
    </Card>
  );
}

export function ExportAuditPanel({ audit }: { audit: TeamExportAudit }) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Export audit</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirm exactly what the team CSV will include before downloading.
          </p>
        </div>
        <Badge className={exportAuditStatusClass(audit.status)}>
          {audit.status}
        </Badge>
      </div>
      <div className="rounded-md border border-border bg-white p-4">
        <div className="font-semibold">{audit.filename}</div>
        <p className="mt-1 text-sm text-muted-foreground">{audit.summary}</p>
        <p className="mt-2 text-sm font-medium text-amber-800">{audit.sensitiveSummary}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <PanelMetric label="CSV rows" value={audit.exportRows} />
        <PanelMetric label="Teams" value={audit.teamCount} />
        <PanelMetric label="Assigned" value={audit.assignedCount} />
        <PanelMetric label="Unassigned" value={audit.unassignedCount} />
        <PanelMetric label="Contact hidden" value={audit.contactHiddenCount} />
        <PanelMetric label="Contact exposed" value={audit.sensitiveContactCount} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {audit.checks.map((check) => (
          <div className="rounded-md border border-border bg-white p-4" key={check.label}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">{check.label}</div>
              <Badge className={exportAuditStatusClass(check.status)}>
                {check.status}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{check.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PanelMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}

function finalizationStatusClass(status: CohortFinalizationStatus) {
  if (status === "ready") return "bg-emerald-100 text-emerald-800";
  if (status === "review") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function exportAuditStatusClass(status: "ready" | "review" | "blocked") {
  if (status === "ready") return "bg-emerald-100 text-emerald-800";
  if (status === "review") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function reviewRiskClass(severity: "high" | "medium" | "low") {
  if (severity === "high") return "bg-rose-100 text-rose-800";
  if (severity === "medium") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function auditActionLabel(action: AdminAuditAction) {
  switch (action) {
    case "auth-demo-access":
      return "demo access";
    case "auth-login":
      return "auth login";
    case "auth-refresh":
      return "auth refresh";
    case "auth-logout":
      return "auth logout";
    case "auth-cooldown":
      return "auth cooldown";
    default:
      return action.replace(/-/g, " ");
  }
}

function auditActionClass(action: AdminAuditAction) {
  if (action === "auth-demo-access" || action === "auth-logout" || action === "locked-team") return "bg-sky-100 text-sky-800";
  if (action === "auth-cooldown" || action === "deleted-run") return "bg-rose-100 text-rose-800";
  if (action === "auth-login" || action === "auth-refresh" || action === "final-run" || action === "saved-run") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-800";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
