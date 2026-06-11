"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPersistenceStatus } from "@/components/admin-persistence-status";
import { SectionTrail } from "@/components/section-trail";
import { Badge, Button, Card, TextArea, TextInput } from "@/components/ui";
import {
  createHackMatchBackup,
  hackMatchBackupFilename,
  parseHackMatchBackupJson,
  teamReviewChecklistStorageKey
} from "@/lib/local-backup";
import { useHackMatchData } from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";
import type { MatchingSettings } from "@/lib/matching/types";
import { summarizeSettingsChanges } from "@/lib/settings-changes";
import { explainMatchingSettings, type SettingsExplanation } from "@/lib/settings-explainer";
import { compareMatchingImpact, summarizeMatchingImpact } from "@/lib/settings-impact";
import { matchingPresets, validateMatchingSettings } from "@/lib/settings-guardrails";
import type { TeamReviewChecklistStore } from "@/lib/team-review-checklist";

export default function AdminSettingsPage() {
  const {
    settings,
    setSettings,
    resetDemoData,
    restoreLocalBackup,
    cohortParticipants,
    participants,
    savedMatchRuns,
    archivedCohorts,
    activeCohort,
    persistenceMode,
    persistenceWarning
  } = useHackMatchData();
  const [draftSettings, setDraftSettings] = useState<MatchingSettings>(settings);
  const [backupJson, setBackupJson] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const [teamReviewChecklist, setTeamReviewChecklist] = useState<TeamReviewChecklistStore>({});
  const hasDraftChanges = JSON.stringify(draftSettings) !== JSON.stringify(settings);
  const backupPreview = useMemo(
    () => (backupJson.trim() ? parseHackMatchBackupJson(backupJson) : undefined),
    [backupJson]
  );
  const health = useMemo(
    () => validateMatchingSettings(settings, cohortParticipants),
    [cohortParticipants, settings]
  );
  const draftHealth = useMemo(
    () => validateMatchingSettings(draftSettings, cohortParticipants),
    [cohortParticipants, draftSettings]
  );
  const currentImpact = useMemo(
    () => summarizeMatchingImpact(generateTeams(cohortParticipants, settings)),
    [cohortParticipants, settings]
  );
  const draftImpact = useMemo(
    () => summarizeMatchingImpact(generateTeams(cohortParticipants, draftSettings)),
    [cohortParticipants, draftSettings]
  );
  const impactDelta = useMemo(
    () => compareMatchingImpact(currentImpact, draftImpact),
    [currentImpact, draftImpact]
  );
  const settingsChanges = useMemo(
    () => summarizeSettingsChanges(settings, draftSettings),
    [draftSettings, settings]
  );
  const settingExplanations = useMemo(
    () => explainMatchingSettings(draftSettings),
    [draftSettings]
  );
  const draftStatusText = hasDraftChanges
    ? "Draft changes are ready to apply."
    : "Live settings and draft settings currently match.";

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    setTeamReviewChecklist(readTeamReviewChecklist());
  }, []);

  function update<K extends keyof MatchingSettings>(key: K, value: MatchingSettings[K]) {
    setDraftSettings((current) => ({ ...current, [key]: value }));
  }

  function updateWeight(key: keyof MatchingSettings["weights"], value: number) {
    setDraftSettings((current) => ({
      ...current,
      weights: {
        ...current.weights,
        [key]: value
      }
    }));
  }

  function applyDraftSettings() {
    setSettings(draftSettings);
  }

  function resetDraftSettings() {
    setDraftSettings(settings);
  }

  function applyPresetToDraft(preset: MatchingSettings) {
    setDraftSettings((current) => ({
      ...preset,
      lockedTeams: current.lockedTeams
    }));
  }

  function downloadLocalBackup() {
    const backup = createHackMatchBackup({
      participants,
      settings,
      savedMatchRuns,
      activeCohort,
      archivedCohorts,
      teamReviewChecklist
    });
    const json = JSON.stringify(backup, null, 2);
    const url = window.URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = hackMatchBackupFilename(backup.exportedAt);
    link.click();
    window.URL.revokeObjectURL(url);
    setBackupStatus(`Backup downloaded with ${backup.participants.length} participants and ${backup.savedMatchRuns.length} saved run(s).`);
  }

  function restoreBackupPreview() {
    if (!backupPreview?.ok) return;
    restoreLocalBackup(backupPreview.backup);
    setDraftSettings(backupPreview.backup.settings);
    setBackupStatus(
      `Restored ${backupPreview.summary.participants} participants, ${backupPreview.summary.savedRuns} saved run(s), and active cohort ${backupPreview.summary.activeCohort}.`
    );
    setBackupJson("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionTrail items={[{ href: "/admin", label: "Admin" }, { label: "Settings" }]} />
          <h1 className="text-3xl font-bold tracking-tight">Matching settings</h1>
          <p className="mt-2 text-muted-foreground">
            Tune deterministic constraints and scoring weights with draft impact preview.
          </p>
        </div>
        <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={resetDemoData}>
          Reset demo data
        </button>
      </div>
      <AdminPersistenceStatus
        mode={persistenceMode}
        warning={persistenceWarning}
        detail="Matching settings are stored in this browser until Supabase env vars are configured."
      />
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Local backup and restore</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Export this browser workspace or preview a JSON restore before replacing local data.
            </p>
          </div>
          <Badge>{participants.length} participant{participants.length === 1 ? "" : "s"}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <HealthMetric label="Active cohort" value={activeCohort} />
          <HealthMetric label="Saved runs" value={savedMatchRuns.length} />
          <HealthMetric label="Archived cohorts" value={archivedCohorts.length} />
          <HealthMetric label="Review checks" value={Object.keys(teamReviewChecklist).length} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={downloadLocalBackup}>
            Download backup JSON
          </Button>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          <span>Paste backup JSON to preview restore</span>
          <TextArea
            className="min-h-32 font-mono text-xs"
            value={backupJson}
            onChange={(event) => setBackupJson(event.target.value)}
            placeholder='{"version":"hackmatch-backup-v1", ...}'
          />
        </label>
        {backupPreview?.ok ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="font-semibold">Restore preview is valid</div>
            <div className="mt-2 grid gap-2 md:grid-cols-5">
              <HealthMetric label="Participants" value={backupPreview.summary.participants} />
              <HealthMetric label="Saved runs" value={backupPreview.summary.savedRuns} />
              <HealthMetric label="Active cohort" value={backupPreview.summary.activeCohort} />
              <HealthMetric label="Archived" value={backupPreview.summary.archivedCohorts} />
              <HealthMetric label="Reviewed teams" value={backupPreview.summary.reviewedTeams} />
            </div>
          </div>
        ) : backupPreview ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {backupPreview.error}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="bg-amber-600 text-white hover:bg-amber-700"
            disabled={!backupPreview?.ok}
            onClick={restoreBackupPreview}
            type="button"
          >
            Restore previewed backup
          </Button>
          {backupJson ? (
            <button
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
              onClick={() => setBackupJson("")}
              type="button"
            >
              Clear preview
            </button>
          ) : null}
        </div>
        {backupStatus ? <p className="text-sm text-muted-foreground">{backupStatus}</p> : null}
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Live settings health</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Guardrails for the active cohort: {activeCohort}.
            </p>
          </div>
          <Badge className={healthBadgeClass(health.status)}>
            {health.status === "healthy" ? "Healthy" : health.status === "warning" ? "Needs review" : "Invalid"}
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <HealthMetric label="Participants" value={cohortParticipants.length} />
          <HealthMetric label="Matchable" value={cohortParticipants.filter((participant) => participant.consentToMatch).length} />
          <HealthMetric label="Desired size" value={settings.desiredTeamSize} />
          <HealthMetric label="Team range" value={`${settings.minTeamSize}-${settings.maxTeamSize}`} />
        </div>
        {health.errors.length > 0 ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <div className="font-semibold">Fix before matching</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {health.errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        ) : null}
        {health.warnings.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-semibold">Review before matching</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {health.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        ) : null}
        {health.status === "healthy" ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Settings look viable for the current matchable cohort.
          </div>
        ) : null}
      </Card>
      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold">Presets</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Apply explicit deterministic settings. You can still edit every value afterward.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {matchingPresets.map((preset) => (
            <button
              className="rounded-md border border-border bg-white p-4 text-left transition hover:border-primary hover:bg-emerald-50"
              key={preset.id}
              onClick={() => applyPresetToDraft(preset.settings)}
              type="button"
            >
              <div className="font-semibold">{preset.name}</div>
              <p className="mt-2 text-sm text-muted-foreground">{preset.description}</p>
            </button>
          ))}
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Settings guide</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Plain-English impact notes for the current draft values.
            </p>
          </div>
          <Badge>{settingExplanations.length} rules explained</Badge>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <SettingsExplanationGroup title="Team sizing" items={settingExplanations.filter((item) => item.category === "team-size")} />
          <SettingsExplanationGroup title="Constraints" items={settingExplanations.filter((item) => item.category === "constraint")} />
          <SettingsExplanationGroup title="Scoring weights" items={settingExplanations.filter((item) => item.category === "weight")} />
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Settings impact preview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare the current live settings with your draft before applying changes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasDraftChanges ? <Badge className="bg-sky-100 text-sky-800">Unsaved draft</Badge> : null}
            <Badge className={healthBadgeClass(draftHealth.status)}>
              Draft {draftHealth.status}
            </Badge>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <ImpactMetric label="Teams" current={currentImpact.teamCount} draft={draftImpact.teamCount} delta={impactDelta.teamCount} />
          <ImpactMetric label="Assigned" current={currentImpact.assignedCount} draft={draftImpact.assignedCount} delta={impactDelta.assignedCount} />
          <ImpactMetric label="Unassigned" current={currentImpact.unassignedCount} draft={draftImpact.unassignedCount} delta={impactDelta.unassignedCount} invert />
          <ImpactMetric label="Avg score" current={currentImpact.averageScore} draft={draftImpact.averageScore} delta={impactDelta.averageScore} />
          <ImpactMetric label="Warnings" current={currentImpact.warningCount} draft={draftImpact.warningCount} delta={impactDelta.warningCount} invert />
        </div>
        <div className="rounded-md border border-border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Draft change summary</h3>
            <Badge>{settingsChanges.length} change{settingsChanges.length === 1 ? "" : "s"}</Badge>
          </div>
          {settingsChanges.length > 0 ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {settingsChanges.map((change) => (
                <div key={`${change.category}-${change.label}`} className="rounded-md border border-border bg-muted p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{change.label}</div>
                    <Badge className={settingsChangeClass(change.category)}>{change.category}</Badge>
                  </div>
                  <div className="mt-2 text-muted-foreground">
                    {change.current} -&gt; <span className="font-semibold text-foreground">{change.draft}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No settings changes are currently staged.
            </p>
          )}
        </div>
        {draftHealth.errors.length > 0 || draftHealth.warnings.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {draftHealth.errors.length > 0 ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <div className="font-semibold">Draft errors</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {draftHealth.errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            ) : null}
            {draftHealth.warnings.length > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="font-semibold">Draft warnings</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {draftHealth.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={draftHealth.errors.length > 0}
            onClick={applyDraftSettings}
            type="button"
          >
            Apply draft settings
          </button>
          <button
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            onClick={resetDraftSettings}
            type="button"
          >
            Reset draft
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{draftStatusText}</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-semibold">Constraints</h2>
          <NumberField label="Desired team size" value={draftSettings.desiredTeamSize} onChange={(value) => update("desiredTeamSize", value)} />
          <NumberField label="Minimum team size" value={draftSettings.minTeamSize} onChange={(value) => update("minTeamSize", value)} />
          <NumberField label="Maximum team size" value={draftSettings.maxTeamSize} onChange={(value) => update("maxTeamSize", value)} />
          <NumberField label="Number of teams" value={draftSettings.numberOfTeams ?? 0} onChange={(value) => update("numberOfTeams", value || undefined)} />
          <Toggle label="Allow unassigned participants" checked={draftSettings.allowUnassignedParticipants} onChange={(value) => update("allowUnassignedParticipants", value)} />
          <Toggle label="Require builder" checked={draftSettings.requireBuilder} onChange={(value) => update("requireBuilder", value)} />
          <Toggle label="Require presenter" checked={draftSettings.requirePresenter} onChange={(value) => update("requirePresenter", value)} />
          <Toggle label="Prevent beginner-only teams" checked={draftSettings.preventBeginnerOnlyTeams} onChange={(value) => update("preventBeginnerOnlyTeams", value)} />
          <Toggle label="Distribute advanced participants" checked={draftSettings.distributeAdvancedParticipants} onChange={(value) => update("distributeAdvancedParticipants", value)} />
        </Card>
        <Card className="space-y-4">
          <h2 className="font-semibold">Weights</h2>
          {Object.entries(draftSettings.weights).map(([label, value]) => (
            <NumberField
              key={label}
              label={label}
              step={0.1}
              value={value}
              onChange={(next) => updateWeight(label as keyof MatchingSettings["weights"], next)}
            />
          ))}
        </Card>
      </div>
    </div>
  );
}

function ImpactMetric({
  label,
  current,
  draft,
  delta,
  invert = false
}: {
  label: string;
  current: number;
  draft: number;
  delta: number;
  invert?: boolean;
}) {
  const good = invert ? delta <= 0 : delta >= 0;
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-xl font-bold">{draft}</div>
          <div className="text-xs text-muted-foreground">Draft</div>
        </div>
        <div className="text-right">
          <div className={good ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
            {delta >= 0 ? "+" : ""}{delta}
          </div>
          <div className="text-xs text-muted-foreground">current {current}</div>
        </div>
      </div>
    </div>
  );
}

function HealthMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function SettingsExplanationGroup({
  title,
  items
}: {
  title: string;
  items: SettingsExplanation[];
}) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 grid gap-3">
        {items.map((item) => (
          <div className="rounded-md bg-muted p-3 text-sm" key={item.key}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{item.label}</div>
              <Badge>{item.currentValue}</Badge>
            </div>
            <p className="mt-2 text-muted-foreground">{item.explanation}</p>
            <p className="mt-2 text-xs font-medium text-foreground">{item.organizerTip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function healthBadgeClass(status: "healthy" | "warning" | "error") {
  if (status === "healthy") return "bg-emerald-100 text-emerald-800";
  if (status === "warning") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function settingsChangeClass(category: "team-size" | "constraint" | "weight") {
  if (category === "team-size") return "bg-sky-100 text-sky-800";
  if (category === "constraint") return "bg-amber-100 text-amber-800";
  return "bg-violet-100 text-violet-800";
}

function readTeamReviewChecklist(): TeamReviewChecklistStore {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(teamReviewChecklistStorageKey) ?? "{}") as TeamReviewChecklistStore;
  } catch {
    return {};
  }
}

function NumberField({
  label,
  value,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <TextInput
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
