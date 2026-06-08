import type { MatchingSettings } from "@/lib/matching/types";

export type SettingsExplanation = {
  key: string;
  label: string;
  category: "team-size" | "constraint" | "weight";
  currentValue: string;
  explanation: string;
  organizerTip: string;
};

const weightLabels: Record<keyof MatchingSettings["weights"], string> = {
  roleCoverage: "Role coverage",
  skillBalance: "Skill balance",
  experienceBalance: "Experience balance",
  interestAlignment: "Interest alignment",
  availabilityOverlap: "Availability overlap",
  participantPreferences: "Participant preferences"
};

const weightExplanations: Record<keyof MatchingSettings["weights"], string> = {
  roleCoverage: "Raises the value of teams that include complementary builder, product, design, data, or presentation roles.",
  skillBalance: "Raises the value of teams with broader technical coverage instead of clustering similar skills together.",
  experienceBalance: "Raises the value of teams with a healthier spread of beginner, intermediate, and advanced participants.",
  interestAlignment: "Raises the value of teams that share project interests or domain preferences.",
  availabilityOverlap: "Raises the value of teams whose members have overlapping work windows.",
  participantPreferences: "Raises the value of satisfying preferred teammate requests after hard constraints are respected."
};

export function explainMatchingSettings(settings: MatchingSettings): SettingsExplanation[] {
  return [
    {
      key: "desiredTeamSize",
      label: "Desired team size",
      category: "team-size",
      currentValue: String(settings.desiredTeamSize),
      explanation: "The target size the deterministic matcher tries to build around.",
      organizerTip: "Use this as the normal team size, then let min and max define acceptable flexibility."
    },
    {
      key: "minMaxTeamSize",
      label: "Team size range",
      category: "team-size",
      currentValue: `${settings.minTeamSize}-${settings.maxTeamSize}`,
      explanation: "The hard lower and upper bounds for generated teams.",
      organizerTip: "Keep this range tight for fairness, but widen it if cohorts are small or uneven."
    },
    {
      key: "numberOfTeams",
      label: "Number of teams",
      category: "team-size",
      currentValue: settings.numberOfTeams ? String(settings.numberOfTeams) : "Automatic",
      explanation: "When set, the matcher targets a fixed number of teams instead of deriving it from participant count.",
      organizerTip: "Use automatic mode unless room layout, mentors, or judging slots require a fixed count."
    },
    {
      key: "allowUnassignedParticipants",
      label: "Allow unassigned participants",
      category: "constraint",
      currentValue: settings.allowUnassignedParticipants ? "Yes" : "No",
      explanation: "Allows the matcher to leave participants out when constraints cannot be satisfied cleanly.",
      organizerTip: "Turn this on during planning; turn it off only when every matchable participant must be placed."
    },
    {
      key: "requireBuilder",
      label: "Require builder",
      category: "constraint",
      currentValue: settings.requireBuilder ? "Yes" : "No",
      explanation: "Penalizes teams without an obvious technical builder signal.",
      organizerTip: "Use this when every team needs implementation capacity."
    },
    {
      key: "requirePresenter",
      label: "Require presenter",
      category: "constraint",
      currentValue: settings.requirePresenter ? "Yes" : "No",
      explanation: "Penalizes teams without product, design, presentation, pitch, or storytelling coverage.",
      organizerTip: "Use this when every team needs a strong demo and judging handoff."
    },
    {
      key: "preventBeginnerOnlyTeams",
      label: "Prevent beginner-only teams",
      category: "constraint",
      currentValue: settings.preventBeginnerOnlyTeams ? "Yes" : "No",
      explanation: "Penalizes teams made entirely of beginners.",
      organizerTip: "Keep this on for mixed-experience cohorts so beginners get mentorship support."
    },
    {
      key: "distributeAdvancedParticipants",
      label: "Distribute advanced participants",
      category: "constraint",
      currentValue: settings.distributeAdvancedParticipants ? "Yes" : "No",
      explanation: "Pushes advanced participants across teams rather than clustering them together.",
      organizerTip: "Keep this on when you want stronger peer support and fairer team confidence."
    },
    ...Object.entries(settings.weights).map(([key, value]) => {
      const weightKey = key as keyof MatchingSettings["weights"];
      return {
        key: weightKey,
        label: weightLabels[weightKey],
        category: "weight" as const,
        currentValue: String(value),
        explanation: weightExplanations[weightKey],
        organizerTip: value >= 2
          ? "This is a high-priority scoring signal in the current draft."
          : value <= 0.5
            ? "This signal currently has light influence."
            : "This signal has moderate influence."
      };
    })
  ];
}
