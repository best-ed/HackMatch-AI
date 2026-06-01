import type { MatchingSettings } from "@/lib/matching/types";
import { defaultMatchingSettings } from "@/lib/matching/types";

export type MatchingPreset = {
  id: string;
  name: string;
  description: string;
  settings: MatchingSettings;
};

export const matchingPresets: MatchingPreset[] = [
  {
    id: "balanced",
    name: "Balanced",
    description: "Good default for mixed hackathon cohorts.",
    settings: defaultMatchingSettings
  },
  {
    id: "skill-heavy",
    name: "Skill-heavy",
    description: "Prioritizes technical coverage and role completeness.",
    settings: {
      ...defaultMatchingSettings,
      requireBuilder: true,
      requirePresenter: true,
      weights: {
        ...defaultMatchingSettings.weights,
        roleCoverage: 2.4,
        skillBalance: 2.2,
        experienceBalance: 1.2,
        interestAlignment: 0.7,
        availabilityOverlap: 0.8,
        participantPreferences: 0.5
      }
    }
  },
  {
    id: "beginner-friendly",
    name: "Beginner-friendly",
    description: "Spreads advanced participants and reduces preference pressure.",
    settings: {
      ...defaultMatchingSettings,
      preventBeginnerOnlyTeams: true,
      distributeAdvancedParticipants: true,
      allowUnassignedParticipants: true,
      weights: {
        ...defaultMatchingSettings.weights,
        roleCoverage: 1.8,
        skillBalance: 1.2,
        experienceBalance: 2.2,
        interestAlignment: 1,
        availabilityOverlap: 1.2,
        participantPreferences: 0.4
      }
    }
  },
  {
    id: "strict-constraints",
    name: "Strict constraints",
    description: "Keeps teams tighter with stronger role and constraint pressure.",
    settings: {
      ...defaultMatchingSettings,
      allowUnassignedParticipants: false,
      requireBuilder: true,
      requirePresenter: true,
      preventBeginnerOnlyTeams: true,
      distributeAdvancedParticipants: true,
      weights: {
        ...defaultMatchingSettings.weights,
        roleCoverage: 2.6,
        skillBalance: 1.6,
        experienceBalance: 1.6,
        interestAlignment: 0.8,
        availabilityOverlap: 1.1,
        participantPreferences: 0.6
      }
    }
  }
];
