import type { MatchingSettings, Participant } from "@/lib/matching/types";
import { defaultMatchingSettings } from "@/lib/matching/types";

export type MatchingPreset = {
  id: string;
  name: string;
  description: string;
  settings: MatchingSettings;
};

export type SettingsHealth = {
  status: "healthy" | "warning" | "error";
  errors: string[];
  warnings: string[];
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

export function validateMatchingSettings(
  settings: MatchingSettings,
  participants: Participant[]
): SettingsHealth {
  const errors: string[] = [];
  const warnings: string[] = [];
  const matchableParticipants = participants.filter((participant) => participant.consentToMatch);

  if (settings.maxTeamSize < 2) {
    errors.push("Maximum team size must be at least 2.");
  }
  if (settings.minTeamSize > settings.desiredTeamSize) {
    errors.push("Minimum team size cannot exceed desired team size.");
  }
  if (settings.desiredTeamSize > settings.maxTeamSize) {
    errors.push("Desired team size cannot exceed maximum team size.");
  }
  if (settings.minTeamSize > settings.maxTeamSize) {
    errors.push("Minimum team size cannot exceed maximum team size.");
  }

  const negativeWeights = Object.entries(settings.weights)
    .filter(([, value]) => value < 0)
    .map(([key]) => key);
  if (negativeWeights.length > 0) {
    errors.push(`Weights cannot be negative: ${negativeWeights.join(", ")}.`);
  }

  if (matchableParticipants.length === 0) {
    warnings.push("No matchable participants are available in the active cohort.");
  }

  if (settings.numberOfTeams && settings.numberOfTeams > 0) {
    const minimumNeeded = settings.numberOfTeams * settings.minTeamSize;
    const desiredNeeded = settings.numberOfTeams * settings.desiredTeamSize;
    const maximumCapacity = settings.numberOfTeams * settings.maxTeamSize;
    if (matchableParticipants.length < minimumNeeded) {
      errors.push(`Requested ${settings.numberOfTeams} teams need at least ${minimumNeeded} matchable participants.`);
    } else if (matchableParticipants.length < desiredNeeded) {
      warnings.push(`Requested ${settings.numberOfTeams} teams may be smaller than desired with ${matchableParticipants.length} matchable participants.`);
    }
    if (!settings.allowUnassignedParticipants && matchableParticipants.length > maximumCapacity) {
      errors.push(`Requested teams can hold ${maximumCapacity} participants, but ${matchableParticipants.length} are matchable and unassigned participants are disabled.`);
    }
  } else if (settings.desiredTeamSize > 0 && matchableParticipants.length > 0) {
    const expectedTeams = Math.ceil(matchableParticipants.length / settings.desiredTeamSize);
    if (expectedTeams === 1 && matchableParticipants.length < settings.minTeamSize) {
      warnings.push("The active cohort is smaller than the minimum team size.");
    }
  }

  if (settings.requireBuilder) {
    const hasBuilder = matchableParticipants.some((participant) =>
      /backend|frontend|full stack|fullstack|ai|data|engineer|developer/i.test(
        [participant.primaryRole, ...participant.secondaryRoles].join(" ")
      )
    );
    if (!hasBuilder) {
      warnings.push("Require builder is enabled, but no obvious builder role is present.");
    }
  }

  if (settings.requirePresenter) {
    const hasPresenter = matchableParticipants.some((participant) =>
      /presenter|product|marketing|designer|pitch/i.test(
        [participant.primaryRole, ...participant.secondaryRoles, ...participant.nonTechnicalSkills].join(" ")
      )
    );
    if (!hasPresenter) {
      warnings.push("Require presenter is enabled, but no obvious presenter/product role is present.");
    }
  }

  return {
    status: errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "healthy",
    errors,
    warnings
  };
}
