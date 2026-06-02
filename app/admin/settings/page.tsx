"use client";

import { useMemo } from "react";
import { AdminPersistenceStatus } from "@/components/admin-persistence-status";
import { Badge, Card, TextInput } from "@/components/ui";
import { useHackMatchData } from "@/lib/local-store";
import type { MatchingSettings } from "@/lib/matching/types";
import { matchingPresets, validateMatchingSettings } from "@/lib/settings-guardrails";

export default function AdminSettingsPage() {
  const {
    settings,
    setSettings,
    resetDemoData,
    cohortParticipants,
    activeCohort,
    persistenceMode,
    persistenceWarning
  } = useHackMatchData();
  const health = useMemo(
    () => validateMatchingSettings(settings, cohortParticipants),
    [cohortParticipants, settings]
  );

  function update<K extends keyof MatchingSettings>(key: K, value: MatchingSettings[K]) {
    setSettings({ ...settings, [key]: value });
  }

  function updateWeight(key: keyof MatchingSettings["weights"], value: number) {
    setSettings({
      ...settings,
      weights: {
        ...settings.weights,
        [key]: value
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Matching settings</h1>
          <p className="mt-2 text-muted-foreground">
            Edit constraints and weights used by the deterministic matcher.
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
            <h2 className="font-semibold">Settings health</h2>
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
              onClick={() => setSettings(preset.settings)}
              type="button"
            >
              <div className="font-semibold">{preset.name}</div>
              <p className="mt-2 text-sm text-muted-foreground">{preset.description}</p>
            </button>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-semibold">Constraints</h2>
          <NumberField label="Desired team size" value={settings.desiredTeamSize} onChange={(value) => update("desiredTeamSize", value)} />
          <NumberField label="Minimum team size" value={settings.minTeamSize} onChange={(value) => update("minTeamSize", value)} />
          <NumberField label="Maximum team size" value={settings.maxTeamSize} onChange={(value) => update("maxTeamSize", value)} />
          <NumberField label="Number of teams" value={settings.numberOfTeams ?? 0} onChange={(value) => update("numberOfTeams", value || undefined)} />
          <Toggle label="Allow unassigned participants" checked={settings.allowUnassignedParticipants} onChange={(value) => update("allowUnassignedParticipants", value)} />
          <Toggle label="Require builder" checked={settings.requireBuilder} onChange={(value) => update("requireBuilder", value)} />
          <Toggle label="Require presenter" checked={settings.requirePresenter} onChange={(value) => update("requirePresenter", value)} />
          <Toggle label="Prevent beginner-only teams" checked={settings.preventBeginnerOnlyTeams} onChange={(value) => update("preventBeginnerOnlyTeams", value)} />
          <Toggle label="Distribute advanced participants" checked={settings.distributeAdvancedParticipants} onChange={(value) => update("distributeAdvancedParticipants", value)} />
        </Card>
        <Card className="space-y-4">
          <h2 className="font-semibold">Weights</h2>
          {Object.entries(settings.weights).map(([label, value]) => (
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

function HealthMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function healthBadgeClass(status: "healthy" | "warning" | "error") {
  if (status === "healthy") return "bg-emerald-100 text-emerald-800";
  if (status === "warning") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
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
