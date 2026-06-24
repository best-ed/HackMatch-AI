import { Badge } from "@/components/ui";
import type { Participant, SavedMatchRun } from "@/lib/matching/types";
import { buildSavedRunRestorePreview } from "@/lib/saved-run-restore-preview";
import { buildSavedRunSharePreview } from "@/lib/saved-run-share";
import type { SavedRunIntegrityStatus, SavedRunIntegritySummary } from "@/lib/saved-run-integrity";

export function AdminSavedRunCard({
  active,
  activeCohort,
  currentParticipants,
  currentSettings,
  deleteConfirmId,
  integrity,
  noteDraft,
  onCancelDelete,
  onCancelRestore,
  onConfirmDelete,
  onCopySharePreview,
  onDuplicate,
  onMarkFinal,
  onRename,
  onRestore,
  onSaveNotes,
  onSelect,
  onSetDeleteConfirm,
  onUpdateNoteDraft,
  onUpdateRenameDraft,
  renameDraft,
  restorePreviewActive,
  run
}: {
  active: boolean;
  activeCohort: string;
  currentParticipants: Participant[];
  currentSettings: Parameters<typeof buildSavedRunRestorePreview>[0]["currentSettings"];
  deleteConfirmId: string;
  integrity?: SavedRunIntegritySummary;
  noteDraft: string;
  onCancelDelete: () => void;
  onCancelRestore: () => void;
  onConfirmDelete: () => void;
  onCopySharePreview: () => void;
  onDuplicate: () => void;
  onMarkFinal: () => void;
  onRename: () => void;
  onRestore: () => void;
  onSaveNotes: () => void;
  onSelect: () => void;
  onSetDeleteConfirm: () => void;
  onUpdateNoteDraft: (value: string) => void;
  onUpdateRenameDraft: (value: string) => void;
  renameDraft: string;
  restorePreviewActive: boolean;
  run: SavedMatchRun;
}) {
  const sharePreview = buildSavedRunSharePreview(run);

  return (
    <div className={`rounded-md border p-3 ${active ? "border-primary bg-emerald-50" : "border-border bg-white"}`}>
      <div className="mb-3 grid gap-3">
        <div className="rounded-md bg-muted p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">Share preview</div>
            <Badge className={sharePreview.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
              {sharePreview.status}
            </Badge>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {sharePreview.metrics.slice(1, 5).map((metric) => (
              <div key={metric.label}>
                <div className="font-bold">{metric.value}</div>
                <div className="text-muted-foreground">{metric.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-muted-foreground">
            {sharePreview.metrics.find((metric) => metric.label === "Contact sharing")?.value} contact records are shareable in this snapshot.
          </div>
        </div>
        {integrity ? <SavedRunIntegrityPanel integrity={integrity} /> : null}
        {restorePreviewActive ? (
          <SavedRunRestorePreviewPanel
            preview={buildSavedRunRestorePreview({
              activeCohort,
              currentParticipants,
              currentSettings,
              run
            })}
          />
        ) : null}
      </div>
      <button className="block w-full text-left" onClick={onSelect} type="button">
        <div className="font-semibold">{run.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">{formatDate(run.createdAt)}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>{run.cohort ?? "General"}</Badge>
          <Badge>{run.result.teams.length} teams</Badge>
          <Badge>{run.assignedCount}/{run.participantCount} assigned</Badge>
          <Badge>Avg {run.averageScore}</Badge>
          <Badge>{run.result.warnings.length} warning(s)</Badge>
          <Badge>{run.settingsSnapshot.lockedTeams?.length ?? 0} lock(s)</Badge>
          <Badge>Size {run.settingsSnapshot.desiredTeamSize}</Badge>
          {integrity ? (
            <Badge className={integrityBadgeClass(integrity.status)}>
              {integrity.status}
            </Badge>
          ) : null}
          {run.isFinal ? <Badge className="bg-emerald-100 text-emerald-800">Final</Badge> : null}
        </div>
      </button>
      <div className="mt-3 grid gap-2">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="rounded-md border border-border bg-white px-3 py-2 text-xs outline-none ring-primary/20 focus:ring-4"
            onChange={(event) => onUpdateRenameDraft(event.target.value)}
            value={renameDraft}
          />
          <button className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold" onClick={onRename} type="button">
            Rename
          </button>
        </div>
        <div className="grid gap-2">
          <label className="space-y-1 text-xs font-semibold">
            <span>Organizer notes</span>
            <textarea
              className="min-h-20 w-full rounded-md border border-border bg-white px-3 py-2 text-xs outline-none ring-primary/20 focus:ring-4"
              onChange={(event) => onUpdateNoteDraft(event.target.value)}
              placeholder="Final after mentor review, needs sponsor approval, or follow-up context"
              value={noteDraft}
            />
          </label>
          <button className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold" onClick={onSaveNotes} type="button">
            Save notes
          </button>
        </div>
        {run.notes ? (
          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {run.notes}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-md border px-3 py-2 text-xs font-semibold ${
              run.isFinal ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-white"
            }`}
            onClick={onMarkFinal}
            type="button"
          >
            {run.isFinal ? "Clear final" : "Mark final"}
          </button>
          <button className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold" onClick={onCopySharePreview} type="button">
            Copy share preview
          </button>
          <button className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold" onClick={onDuplicate} type="button">
            Duplicate
          </button>
          <button
            className={`rounded-md border px-3 py-2 text-xs font-semibold ${
              restorePreviewActive
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-border bg-white"
            }`}
            onClick={onRestore}
            type="button"
          >
            {restorePreviewActive ? "Confirm restore" : "Preview restore"}
          </button>
          {restorePreviewActive ? (
            <button className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold" onClick={onCancelRestore} type="button">
              Cancel restore
            </button>
          ) : null}
          {deleteConfirmId === run.id ? (
            <>
              <button className="rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold text-white" onClick={onConfirmDelete} type="button">
                Confirm delete
              </button>
              <button className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold" onClick={onCancelDelete} type="button">
                Cancel
              </button>
            </>
          ) : (
            <button className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-rose-700" onClick={onSetDeleteConfirm} type="button">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SavedRunIntegrityPanel({ integrity }: { integrity: SavedRunIntegritySummary }) {
  const leadCheck = integrity.checks.find((check) => check.status !== "verified") ?? integrity.checks[0];

  return (
    <div className="rounded-md border border-border bg-white p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">Integrity summary</div>
        <Badge className={integrityBadgeClass(integrity.status)}>
          {integrity.status}
        </Badge>
      </div>
      <p className="mt-2 text-muted-foreground">{leadCheck.detail}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {integrity.checks.map((check) => (
          <Badge key={check.label} className={integrityBadgeClass(check.status)}>
            {check.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function SavedRunRestorePreviewPanel({
  preview
}: {
  preview: ReturnType<typeof buildSavedRunRestorePreview>;
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
      <div className="font-semibold">Restore impact preview</div>
      <p className="mt-2 text-amber-900">{preview.summary}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <ReviewMetric label="Current records" value={preview.currentParticipantCount} />
        <ReviewMetric label="Restored records" value={preview.restoredParticipantCount} />
        <ReviewMetric label="Teams" value={preview.teamCount} />
        <ReviewMetric label="Warnings" value={preview.warningCount} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className={preview.cohortWillChange ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
          {preview.currentCohort} to {preview.restoredCohort}
        </Badge>
        <Badge className={preview.settingsWillChange ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
          {preview.settingsWillChange ? "settings change" : "settings match"}
        </Badge>
      </div>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function integrityBadgeClass(status: SavedRunIntegrityStatus) {
  if (status === "verified") return "bg-emerald-100 text-emerald-800";
  if (status === "review") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
