"use client";

import { Card, TextInput } from "@/components/ui";
import { useHackMatchData } from "@/lib/local-store";
import type { MatchingSettings } from "@/lib/matching/types";

export default function AdminSettingsPage() {
  const { settings, setSettings, resetDemoData } = useHackMatchData();

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
