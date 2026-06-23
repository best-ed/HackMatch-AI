"use client";

import { Badge, Card } from "@/components/ui";
import type { CohortTransferAudit } from "@/lib/cohort-transfer-audit";
import type { ParticipantLinkAudit, ParticipantLinkAuditStatus } from "@/lib/participant-link-audit";
import type { DuplicateParticipantGroup } from "@/lib/participant-duplicates";
import { buildParticipantDuplicateQueue } from "@/lib/participant-duplicate-queue";
import { buildDuplicateResolutionPreview } from "@/lib/participant-duplicate-resolution";
import type { ParticipantIntakeSummary, IntakeIssueSeverity } from "@/lib/participant-intake";
import type { ParticipantOperatorNudge } from "@/lib/participant-operator-nudges";
import type { PrivacyAuditStatus, PrivacyAuditSummary } from "@/lib/privacy-audit";

export function ParticipantPrivacyAuditPanel({
  activeCohort,
  audit,
  consentFilter,
  onSetConsentFilter,
  onSetReadinessAll
}: {
  activeCohort: string;
  audit: PrivacyAuditSummary;
  consentFilter: "all" | "matchable" | "excluded";
  onSetConsentFilter: (filter: "all" | "matchable" | "excluded") => void;
  onSetReadinessAll: () => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Consent and privacy audit</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Check matching consent, teammate contact sharing, and handoff privacy for {activeCohort}.
          </p>
        </div>
        <Badge className={privacyStatusClass(audit.status)}>{audit.status}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <PreviewMetric label="Match consent" value={audit.matchConsentCount} />
        <PreviewMetric label="Excluded" value={audit.matchExcludedCount} />
        <PreviewMetric label="Can share contact" value={audit.contactSharingCount} />
        <PreviewMetric label="Assigned hidden contact" value={audit.assignedWithoutContactCount} />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {audit.issues.map((issue) => (
          <div className="rounded-md border border-border bg-white p-4" key={issue.label}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">{issue.label}</div>
              <Badge className={privacyStatusClass(issue.status)}>{issue.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{issue.detail}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <ReadinessFilterButton
          active={consentFilter === "excluded"}
          label={`Review excluded (${audit.matchExcludedCount})`}
          onClick={() => {
            onSetConsentFilter("excluded");
            onSetReadinessAll();
          }}
        />
        <ReadinessFilterButton
          active={consentFilter === "matchable"}
          label={`Review matchable (${audit.matchConsentCount})`}
          onClick={() => {
            onSetConsentFilter("matchable");
            onSetReadinessAll();
          }}
        />
        <ReadinessFilterButton
          active={consentFilter === "all"}
          label="Show all consent states"
          onClick={() => onSetConsentFilter("all")}
        />
      </div>
    </Card>
  );
}

export function ParticipantLinkSecurityPanel({
  audit,
  linkRiskOnly,
  onSetLinkRiskOnly
}: {
  audit: ParticipantLinkAudit;
  linkRiskOnly: boolean;
  onSetLinkRiskOnly: (value: boolean) => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Participant link security</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit team access links before copying or exporting participant lookup URLs.
          </p>
        </div>
        <Badge className={linkAuditStatusClass(audit.status)}>{audit.status}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <PreviewMetric label="Exportable links" value={audit.exportableLinks} />
        <PreviewMetric label="Missing tokens" value={audit.missingTokenCount} />
        <PreviewMetric label="Duplicate tokens" value={audit.duplicateTokenCount} />
        <PreviewMetric label="Needs review" value={audit.riskParticipantIds.length} />
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        {audit.issues.map((issue) => (
          <div className="rounded-md border border-border bg-white p-4" key={issue.label}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">{issue.label}</div>
              <Badge className={linkAuditStatusClass(issue.status)}>{issue.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{issue.detail}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <ReadinessFilterButton
          active={linkRiskOnly}
          label={`Review risky links (${audit.riskParticipantIds.length})`}
          onClick={() => onSetLinkRiskOnly(true)}
        />
        <ReadinessFilterButton
          active={!linkRiskOnly}
          label="Show all links"
          onClick={() => onSetLinkRiskOnly(false)}
        />
      </div>
    </Card>
  );
}

export function ParticipantIntakeQualityPanel({
  averageCompleteness,
  duplicateCount,
  nudges,
  readinessFilter,
  summary,
  onSetReadinessFilter
}: {
  averageCompleteness: number;
  duplicateCount: number;
  nudges: ParticipantOperatorNudge[];
  readinessFilter: "all" | "incomplete" | "excluded" | "low-signal" | "duplicates";
  summary: ParticipantIntakeSummary;
  onSetReadinessFilter: (filter: "all" | "incomplete" | "excluded" | "low-signal" | "duplicates") => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Intake quality</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deterministic checks for participant readiness before matching.
          </p>
        </div>
        <Badge className={summary.incompleteCount ? "bg-rose-100 text-rose-800" : summary.lowSignalCount || summary.excludedCount ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
          {summary.incompleteCount ? "Needs fixes" : summary.lowSignalCount || summary.excludedCount ? "Needs review" : "Ready"}
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <PreviewMetric label="Matchable" value={summary.matchableCount} />
        <PreviewMetric label="Excluded" value={summary.excludedCount} />
        <PreviewMetric label="Incomplete" value={summary.incompleteCount} />
        <PreviewMetric label="Avg completeness" value={averageCompleteness} />
      </div>
      <div className="text-sm text-muted-foreground">
        Low-signal profiles: <span className="font-semibold text-foreground">{summary.lowSignalCount}</span>
      </div>
      <div className="grid gap-2">
        {nudges.map((nudge) => (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-white px-3 py-3" key={nudge.title}>
            <div>
              <div className="font-semibold">{nudge.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{nudge.detail}</div>
            </div>
            {nudge.filter ? (
              <button
                className="rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-primary"
                onClick={() => onSetReadinessFilter(nudge.filter!)}
                type="button"
              >
                Open filter
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <ReadinessFilterButton active={readinessFilter === "all"} label="All records" onClick={() => onSetReadinessFilter("all")} />
        <ReadinessFilterButton active={readinessFilter === "incomplete"} label={`Incomplete (${summary.incompleteCount})`} onClick={() => onSetReadinessFilter("incomplete")} />
        <ReadinessFilterButton active={readinessFilter === "excluded"} label={`Excluded (${summary.excludedCount})`} onClick={() => onSetReadinessFilter("excluded")} />
        <ReadinessFilterButton active={readinessFilter === "low-signal"} label={`Low signal (${summary.lowSignalCount})`} onClick={() => onSetReadinessFilter("low-signal")} />
        <ReadinessFilterButton active={readinessFilter === "duplicates"} label={`Duplicates (${duplicateCount})`} onClick={() => onSetReadinessFilter("duplicates")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-md border border-border bg-white p-4">
          <div className="font-semibold">Top role coverage</div>
          <div className="mt-3 space-y-2">
            {summary.roleCoverage.map((role) => (
              <div key={role.role}>
                <div className="mb-1 flex justify-between text-xs font-medium">
                  <span>{role.role}</span>
                  <span>{role.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (role.count / Math.max(1, summary.totalCount)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          {summary.issues.map((issue) => (
            <div key={`${issue.title}-${issue.detail}`} className="rounded-md border border-border bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold">{issue.title}</div>
                <Badge className={intakeIssueClass(issue.severity)}>{issue.severity}</Badge>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{issue.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function ParticipantDuplicateReviewPanel({ groups }: { groups: DuplicateParticipantGroup[] }) {
  const queue = buildParticipantDuplicateQueue(groups);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Duplicate review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Likely duplicate records based on email, access token, or name plus institution.
          </p>
        </div>
        <Badge className={groups.length ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
          {groups.length ? `${groups.length} group${groups.length === 1 ? "" : "s"}` : "Clear"}
        </Badge>
      </div>
      {groups.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          <PreviewMetric label="High priority" value={queue.highCount} />
          <PreviewMetric label="Medium priority" value={queue.mediumCount} />
          <PreviewMetric label="Low priority" value={queue.lowCount} />
        </div>
      ) : null}
      {groups.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {queue.items.slice(0, 6).map((group) => {
            const resolution = buildDuplicateResolutionPreview(group);

            return (
              <div className="rounded-md border border-border bg-white p-3" key={`${group.reason}-${group.label}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{group.reason}</div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={duplicatePriorityClass(group.priority)}>{group.priority}</Badge>
                  <Badge>{group.participants.length} records</Badge>
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{group.label}</div>
              <div className="mt-2 text-sm text-muted-foreground">{group.reasonDetail}</div>
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <div className="font-semibold">Resolution preview</div>
                <div className="mt-1">
                  Keep <span className="font-semibold">{resolution.keepName}</span> ({resolution.keepId}) as the base
                  record.
                </div>
                <div className="mt-1 text-emerald-800">
                  {resolution.mergeFieldCount} merge field{resolution.mergeFieldCount === 1 ? "" : "s"} available,{" "}
                  {resolution.riskFieldCount} watch point{resolution.riskFieldCount === 1 ? "" : "s"}.
                </div>
                {resolution.keepReasons.length ? (
                  <div className="mt-2 text-emerald-800">
                    Why this record: {resolution.keepReasons.join(", ")}.
                  </div>
                ) : null}
                {resolution.riskFields.length ? (
                  <div className="mt-2 text-amber-800">
                    Review before deleting duplicates: {resolution.riskFields.join(", ")}.
                  </div>
                ) : null}
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {group.participants.map((participant) => (
                  <div className="flex justify-between gap-3" key={participant.id}>
                    <span>{participant.fullName}</span>
                    <span className="text-muted-foreground">{participant.email}</span>
                  </div>
                ))}
              </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          No likely duplicate participants detected.
        </div>
      )}
    </Card>
  );
}

export function ParticipantCohortTransferPanel({
  activeCohort,
  audit,
  onUseTargetCohort
}: {
  activeCohort: string;
  audit: CohortTransferAudit;
  onUseTargetCohort: () => void;
}) {
  return (
    <Card className="space-y-4 border-primary/20 bg-emerald-50/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Cohort transfer audit</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the last move into {audit.targetCohort} before generating teams or switching the active cohort.
          </p>
        </div>
        <Badge className={audit.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
          {audit.status}
        </Badge>
      </div>
      <div className="rounded-md border border-border bg-white p-4 text-sm text-muted-foreground">
        <div className="font-semibold text-foreground">{audit.summary}</div>
        {activeCohort !== audit.targetCohort ? (
          <button
            className="mt-3 rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-primary"
            onClick={onUseTargetCohort}
            type="button"
          >
            Switch active cohort to {audit.targetCohort}
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <PreviewMetric label="Moved" value={audit.movedCount} />
        <PreviewMetric label="Source cohorts" value={audit.sourceCohortCount} />
        <PreviewMetric label="Target total" value={audit.targetCohortTotal} />
        <PreviewMetric label="Matchable in target" value={audit.targetMatchableCount} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-md border border-border bg-white p-4">
          <div className="font-semibold">Source cohorts</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {audit.sourceBreakdown.map((item) => (
              <Badge key={item.cohort}>{item.cohort} {item.count}</Badge>
            ))}
            {audit.sourceBreakdown.length === 0 ? (
              <span className="text-sm text-muted-foreground">No source cohort changes detected.</span>
            ) : null}
          </div>
          <div className="mt-4 font-semibold">Moved role mix</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {audit.movedRoles.map((item) => (
              <Badge key={item.label}>{item.label} {item.count}</Badge>
            ))}
            {audit.movedRoles.length === 0 ? (
              <span className="text-sm text-muted-foreground">No moved role data available.</span>
            ) : null}
          </div>
        </div>
        <div className="rounded-md border border-border bg-white p-4">
          <div className="font-semibold">Watch points</div>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            {audit.highlights.map((highlight) => (
              <div key={highlight}>{highlight}</div>
            ))}
          </div>
          <div className="mt-4 font-semibold">Recent moved participants</div>
          <div className="mt-3 space-y-2 text-sm">
            {audit.movedParticipants.map((participant) => (
              <div className="flex justify-between gap-3 rounded-md bg-muted px-3 py-2" key={participant.id}>
                <span>{participant.fullName}</span>
                <span className="text-muted-foreground">{participant.fromCohort}</span>
              </div>
            ))}
            {audit.movedParticipants.length === 0 ? (
              <div className="text-muted-foreground">No moved participants recorded.</div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

function PreviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function ReadinessFilterButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-md border px-3 py-2 text-sm font-semibold ${
        active
          ? "border-primary bg-emerald-50 text-primary"
          : "border-border bg-white text-muted-foreground hover:text-foreground"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function intakeIssueClass(severity: IntakeIssueSeverity) {
  if (severity === "blocker") return "bg-rose-100 text-rose-800";
  if (severity === "warning") return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-800";
}

function duplicatePriorityClass(priority: "high" | "medium" | "low") {
  if (priority === "high") return "bg-rose-100 text-rose-800";
  if (priority === "medium") return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-800";
}

function privacyStatusClass(status: PrivacyAuditStatus) {
  if (status === "ready") return "bg-emerald-100 text-emerald-800";
  if (status === "review") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function linkAuditStatusClass(status: ParticipantLinkAuditStatus) {
  if (status === "ready") return "bg-emerald-100 text-emerald-800";
  if (status === "review") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}
