"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPersistenceStatus } from "@/components/admin-persistence-status";
import { SectionTrail } from "@/components/section-trail";
import { Badge, Card } from "@/components/ui";
import type { ExplanationServiceResult } from "@/lib/ai/explanation-service";
import { hackMatchCsvFilename, teamsToCsv } from "@/lib/export";
import { useHackMatchData } from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";
import type { MatchingResult, Participant, SavedMatchRun, TeamExplanation } from "@/lib/matching/types";
import { buildSavedRunSharePreview } from "@/lib/saved-run-share";
import { buildTeamPlacementExplanations } from "@/lib/team-placement";
import { summarizeTeamReview } from "@/lib/team-review";

export default function AdminTeamsPage() {
  const {
    cohortParticipants,
    settings,
    setSettings,
    savedMatchRuns,
    saveMatchRun,
    deleteMatchRun,
    renameMatchRun,
    duplicateMatchRun,
    restoreMatchRunSnapshot,
    activeCohort,
    setActiveCohort,
    cohorts,
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
  const csv = teamsToCsv(activeResult, activeParticipants);
  const csvPreview = csv.split("\n").slice(0, 4).join("\n");
  const [explanations, setExplanations] = useState<TeamExplanation[]>(activeResult.explanations);
  const [explanationProvider, setExplanationProvider] = useState<"fallback" | "openai">("fallback");
  const [explanationModel, setExplanationModel] = useState<string | undefined>();
  const [explanationWarnings, setExplanationWarnings] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runName, setRunName] = useState("");
  const [compareRunId, setCompareRunId] = useState("");
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState("");
  const [runActionStatus, setRunActionStatus] = useState("");
  const compareRun = savedMatchRuns.find((run) => run.id === compareRunId) ?? savedMatchRuns[0];
  const comparison = compareRun
    ? compareRuns(result, cohortParticipants, compareRun.result, compareRun.participantsSnapshot)
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

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = hackMatchCsvFilename({
      cohort: exportCohort,
      kind: "teams",
      scope: isViewingSavedRun ? "saved" : "live"
    });
    link.click();
    URL.revokeObjectURL(url);
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
  }

  function toggleTeamLock(teamId: string) {
    const currentLockedTeams = settings.lockedTeams ?? [];
    const isLocked = currentLockedTeams.some((team) => team.id === teamId);
    if (isLocked) {
      setSettings({
        ...settings,
        lockedTeams: currentLockedTeams.filter((team) => team.id !== teamId)
      });
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
  }

  function removeRun(run: SavedMatchRun) {
    deleteMatchRun(run.id);
    setDeleteConfirmId("");
    setRunActionStatus(`Deleted ${run.name}.`);
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
  }

  function duplicateRun(run: SavedMatchRun) {
    const copy = duplicateMatchRun(run.id);
    if (!copy) return;
    setActiveRunId(copy.id);
    setCompareRunId(copy.id);
    setRunActionStatus(`Duplicated ${run.name} as ${copy.name}.`);
  }

  function restoreRun(run: SavedMatchRun) {
    restoreMatchRunSnapshot(run.id);
    setActiveRunId("live");
    setRunActionStatus(`Restored ${run.name} as the live baseline.`);
  }

  async function copySavedRunSharePreview(run: SavedMatchRun) {
    const preview = buildSavedRunSharePreview(run);
    await navigator.clipboard?.writeText(preview.text);
    setRunActionStatus(`Copied share preview for ${run.name}.`);
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

    await navigator.clipboard?.writeText(summary);
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
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={downloadCsv}>
            Download CSV
          </button>
        </div>
      </div>
      <AdminPersistenceStatus
        mode={persistenceMode}
        warning={persistenceWarning}
        detail="Live generated teams and saved match runs are kept in local browser storage; participant and settings data can sync to Supabase when configured."
      />
      <Card className="flex flex-wrap items-end justify-between gap-4">
        <label className="space-y-2 text-sm font-medium">
          <span>Active cohort</span>
          <input
            className="w-72 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            list="teams-cohorts"
            value={activeCohort}
            onChange={(event) => setActiveCohort(event.target.value)}
            disabled={isViewingSavedRun}
          />
          <datalist id="teams-cohorts">
            {cohorts.map((cohort) => <option key={cohort} value={cohort} />)}
          </datalist>
        </label>
        <Badge>
          {isViewingSavedRun
            ? `${activeRun?.cohort ?? "Saved cohort"} snapshot`
            : `${cohortParticipants.length} participant(s) in cohort`}
        </Badge>
      </Card>
      {!isViewingSavedRun ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Team locks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lock a live team to preserve its exact membership while regenerating the rest.
            </p>
          </div>
          <Badge>{lockedTeams.length} locked</Badge>
        </Card>
      ) : null}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Review brief</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fast scan of the currently selected team run before export or sharing.
            </p>
          </div>
          <Badge className={reviewSummary.highRiskCount ? "bg-rose-100 text-rose-800" : reviewSummary.risks.some((risk) => risk.severity === "medium") ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
            {reviewSummary.highRiskCount ? `${reviewSummary.highRiskCount} high risk` : reviewSummary.risks.some((risk) => risk.severity === "medium") ? "Needs review" : "Ready"}
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <ReviewMetric label="Teams" value={reviewSummary.teamCount} />
          <ReviewMetric label="Assigned" value={reviewSummary.assignedCount} />
          <ReviewMetric label="Unassigned" value={reviewSummary.unassignedCount} />
          <ReviewMetric label="Avg score" value={reviewSummary.averageScore} />
          <ReviewMetric label="Lowest score" value={reviewSummary.lowestScore} />
          <ReviewMetric label="Locked" value={reviewSummary.lockedCount} />
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <ReviewMetric label="Coverage risks" value={reviewSummary.coverageRiskCount} />
          <ReviewMetric label="Availability risks" value={reviewSummary.availabilityRiskCount} />
          <ReviewMetric label="Constraint risks" value={reviewSummary.constraintRiskCount} />
          <ReviewMetric label="Medium risks" value={reviewSummary.mediumRiskCount} />
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          {reviewSummary.risks.slice(0, 6).map((risk) => (
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
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Match run view</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save a generated run to freeze teams, scores, warnings, explanations, and export output.
            </p>
          </div>
          <Badge>{savedMatchRuns.length} saved</Badge>
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
            {savedMatchRuns.map((run) => (
              <div
                key={run.id}
                className={`rounded-md border p-3 ${activeRunId === run.id ? "border-primary bg-emerald-50" : "border-border bg-white"}`}
              >
                {(() => {
                  const sharePreview = buildSavedRunSharePreview(run);
                  return (
                    <div className="mb-3 rounded-md bg-muted p-3 text-xs">
                      <div className="font-semibold">Share preview</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {sharePreview.metrics.slice(0, 4).map((metric) => (
                          <div key={metric.label}>
                            <div className="font-bold">{metric.value}</div>
                            <div className="text-muted-foreground">{metric.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <button
                  className="block w-full text-left"
                  onClick={() => setActiveRunId(run.id)}
                  type="button"
                >
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
                  </div>
                </button>
                <div className="mt-3 grid gap-2">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      className="rounded-md border border-border bg-white px-3 py-2 text-xs outline-none ring-primary/20 focus:ring-4"
                      onChange={(event) => setRenameDrafts((current) => ({ ...current, [run.id]: event.target.value }))}
                      value={renameDrafts[run.id] ?? run.name}
                    />
                    <button
                      className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold"
                      onClick={() => renameRun(run)}
                      type="button"
                    >
                      Rename
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold"
                      onClick={() => void copySavedRunSharePreview(run)}
                      type="button"
                    >
                      Copy share preview
                    </button>
                    <button
                      className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold"
                      onClick={() => duplicateRun(run)}
                      type="button"
                    >
                      Duplicate
                    </button>
                    <button
                      className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold"
                      onClick={() => restoreRun(run)}
                      type="button"
                    >
                      Restore as live baseline
                    </button>
                    {deleteConfirmId === run.id ? (
                      <>
                        <button
                          className="rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold text-white"
                          onClick={() => removeRun(run)}
                          type="button"
                        >
                          Confirm delete
                        </button>
                        <button
                          className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold"
                          onClick={() => setDeleteConfirmId("")}
                          type="button"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-rose-700"
                        onClick={() => setDeleteConfirmId(run.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {savedMatchRuns.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No saved runs yet.
              </div>
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
                  {describeComparison(comparison, compareRun.name)}
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
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Save a match run to compare it against the current live generated teams.
          </div>
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
      <div className="grid gap-5">
        {activeResult.teams.map((team) => {
          const explanation = explanations.find((item) => item.teamId === team.id);
          const members = team.participantIds
            .map((id) => activeParticipants.find((item) => item.id === id))
            .filter((participant): participant is Participant => Boolean(participant));
          const placementExplanations = buildTeamPlacementExplanations(members);
          const risks = getTeamRisks(team.score?.totalScore ?? 0, explanation);
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

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function reviewRiskClass(severity: "high" | "medium" | "low") {
  if (severity === "high") return "bg-rose-100 text-rose-800";
  if (severity === "medium") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
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

function summarizeResult(result: MatchingResult) {
  const scoredTeams = result.teams.filter((team) => typeof team.score?.totalScore === "number");
  const assignedCount = result.teams.reduce((sum, team) => sum + team.participantIds.length, 0);
  return {
    averageScore: scoredTeams.length
      ? Math.round(scoredTeams.reduce((sum, team) => sum + (team.score?.totalScore ?? 0), 0) / scoredTeams.length)
      : 0,
    assignedCount,
    teamCount: result.teams.length,
    unassignedCount: result.unassignedParticipants.length,
    warningCount: result.warnings.length
  };
}

function participantTeamMap(result: MatchingResult, participants: Participant[]) {
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
  const map = new Map<string, { id: string; name: string; team: string }>();
  result.teams.forEach((team) => {
    team.participantIds.forEach((participantId) => {
      const participant = participantsById.get(participantId);
      map.set(participantId, {
        id: participantId,
        name: participant?.fullName ?? participantId,
        team: team.name
      });
    });
  });
  result.unassignedParticipants.forEach((participantId) => {
    const participant = participantsById.get(participantId);
    map.set(participantId, {
      id: participantId,
      name: participant?.fullName ?? participantId,
      team: "Unassigned"
    });
  });
  return map;
}

function compareRuns(
  liveResult: MatchingResult,
  liveParticipants: Participant[],
  savedResult: MatchingResult,
  savedParticipants: Participant[]
) {
  const live = summarizeResult(liveResult);
  const saved = summarizeResult(savedResult);
  const liveTeams = participantTeamMap(liveResult, liveParticipants);
  const savedTeams = participantTeamMap(savedResult, savedParticipants);
  const movedParticipants = Array.from(liveTeams.values())
    .map((liveParticipant) => {
      const savedParticipant = savedTeams.get(liveParticipant.id);
      if (!savedParticipant || savedParticipant.team === liveParticipant.team) return null;
      return {
        id: liveParticipant.id,
        name: liveParticipant.name,
        liveTeam: liveParticipant.team,
        savedTeam: savedParticipant.team
      };
    })
    .filter((move): move is { id: string; name: string; liveTeam: string; savedTeam: string } => Boolean(move))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    live,
    saved,
    scoreDelta: live.averageScore - saved.averageScore,
    assignedDelta: live.assignedCount - saved.assignedCount,
    unassignedDelta: live.unassignedCount - saved.unassignedCount,
    warningDelta: live.warningCount - saved.warningCount,
    movedParticipants
  };
}

function describeComparison(
  comparison: ReturnType<typeof compareRuns>,
  savedRunName: string
) {
  const notes: string[] = [];
  if (comparison.scoreDelta > 0) {
    notes.push(`Live teams average ${comparison.scoreDelta} points higher than ${savedRunName}.`);
  } else if (comparison.scoreDelta < 0) {
    notes.push(`${savedRunName} averages ${Math.abs(comparison.scoreDelta)} points higher than the live teams.`);
  } else {
    notes.push(`Live teams and ${savedRunName} have the same average score.`);
  }

  if (comparison.assignedDelta > 0) {
    notes.push(`Live assigns ${comparison.assignedDelta} more participant${comparison.assignedDelta === 1 ? "" : "s"}.`);
  } else if (comparison.assignedDelta < 0) {
    notes.push(`${savedRunName} assigns ${Math.abs(comparison.assignedDelta)} more participant${comparison.assignedDelta === -1 ? "" : "s"}.`);
  }

  if (comparison.warningDelta > 0) {
    notes.push(`Live has ${comparison.warningDelta} more warning${comparison.warningDelta === 1 ? "" : "s"} to review.`);
  } else if (comparison.warningDelta < 0) {
    notes.push(`Live has ${Math.abs(comparison.warningDelta)} fewer warning${comparison.warningDelta === -1 ? "" : "s"}.`);
  }

  if (comparison.movedParticipants.length > 0) {
    notes.push(`${comparison.movedParticipants.length} participant${comparison.movedParticipants.length === 1 ? " has" : "s have"} moved teams.`);
  }

  return notes.join(" ");
}
