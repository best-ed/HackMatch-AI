export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type AvailabilitySlot =
  | "weekday_morning"
  | "weekday_afternoon"
  | "weekday_evening"
  | "weekend_morning"
  | "weekend_afternoon"
  | "weekend_evening";

export type Participant = {
  id: string;
  accessToken?: string;
  cohort?: string;
  fullName: string;
  email: string;
  phone?: string;
  institution?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  experienceLevel: ExperienceLevel;
  primaryRole: string;
  secondaryRoles: string[];
  technicalSkills: string[];
  nonTechnicalSkills: string[];
  tools: string[];
  interests: string[];
  projectIdeas?: string;
  preferredTeamSize?: number;
  preferredTeammates: string[];
  blockedTeammates: string[];
  availability: AvailabilitySlot[];
  personalStatement?: string;
  consentToMatch: boolean;
  consentToShareContact: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MatchingWeights = {
  roleCoverage: number;
  skillBalance: number;
  experienceBalance: number;
  interestAlignment: number;
  availabilityOverlap: number;
  participantPreferences: number;
};

export type MatchingSettings = {
  desiredTeamSize: number;
  minTeamSize: number;
  maxTeamSize: number;
  numberOfTeams?: number;
  allowUnassignedParticipants: boolean;
  requireBuilder: boolean;
  requirePresenter: boolean;
  preventBeginnerOnlyTeams: boolean;
  distributeAdvancedParticipants: boolean;
  lockedTeams?: TeamAssignment[];
  weights: MatchingWeights;
};

export type NormalizedParticipant = Participant & {
  normalizedPrimaryRole: string;
  normalizedSecondaryRoles: string[];
  normalizedTechnicalSkills: string[];
  normalizedNonTechnicalSkills: string[];
  normalizedTools: string[];
  normalizedInterests: string[];
};

export type ScoreBreakdown = {
  roleCoverageScore: number;
  skillCoverageScore: number;
  experienceBalanceScore: number;
  interestAlignmentScore: number;
  availabilityCompatibilityScore: number;
  preferenceSatisfactionScore: number;
  constraintPenalty: number;
  totalScore: number;
};

export type TeamAssignment = {
  id: string;
  name: string;
  participantIds: string[];
  locked?: boolean;
  score?: ScoreBreakdown;
};

export type TeamExplanation = {
  teamId: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestedProjectDirection: string;
  suggestedInternalRoles: Record<string, string>;
  warnings: string[];
};

export type MatchingResult = {
  teams: TeamAssignment[];
  scoreBreakdowns: Record<string, ScoreBreakdown>;
  explanations: TeamExplanation[];
  warnings: string[];
  unassignedParticipants: string[];
};

export type SavedMatchRun = {
  id: string;
  name: string;
  notes?: string;
  createdAt: string;
  participantCount: number;
  assignedCount: number;
  averageScore: number;
  cohort?: string;
  settingsSnapshot: MatchingSettings;
  participantsSnapshot: Participant[];
  result: MatchingResult;
};

export const defaultMatchingSettings: MatchingSettings = {
  desiredTeamSize: 4,
  minTeamSize: 3,
  maxTeamSize: 5,
  allowUnassignedParticipants: true,
  requireBuilder: true,
  requirePresenter: true,
  preventBeginnerOnlyTeams: true,
  distributeAdvancedParticipants: true,
  weights: {
    roleCoverage: 2,
    skillBalance: 1.5,
    experienceBalance: 1.4,
    interestAlignment: 1,
    availabilityOverlap: 1,
    participantPreferences: 0.8
  }
};
