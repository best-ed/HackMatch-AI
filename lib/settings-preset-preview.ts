import type { MatchingPreset, SettingsHealth } from "@/lib/settings-guardrails";
import { summarizeSettingsChanges } from "@/lib/settings-changes";
import { validateMatchingSettings } from "@/lib/settings-guardrails";
import type { MatchingSettings, Participant } from "@/lib/matching/types";

export type SettingsPresetPreview = {
  id: string;
  name: string;
  description: string;
  objective: string;
  tradeoff: string;
  changeCount: number;
  health: SettingsHealth;
};

const presetGuidance: Record<string, { objective: string; tradeoff: string }> = {
  balanced: {
    objective: "Keep role, skill, experience, interests, and preferences in roughly even tension.",
    tradeoff: "It may not maximize any single scoring dimension for specialized events."
  },
  "skill-heavy": {
    objective: "Increase pressure for technical coverage and complete builder/presenter teams.",
    tradeoff: "Interest alignment and participant preferences carry less influence."
  },
  "beginner-friendly": {
    objective: "Spread advanced participants and reduce preference pressure for stronger mentorship coverage.",
    tradeoff: "Highly specialized teams may score lower on concentrated technical depth."
  },
  "strict-constraints": {
    objective: "Make hard constraints and required coverage more demanding before final handoff.",
    tradeoff: "More participants may remain unassigned if the cohort cannot satisfy the tighter rules."
  }
};

export function buildSettingsPresetPreviews({
  currentSettings,
  participants,
  presets
}: {
  currentSettings: MatchingSettings;
  participants: Participant[];
  presets: MatchingPreset[];
}): SettingsPresetPreview[] {
  return presets.map((preset) => {
    const guidance = presetGuidance[preset.id] ?? {
      objective: "Apply a deterministic settings profile.",
      tradeoff: "Review draft impact before applying to live settings."
    };

    return {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      objective: guidance.objective,
      tradeoff: guidance.tradeoff,
      changeCount: summarizeSettingsChanges(currentSettings, preset.settings).length,
      health: validateMatchingSettings(preset.settings, participants)
    };
  });
}
