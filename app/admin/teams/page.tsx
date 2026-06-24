"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, GitCompareArrows, UsersRound } from "lucide-react";
import { AdminDataLoadNotice } from "@/components/admin-data-load-notice";
import { AdminPersistenceStatus } from "@/components/admin-persistence-status";
import { AdminSavedRunCard } from "@/components/admin-saved-run-card";
import {
  ExportAuditPanel,
  FinalizationGatePanel,
  OperationsHistoryPanel,
  ReviewBriefPanel,
  TeamLocksPanel,
  TeamRunScopePanel
} from "@/components/admin-team-review-panels";
import { SectionTrail } from "@/components/section-trail";
import { Badge, Card, EmptyState } from "@/components/ui";
import {
  persistAdminAuditEntry,
  readAdminAuditHistory,
  type AdminAuditAction,
  type AdminAuditEntry
} from "@/lib/admin-audit-history";
import type { ExplanationServiceResult } from "@/lib/ai/explanation-service";
import { clipboardStatusMessage, copyTextToClipboard } from "@/lib/clipboard";
import { buildCohortHandoffPacket } from "@/lib/cohort-handoff-packet";
import { buildTeamExportAudit, buildTeamExportGate } from "@/lib/export-audit";
import { buildTeamCsvArtifact } from "@/lib/export";
import { evaluateCohortFinalizationGate } from "@/lib/cohort-finalization";
import { useHackMatchData } from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";
import type { MatchingResult, Participant, SavedMatchRun, TeamExplanation } from "@/lib/matching/types";
import { compareSavedRunToLive, describeSavedRunComparison } from "@/lib/saved-run-comparison";
import { buildSavedRunRestorePreview } from "@/lib/saved-run-restore-preview";
import { buildSavedRunSharePreview } from "@/lib/saved-run-share";
import {
  summarizeSavedRunIntegrity,
  summarizeSavedRunIntegrityOverview
} from "@/lib/saved-run-integrity";
import {
  filterSavedRuns,
  summarizeSavedRunVisibilityCounts,
  type SavedRunVisibilityFilter
} from "@/lib/saved-run-visibility";
import { summarizeTeamBalance, type TeamBalanceSignal } from "@/lib/team-balance";
import { buildTeamPlacementExplanations } from "@/lib/team-placement";
import {
  checklistCompletion,
  checklistIsComplete,
  emptyTeamReviewChecklist,
  updateTeamReviewChecklist,
  type TeamReviewChecklistItem,
  type TeamReviewChecklistStore
} from "@/lib/team-review-checklist";
import { summarizeTeamReview } from "@/lib/team-review";
import {
  isSupabaseConfigured,
  loadRemoteTeamReviewChecklists,
  saveRemoteTeamReviewChecklist
} from "@/lib/supabase-store";

const teamReviewChecklistStorageKey = "hackmatch.teamReviewChecklist.v1";
export default function AdminTeamsPage() {
  const {
    cohortParticipants,
    participants,
    settings,
    setSettings,
    savedMatchRuns,
    saveMatchRun,
    deleteMatchRun,
    renameMatchRun,
    updateMatchRunNotes,
    markMatchRunFinal,
    clearFinalMatchRun,
    duplicateMatchRun,
    restoreMatchRunSnapshot,
    activeCohort,
    setActiveCohort,
    cohorts,
    loaded,
    persistenceMode,
    persistenceWarning
  } = useHackMatchData();
  const result = useMemo(
    () => generateTeams(cohortParticipants, settings),
    [cohortParticipants, settings]
  );
  const lockedTeams = settings.lockedTeams ?? [];
  const [activeRunId, setActiveRunId] = useState("live");
  const activeRun = savedMatchRuns.find((run) => run.id === activeRunId);
  const activeResult = activeRun?.result ?? result;
  const activeParticipants = activeRun?.participantsSnapshot ?? cohortParticipants;
  const reviewSummary = useMemo(
    () => summarizeTeamReview(activeResult, activeParticipants),
    [activeParticipants, activeResult]
  );
  const isViewingSavedRun = Boolean(activeRun);
  const heading = activeRun?.name ?? "Team review";
  const exportCohort = activeRun?.cohort ?? activeCohort;
  const exportAudit = useMemo(
    () =>
      buildTeamExportAudit({
        result: activeResult,
        participants: activeParticipants,
        cohort: exportCohort,
        scope: isViewingSavedRun ? "saved" : "live",
        lockedTeamCount: isViewingSavedRun
          ? activeRun?.settingsSnapshot.lockedTeams?.length ?? 0
          : lockedTeams.length
      }),
    [activeParticipants, activeResult, activeRun?.settingsSnapshot.lockedTeams?.length, exportCohort, isViewingSavedRun, lockedTeams.length]
  );
  const exportGate = useMemo(() => buildTeamExportGate(exportAudit), [exportAudit]);
  const csvArtifact = useMemo(
    () =>
      buildTeamCsvArtifact({
        cohort: exportCohort,
        participants: activeParticipants,
        result: activeResult,
        scope: isViewingSavedRun ? "saved" : "live"
      }),
    [activeParticipants, activeResult, exportCohort, isViewingSavedRun]
  );
  const csv = csvArtifact.csv;
  const csvPreview = csv.split("\n").slice(0, 4).join("\n");
  const [explanations, setExplanations] = useState<TeamExplanation[]>(activeResult.explanations);
  const [explanationProvider, setExplanationProvider] = useState<"fallback" | "openai">("fallback");
  const [explanationModel, setExplanationModel] = useState<string | undefined>();
  const [explanationWarnings, setExplanationWarnings] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runName, setRunName] = useState("");
  const [compareRunId, setCompareRunId] = useState("");
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState("");
  const [restorePreviewId, setRestorePreviewId] = useState("");
  const [runActionStatus, setRunActionStatus] = useState("");
  const [savedRunQuery, setSavedRunQuery] = useState("");
  const [savedRunVisibility, setSavedRunVisibility] = useState<SavedRunVisibilityFilter>("all");
  const [exportStatus, setExportStatus] = useState("");
  const [exportConfirmationArmed, setExportConfirmationArmed] = useState(false);
  const [checklistSyncStatus, setChecklistSyncStatus] = useState("");
  const [teamReviewChecklist, setTeamReviewChecklist] = useState<TeamReviewChecklistStore>({});
  const [auditHistory, setAuditHistory] = useState<AdminAuditEntry[]>([]);
  const compareRun = savedMatchRuns.find((run) => run.id === compareRunId) ?? savedMatchRuns[0];
  const savedRunIntegritySummaries = useMemo(
    () =>
      savedMatchRuns.map((run) =>
        summarizeSavedRunIntegrity({
          run,
          currentParticipants: cohortParticipants,
          currentSettings: settings,
          activeCohort
        })
      ),
    [activeCohort, cohortParticipants, savedMatchRuns, settings]
  );
  const savedRunIntegrityById = useMemo(
    () => new Map(savedRunIntegritySummaries.map((summary) => [summary.runId, summary])),
    [savedRunIntegritySummaries]
  );
  const savedRunIntegrityOverview = useMemo(
    () => summarizeSavedRunIntegrityOverview(savedRunIntegritySummaries),
    [savedRunIntegritySummaries]
  );
  const savedRunVisibilityCounts = useMemo(
    () =>
      summarizeSavedRunVisibilityCounts({
        activeCohort,
        integrityById: savedRunIntegrityById,
        runs: savedMatchRuns
      }),
    [activeCohort, savedMatchRuns, savedRunIntegrityById]
  );
  const visibleSavedRuns = useMemo(
    () =>
      filterSavedRuns({
        activeCohort,
        filter: savedRunVisibility,
        integrityById: savedRunIntegrityById,
        query: savedRunQuery,
        runs: savedMatchRuns
      }),
    [activeCohort, savedRunIntegrityById, savedRunQuery, savedMatchRuns, savedRunVisibility]
  );
  const finalizationGate = useMemo(
    () =>
      evaluateCohortFinalizationGate({
        cohort: activeCohort,
        participants: cohortParticipants,
        settings,
        result,
        savedRuns: savedMatchRuns
      }),
    [activeCohort, cohortParticipants, result, savedMatchRuns, settings]
  );
  const cohortHandoffPacket = useMemo(
    () =>
      buildCohortHandoffPacket({
        cohort: exportCohort,
        participants: activeParticipants,
        result: activeResult,
        run: activeRun
      }),
    [activeParticipants, activeResult, activeRun, exportCohort]
  );
  const comparison = compareRun
    ? compareSavedRunToLive({
        liveResult: result,
        liveParticipants: cohortParticipants,
        liveSettings: settings,
        savedResult: compareRun.result,
        savedParticipants: compareRun.participantsSnapshot,
        savedSettings: compareRun.settingsSnapshot
      })
    : null;

  useEffect(() => {
    setExplanations(activeResult.explanations);
    setExplanationProvider("fallback");
    setExplanationModel(undefined);
    setExplanationWarnings([]);
  }, [activeResult.explanations]);

  useEffect(() => {
    if (!savedMatchRuns.length) {
      setCompareRunId("");
      return;
    }
    if (!savedMatchRuns.some((run) => run.id === compareRunId)) {
      setCompareRunId(savedMatchRuns[0].id);
    }
  }, [compareRunId, savedMatchRuns]);

  useEffect(() => {
    try {
      const localChecklist = JSON.parse(window.localStorage.getItem(teamReviewChecklistStorageKey) ?? "{}") as TeamReviewChecklistStore;
      setTeamReviewChecklist(localChecklist);
      if (isSupabaseConfigured()) {
        void loadRemoteTeamReviewChecklists()
          .then((remoteChecklist) => {
            const next = { ...localChecklist, ...remoteChecklist };
            setTeamReviewChecklist(next);
            window.localStorage.setItem(teamReviewChecklistStorageKey, JSON.stringify(next));
            setChecklistSyncStatus("Team review checklist loaded from Supabase.");
          })
          .catch(() => setChecklistSyncStatus("Team review checklist is using local browser storage."));
      }
    } catch {
      setTeamReviewChecklist({});
    }
  }, []);

  useEffect(() => {
    try {
      setAuditHistory(readAdminAuditHistory());
    } catch {
      setAuditHistory([]);
    }
  }, []);

  function recordAudit(action: AdminAuditAction, label: string, detail: string) {
    const next = persistAdminAuditEntry({ action, label, detail });
    setAuditHistory(next);
  }

  function downloadCsv() {
    if (!exportGate.canDownload) {
      setExportConfirmationArmed(false);
      setExportStatus(exportGate.message);
      return;
    }

    if (exportGate.requiresConfirmation && !exportConfirmationArmed) {
      setExportConfirmationArmed(true);
      setExportStatus(`${exportGate.message} Click again to confirm this CSV export.`);
      return;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = csvArtifact.filename;
    link.click();
    URL.revokeObjectURL(url);
    setExportConfirmationArmed(false);
    setExportStatus(`Downloaded ${csvArtifact.filename}.`);
    recordAudit(
      "export-teams",
      csvArtifact.filename,
      `Downloaded ${isViewingSavedRun ? "saved-run" : "live"} team export for ${exportCohort}.`
    );
  }

  async function refreshExplanations() {
    if (isViewingSavedRun) {
      setExplanationWarnings(["Saved runs are frozen snapshots. Switch to live generated teams to refresh explanations."]);
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await fetch("/api/explanations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ participants: cohortParticipants, settings })
      });
      if (!response.ok) {
        setExplanationWarnings(["Explanation API request failed; showing deterministic fallback explanations."]);
        setExplanations(result.explanations);
        setExplanationProvider("fallback");
        return;
      }
      const payload = (await response.json()) as ExplanationServiceResult;
      setExplanations(payload.explanations);
      setExplanationProvider(payload.provider);
      setExplanationModel(payload.model);
      setExplanationWarnings(payload.warnings);
    } catch {
      setExplanationWarnings(["Explanation API request could not be completed; showing deterministic fallback explanations."]);
      setExplanations(result.explanations);
      setExplanationProvider("fallback");
      setExplanationModel(undefined);
    } finally {
      setIsRefreshing(false);
    }
  }

  function saveCurrentRun() {
    const run = saveMatchRun(result, runName);
    setRunName("");
    setActiveRunId(run.id);
    recordAudit("saved-run", run.name, `Saved ${run.result.teams.length} teams for ${run.cohort ?? "General"}.`);
  }

  function toggleTeamLock(teamId: string) {
    const currentLockedTeams = settings.lockedTeams ?? [];
    const isLocked = currentLockedTeams.some((team) => team.id === teamId);
    if (isLocked) {
      setSettings({
        ...settings,
        lockedTeams: currentLockedTeams.filter((team) => team.id !== teamId)
      });
      recordAudit("locked-team", teamId, "Unlocked team membership for future regeneration.");
      return;
    }

    const teamToLock = result.teams.find((team) => team.id === teamId);
    if (!teamToLock) return;
    setSettings({
      ...settings,
      lockedTeams: [
        ...currentLockedTeams,
        {
          id: teamToLock.id,
          name: teamToLock.name,
          participantIds: [...teamToLock.participantIds].sort(),
          locked: true
        }
      ].sort((left, right) => left.id.localeCompare(right.id))
    });
    recordAudit("locked-team", teamToLock.name, "Locked team membership for future regeneration.");
  }

  function removeRun(run: SavedMatchRun) {
    deleteMatchRun(run.id);
    setDeleteConfirmId("");
    setRunActionStatus(`Deleted ${run.name}.`);
    recordAudit("deleted-run", run.name, `Deleted saved run from ${run.cohort ?? "General"}.`);
    if (activeRunId === run.id) {
      setActiveRunId("live");
    }
  }

  function renameRun(run: SavedMatchRun) {
    const nextName = renameDrafts[run.id] ?? run.name;
    renameMatchRun(run.id, nextName);
    setRenameDrafts((current) => {
      const next = { ...current };
      delete next[run.id];
      return next;
    });
    setRunActionStatus(`Renamed saved run to ${nextName.trim()}.`);
    recordAudit("renamed-run", run.name, `Renamed saved run to ${nextName.trim()}.`);
  }

  function duplicateRun(run: SavedMatchRun) {
    const copy = duplicateMatchRun(run.id);
    if (!copy) return;
    setActiveRunId(copy.id);
    setCompareRunId(copy.id);
    setRunActionStatus(`Duplicated ${run.name} as ${copy.name}.`);
    recordAudit("duplicated-run", run.name, `Duplicated as ${copy.name}.`);
  }

  function saveRunNotes(run: SavedMatchRun) {
    const note = noteDrafts[run.id] ?? run.notes ?? "";
    updateMatchRunNotes(run.id, note);
    setRunActionStatus(note.trim() ? `Saved notes for ${run.name}.` : `Cleared notes for ${run.name}.`);
    recordAudit("noted-run", run.name, note.trim() ? "Saved organizer notes." : "Cleared organizer notes.");
  }

  function toggleFinalRun(run: SavedMatchRun) {
    if (run.isFinal) {
      clearFinalMatchRun();
      setRunActionStatus(`Cleared final marker from ${run.name}.`);
      recordAudit("final-run", run.name, "Cleared final saved-run marker.");
      return;
    }
    markMatchRunFinal(run.id);
    setRunActionStatus(`${run.name} is now marked as the final saved run.`);
    recordAudit("final-run", run.name, "Marked as the final organizer-approved run.");
  }

  function checklistKey(teamId: string) {
    return `${activeRun?.id ?? `live-${activeCohort}`}::${teamId}`;
  }

  function updateChecklist(teamId: string, patch: Partial<TeamReviewChecklistItem>) {
    const key = checklistKey(teamId);
    const next = updateTeamReviewChecklist(teamReviewChecklist, key, patch);
    setTeamReviewChecklist(next);
    window.localStorage.setItem(teamReviewChecklistStorageKey, JSON.stringify(next));
    if (isSupabaseConfigured()) {
      void saveRemoteTeamReviewChecklist(key, next[key])
        .then(() => setChecklistSyncStatus("Team review checklist synced to Supabase."))
        .catch(() => setChecklistSyncStatus("Team review checklist saved locally; Supabase sync failed."));
    }
    recordAudit("checklist", teamId, checklistPatchDetail(patch));
  }

  function restoreRun(run: SavedMatchRun) {
    if (restorePreviewId !== run.id) {
      const preview = buildSavedRunRestorePreview({
        activeCohort,
        currentParticipants: participants,
        currentSettings: settings,
        run
      });
      setRestorePreviewId(run.id);
      setRunActionStatus(`${preview.summary} Click confirm restore to replace the live baseline.`);
      return;
    }

    restoreMatchRunSnapshot(run.id);
    setActiveRunId("live");
    setRestorePreviewId("");
    setRunActionStatus(`Restored ${run.name} as the live baseline.`);
    recordAudit("restored-run", run.name, "Restored participant snapshot, settings snapshot, and cohort as live baseline.");
  }

  function cancelRestorePreview(run: SavedMatchRun) {
    setRestorePreviewId("");
    setRunActionStatus(`Restore cancelled for ${run.name}.`);
  }

  async function copySavedRunSharePreview(run: SavedMatchRun) {
    const preview = buildSavedRunSharePreview(run);
    const result = await copyTextToClipboard(preview.text);
    setRunActionStatus(clipboardStatusMessage(result, `Copied share preview for ${run.name}.`));
    if (result.ok) {
      recordAudit("shared-run", run.name, "Copied saved-run share preview.");
    }
  }

  async function copyCohortHandoffPacket() {
    const result = await copyTextToClipboard(cohortHandoffPacket.text);
    setRunActionStatus(clipboardStatusMessage(result, `Copied ${cohortHandoffPacket.title}.`));
  }

  async function copyTeamSummary(
    teamName: string,
    members: Participant[],
    explanation?: TeamExplanation
  ) {
    const summary = [
      `${teamName}`,
      `Members: ${members.map((member) => `${member.fullName} (${member.primaryRole})`).join(", ")}`,
      explanation ? `Why this team: ${explanation.summary}` : "",
      explanation ? `Suggested direction: ${explanation.suggestedProjectDirection}` : ""
    ].filter(Boolean).join("\n");

    const result = await copyTextToClipboard(summary);
    setRunActionStatus(clipboardStatusMessage(result, `Copied summary for ${teamName}.`));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionTrail items={[{ href: "/admin", label: "Admin" }, { label: "Team review" }]} />
          <h1 className="text-3xl font-bold tracking-tight">
            {heading}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isViewingSavedRun
              ? `Frozen match run saved ${formatDate(activeRun?.createdAt ?? "")}. Exports use this exact snapshot.`
              : "Review live assignments, score breakdowns, explanations, locks, and exports from edited data."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-56 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            value={runName}
            onChange={(event) => setRunName(event.target.value)}
            placeholder={`Match run ${savedMatchRuns.length + 1}`}
          />
          <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={saveCurrentRun}>
            Save generated teams
          </button>
          <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={refreshExplanations} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh explanations"}
          </button>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!exportGate.canDownload}
            onClick={downloadCsv}
          >
            {exportConfirmationArmed ? "Confirm download" : exportGate.buttonLabel}
          </button>
        </div>
      </div>
      <AdminPersistenceStatus
        mode={persistenceMode}
        warning={persistenceWarning}
        detail="Live generated teams and saved match runs are kept in local browser storage; participant and settings data can sync to Supabase when configured."
      />
      <AdminDataLoadNotice loaded={loaded} label="team review data" />
      {checklistSyncStatus ? (
        <Card className="border-sky-200 bg-sky-50 py-3 text-sm font-medium text-sky-900">
          {checklistSyncStatus}
        </Card>
      ) : null}
      {exportStatus ? (
        <Card className={`py-3 text-sm font-medium ${
          exportGate.status === "blocked"
            ? "border-rose-200 bg-rose-50 text-rose-900"
            : exportGate.status === "review"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}>
          {exportStatus}
        </Card>
      ) : null}
      <TeamRunScopePanel
        activeCohort={activeCohort}
        activeRunCohort={activeRun?.cohort}
        cohortParticipantCount={cohortParticipants.length}
        cohorts={cohorts}
        isViewingSavedRun={isViewingSavedRun}
        onSetActiveCohort={setActiveCohort}
      />
      {!isViewingSavedRun ? <TeamLocksPanel lockedCount={lockedTeams.length} /> : null}
      {!isViewingSavedRun ? <FinalizationGatePanel gate={finalizationGate} /> : null}
      <ReviewBriefPanel summary={reviewSummary} />
      <OperationsHistoryPanel history={auditHistory} />
      <ExportAuditPanel audit={exportAudit} />
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Cohort handoff packet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A copy-ready organizer summary for the current live view or saved run snapshot.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={cohortHandoffPacket.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
              {cohortHandoffPacket.status}
            </Badge>
            <button
              className="rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold"
              onClick={() => void copyCohortHandoffPacket()}
              type="button"
            >
              Copy packet
            </button>
          </div>
        </div>
        <div className="grid gap-2">
          {cohortHandoffPacket.bullets.map((bullet) => (
            <div className="rounded-md border border-border bg-white px-3 py-3 text-sm text-muted-foreground" key={bullet}>
              {bullet}
            </div>
          ))}
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Match run view</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save a generated run to freeze teams, scores, warnings, explanations, and export output.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{savedMatchRuns.length} saved</Badge>
            <Badge>{visibleSavedRuns.length} visible</Badge>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <ReviewMetric label="Verified" value={savedRunIntegrityOverview.verified} />
          <ReviewMetric label="Review" value={savedRunIntegrityOverview.review} />
          <ReviewMetric label="Stale" value={savedRunIntegrityOverview.stale} />
          <ReviewMetric label="Total runs" value={savedRunIntegrityOverview.total} />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="space-y-2 text-sm font-medium">
            <span>Search saved runs</span>
            <input
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              onChange={(event) => setSavedRunQuery(event.target.value)}
              placeholder="Run name, cohort, note, or integrity status"
              value={savedRunQuery}
            />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            {([
              ["all", `All (${savedRunVisibilityCounts.all})`],
              ["active-cohort", `Active cohort (${savedRunVisibilityCounts["active-cohort"]})`],
              ["final", `Final (${savedRunVisibilityCounts.final})`],
              ["attention", `Attention (${savedRunVisibilityCounts.attention})`]
            ] as Array<[SavedRunVisibilityFilter, string]>).map(([value, label]) => (
              <button
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  savedRunVisibility === value
                    ? "border-primary bg-emerald-50 text-primary"
                    : "border-border bg-white text-muted-foreground hover:text-foreground"
                }`}
                key={value}
                onClick={() => setSavedRunVisibility(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {runActionStatus ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
            {runActionStatus}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
          <button
            className={runButtonClass(activeRunId === "live")}
            onClick={() => setActiveRunId("live")}
            type="button"
          >
            Live generated teams
          </button>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {visibleSavedRuns.map((run) => (
              <AdminSavedRunCard
                active={activeRunId === run.id}
                activeCohort={activeCohort}
                currentParticipants={participants}
                currentSettings={settings}
                deleteConfirmId={deleteConfirmId}
                integrity={savedRunIntegrityById.get(run.id)}
                key={run.id}
                noteDraft={noteDrafts[run.id] ?? run.notes ?? ""}
                onCancelDelete={() => setDeleteConfirmId("")}
                onCancelRestore={() => cancelRestorePreview(run)}
                onConfirmDelete={() => removeRun(run)}
                onCopySharePreview={() => void copySavedRunSharePreview(run)}
                onDuplicate={() => duplicateRun(run)}
                onMarkFinal={() => toggleFinalRun(run)}
                onRename={() => renameRun(run)}
                onRestore={() => restoreRun(run)}
                onSaveNotes={() => saveRunNotes(run)}
                onSelect={() => setActiveRunId(run.id)}
                onSetDeleteConfirm={() => setDeleteConfirmId(run.id)}
                onUpdateNoteDraft={(value) => setNoteDrafts((current) => ({ ...current, [run.id]: value }))}
                onUpdateRenameDraft={(value) => setRenameDrafts((current) => ({ ...current, [run.id]: value }))}
                renameDraft={renameDrafts[run.id] ?? run.name}
                restorePreviewActive={restorePreviewId === run.id}
                run={run}
              />
            ))}
            {savedMatchRuns.length === 0 ? (
              <EmptyState
                action={
                  <button
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    onClick={saveCurrentRun}
                    type="button"
                  >
                    Save current run
                  </button>
                }
                className="md:col-span-2 xl:col-span-3"
                description="Freeze the current generated teams before editing participants, changing settings, or sharing results."
                icon={<Archive size={20} />}
                title="No saved match runs yet"
              />
            ) : visibleSavedRuns.length === 0 ? (
              <EmptyState
                action={
                  <button
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    onClick={() => {
                      setSavedRunQuery("");
                      setSavedRunVisibility("all");
                    }}
                    type="button"
                  >
                    Clear run filters
                  </button>
                }
                className="md:col-span-2 xl:col-span-3"
                description="No saved runs match the current visibility filter or search query."
                icon={<Archive size={20} />}
                title="No saved runs in view"
              />
            ) : null}
          </div>
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Run comparison</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare the current live generated teams against a saved run before choosing which one to use.
            </p>
          </div>
          <label className="space-y-2 text-sm font-medium">
            <span>Saved run</span>
            <select
              className="w-72 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
              disabled={!savedMatchRuns.length}
              onChange={(event) => setCompareRunId(event.target.value)}
              value={compareRun?.id ?? ""}
            >
              {savedMatchRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.name} - {formatDate(run.createdAt)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {comparison && compareRun ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <CompareMetric label="Average score" current={comparison.live.averageScore} saved={comparison.saved.averageScore} />
              <CompareMetric label="Assigned" current={comparison.live.assignedCount} saved={comparison.saved.assignedCount} />
              <CompareMetric label="Unassigned" current={comparison.live.unassignedCount} saved={comparison.saved.unassignedCount} invert />
              <CompareMetric label="Teams" current={comparison.live.teamCount} saved={comparison.saved.teamCount} />
              <CompareMetric label="Warnings" current={comparison.live.warningCount} saved={comparison.saved.warningCount} invert />
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-md border border-border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Quality read</h3>
                  <Badge className={comparison.scoreDelta >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                    {comparison.scoreDelta >= 0 ? "+" : ""}{comparison.scoreDelta} avg score
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {describeSavedRunComparison(comparison, compareRun.name)}
                </p>
              </div>
              <div className="rounded-md border border-border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Moved participants</h3>
                  <Badge>{comparison.movedParticipants.length} moved</Badge>
                </div>
                {comparison.movedParticipants.length ? (
                  <div className="mt-3 max-h-40 space-y-2 overflow-auto text-sm">
                    {comparison.movedParticipants.slice(0, 8).map((move) => (
                      <div key={move.id} className="flex flex-wrap justify-between gap-2 rounded-md bg-muted px-3 py-2">
                        <span className="font-medium">{move.name}</span>
                        <span className="text-muted-foreground">{move.savedTeam} {"->"} {move.liveTeam}</span>
                      </div>
                    ))}
                    {comparison.movedParticipants.length > 8 ? (
                      <div className="text-xs text-muted-foreground">
                        +{comparison.movedParticipants.length - 8} more moved participants
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No participant team changes against {compareRun.name}.
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-md border border-border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">Participant snapshot drift</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{comparison.addedParticipants.length} added</Badge>
                    <Badge>{comparison.removedParticipants.length} removed</Badge>
                  </div>
                </div>
                {comparison.addedParticipants.length || comparison.removedParticipants.length ? (
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    <DriftList title="Added live" items={comparison.addedParticipants.map((item) => item.name)} />
                    <DriftList title="Only in saved run" items={comparison.removedParticipants.map((item) => item.name)} />
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Live participant snapshot matches {compareRun.name}.
                  </p>
                )}
              </div>
              <div className="rounded-md border border-border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">Settings differences</h3>
                  <Badge>{comparison.settingsChanges.length} changed</Badge>
                </div>
                {comparison.settingsChanges.length ? (
                  <div className="mt-3 max-h-48 space-y-2 overflow-auto text-sm">
                    {comparison.settingsChanges.slice(0, 8).map((change) => (
                      <div key={change.label} className="rounded-md bg-muted px-3 py-2">
                        <div className="font-medium">{change.label}</div>
                        <div className="mt-1 text-muted-foreground">
                          Live {change.liveValue} / saved {change.savedValue}
                        </div>
                      </div>
                    ))}
                    {comparison.settingsChanges.length > 8 ? (
                      <div className="text-xs text-muted-foreground">
                        +{comparison.settingsChanges.length - 8} more setting changes
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Live settings match the selected saved run.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            description="Save one generated run first, then this panel will show score, assignment, warning, and participant movement differences."
            icon={<GitCompareArrows size={20} />}
            title="No saved run available for comparison"
          />
        )}
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Explanation provider</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Team assignment remains deterministic; this layer only explains already-generated teams.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={explanationProvider === "openai" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}>
            {explanationProvider === "openai" ? "OpenAI" : "Deterministic fallback"}
          </Badge>
          {explanationModel ? <Badge>{explanationModel}</Badge> : null}
        </div>
      </Card>
      {explanationWarnings.length > 0 ? (
        <Card>
          <h2 className="font-semibold">Explanation warnings</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {explanationWarnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </Card>
      ) : null}
      {activeResult.teams.length ? (
        <div className="grid gap-5">
          {activeResult.teams.map((team) => {
          const explanation = explanations.find((item) => item.teamId === team.id);
          const members = team.participantIds
            .map((id) => activeParticipants.find((item) => item.id === id))
            .filter((participant): participant is Participant => Boolean(participant));
          const placementExplanations = buildTeamPlacementExplanations(members);
          const balanceSummary = summarizeTeamBalance(members, team.score);
          const risks = getTeamRisks(team.score?.totalScore ?? 0, explanation);
          const checklist = teamReviewChecklist[checklistKey(team.id)] ?? emptyTeamReviewChecklist;
          const completion = checklistCompletion(checklist);
          return (
            <Card key={team.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{team.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {team.locked ? (
                      <Badge className="bg-sky-100 text-sky-800">Locked</Badge>
                    ) : null}
                    <Badge className={scoreBadgeClass(team.score?.totalScore ?? 0)}>
                      Overall {team.score?.totalScore}
                    </Badge>
                    {risks.map((risk) => (
                      <Badge key={risk} className="bg-amber-100 text-amber-800">{risk}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isViewingSavedRun ? (
                    <button
                      className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                        team.locked ? "border-sky-200 bg-sky-50 text-sky-800" : "border-border bg-white"
                      }`}
                      onClick={() => toggleTeamLock(team.id)}
                      type="button"
                    >
                      {team.locked ? "Unlock team" : "Lock team"}
                    </button>
                  ) : null}
                  <button
                    className="rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold"
                    onClick={() => void copyTeamSummary(team.name, members, explanation)}
                    type="button"
                  >
                    Copy summary
                  </button>
                </div>
              </div>
              <div className="rounded-md border border-border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Organizer review checklist</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Manual review state for this team; it does not change matching output.
                    </p>
                  </div>
                  <Badge className={checklistIsComplete(checklist) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                    {completion}/4 complete
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <ChecklistToggle
                    checked={checklist.rolesConfirmed}
                    label="Roles confirmed"
                    onChange={(value) => updateChecklist(team.id, { rolesConfirmed: value })}
                  />
                  <ChecklistToggle
                    checked={checklist.contactsConfirmed}
                    label="Contact sharing checked"
                    onChange={(value) => updateChecklist(team.id, { contactsConfirmed: value })}
                  />
                  <ChecklistToggle
                    checked={checklist.blockersCleared}
                    label="No blockers"
                    onChange={(value) => updateChecklist(team.id, { blockersCleared: value })}
                  />
                  <ChecklistToggle
                    checked={checklist.reviewed}
                    label="Marked reviewed"
                    onChange={(value) => updateChecklist(team.id, { reviewed: value })}
                  />
                </div>
              </div>
              <div className="grid gap-3 rounded-md border border-border bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
                {balanceSummary.signals.map((signal) => (
                  <BalanceSignalBar key={signal.label} signal={signal} />
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {members.map((participant) => (
                  <div key={participant.id} className="rounded-md border border-border p-3">
                    <div className="font-medium">{participant.fullName}</div>
                    <div className="text-sm text-muted-foreground">{participant.primaryRole} - {participant.experienceLevel}</div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {participant.technicalSkills.slice(0, 3).map((skill) => (
                        <Badge key={skill}>{skill}</Badge>
                      ))}
                    </div>
                    <div className="mt-3 rounded-md bg-muted p-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Placement note</div>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {(placementExplanations.find((item) => item.participantId === participant.id)?.reasons ?? []).map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
              {team.score ? (
                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <ScoreBar label="Role coverage" value={team.score.roleCoverageScore} />
                  <ScoreBar label="Skill coverage" value={team.score.skillCoverageScore} />
                  <ScoreBar label="Experience balance" value={team.score.experienceBalanceScore} />
                  <ScoreBar label="Interest alignment" value={team.score.interestAlignmentScore} />
                  <ScoreBar label="Availability" value={team.score.availabilityCompatibilityScore} />
                  <ScoreBar label="Preferences" value={team.score.preferenceSatisfactionScore} />
                  <ScoreBar label="Penalty" value={team.score.constraintPenalty} invert />
                </div>
              ) : null}
              {explanation ? (
                <div className="grid gap-4 rounded-md bg-muted p-4 text-sm lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-3">
                    <div>
                      <div className="font-semibold">
                        {explanationProvider === "openai" ? "AI explanation" : "Fallback explanation"}
                      </div>
                      <p className="mt-1 text-muted-foreground">{explanation.summary}</p>
                    </div>
                    <ReviewList title="Strengths" items={explanation.strengths} />
                    <ReviewList title="Watch points" items={explanation.weaknesses} />
                    {explanation.warnings.length > 0 ? <ReviewList title="Warnings" items={explanation.warnings} /> : null}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="font-semibold">Suggested direction</div>
                      <p className="mt-1 text-muted-foreground">{explanation.suggestedProjectDirection}</p>
                    </div>
                    <div>
                      <div className="font-semibold">Suggested internal roles</div>
                      <div className="mt-2 grid gap-2">
                        {Object.entries(explanation.suggestedInternalRoles).map(([name, role]) => (
                          <div key={name} className="flex justify-between gap-3 rounded-md bg-white px-3 py-2">
                            <span>{name}</span>
                            <span className="text-right text-muted-foreground">{role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          );
          })}
        </div>
      ) : (
        <EmptyState
          action={
            <a className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/admin/matching">
              Open match setup
            </a>
          }
          description="Add matchable participants to the active cohort or loosen settings, then regenerate deterministic teams."
          icon={<UsersRound size={20} />}
          title="No generated teams to review"
        />
      )}
      <Card>
        <h2 className="font-semibold">CSV preview</h2>
        <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-xs text-white">{csvPreview}</pre>
      </Card>
    </div>
  );
}

function CompareMetric({
  label,
  current,
  saved,
  invert = false
}: {
  label: string;
  current: number;
  saved: number;
  invert?: boolean;
}) {
  const delta = current - saved;
  const isImprovement = invert ? delta <= 0 : delta >= 0;
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold">{current}</div>
          <div className="text-xs text-muted-foreground">Live</div>
        </div>
        <div className="text-right">
          <div className={isImprovement ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
            {delta >= 0 ? "+" : ""}{delta}
          </div>
          <div className="text-xs text-muted-foreground">vs saved {saved}</div>
        </div>
      </div>
    </div>
  );
}

function DriftList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <div className="font-semibold">{title}</div>
      {items.length ? (
        <div className="mt-2 space-y-1">
          {items.slice(0, 6).map((item) => (
            <div className="text-muted-foreground" key={item}>{item}</div>
          ))}
          {items.length > 6 ? (
            <div className="text-xs text-muted-foreground">+{items.length - 6} more</div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 text-muted-foreground">No changes.</div>
      )}
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

function BalanceSignalBar({ signal }: { signal: TeamBalanceSignal }) {
  const value = Math.max(0, Math.min(100, signal.value));
  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{signal.label}</div>
          <div className="text-xs text-muted-foreground">{signal.detail}</div>
        </div>
        <Badge className={balanceSignalClass(signal.status)}>{value}</Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${balanceSignalFillClass(signal.status)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ChecklistToggle({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
      checked ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-muted text-muted-foreground"
    }`}>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

function checklistPatchDetail(patch: Partial<TeamReviewChecklistItem>) {
  const [key, value] = Object.entries(patch)[0] ?? ["review", false];
  const label: Record<string, string> = {
    rolesConfirmed: "roles confirmed",
    contactsConfirmed: "contact sharing checked",
    blockersCleared: "blockers cleared",
    reviewed: "marked reviewed"
  };
  return `${value ? "Checked" : "Unchecked"} ${label[key] ?? "review item"}.`;
}

function balanceSignalClass(status: TeamBalanceSignal["status"]) {
  if (status === "strong") return "bg-emerald-100 text-emerald-800";
  if (status === "review") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function balanceSignalFillClass(status: TeamBalanceSignal["status"]) {
  if (status === "strong") return "bg-primary";
  if (status === "review") return "bg-amber-500";
  return "bg-rose-500";
}

function ScoreBar({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const normalized = Math.max(0, Math.min(100, value));
  const healthy = invert ? value <= 10 : value >= 75;
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="font-medium">{label}</div>
        <div className={healthy ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>{value}</div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${healthy ? "bg-primary" : "bg-amber-500"}`}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="font-semibold">{title}</div>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function getTeamRisks(score: number, explanation?: TeamExplanation) {
  const risks: string[] = [];
  if (score < 75) risks.push("Review score");
  if (explanation?.warnings.length) risks.push("Has warnings");
  if ((explanation?.weaknesses.length ?? 0) >= 2) risks.push("Watch points");
  return risks;
}

function scoreBadgeClass(score: number) {
  if (score >= 85) return "bg-emerald-100 text-emerald-800";
  if (score >= 75) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function runButtonClass(active: boolean) {
  return `rounded-md border px-4 py-3 text-left text-sm font-semibold ${
    active ? "border-primary bg-emerald-50 text-foreground" : "border-border bg-white text-muted-foreground"
  }`;
}
