import { generateTeams } from "@/lib/matching/algorithm";
import { generateDeterministicExplanations } from "@/lib/matching/explanations";
import { normalizeParticipants } from "@/lib/matching/normalization";
import type {
  MatchingSettings,
  Participant,
  TeamExplanation
} from "@/lib/matching/types";

export type ExplanationProvider = "fallback" | "openai";

export type ExplanationServiceResult = {
  provider: ExplanationProvider;
  model?: string;
  explanations: TeamExplanation[];
  warnings: string[];
};

const explanationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["explanations"],
  properties: {
    explanations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "teamId",
          "summary",
          "strengths",
          "weaknesses",
          "suggestedProjectDirection",
          "suggestedInternalRoles",
          "warnings"
        ],
        properties: {
          teamId: { type: "string" },
          summary: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          suggestedProjectDirection: { type: "string" },
          suggestedInternalRoles: {
            type: "object",
            additionalProperties: { type: "string" }
          },
          warnings: { type: "array", items: { type: "string" } }
        }
      }
    }
  }
};

export async function explainGeneratedTeams(
  participants: Participant[],
  settings: MatchingSettings
): Promise<ExplanationServiceResult> {
  const result = generateTeams(participants, settings);
  const normalized = normalizeParticipants(participants);
  const participantsById = new Map(normalized.map((participant) => [participant.id, participant]));
  const fallback = generateDeterministicExplanations(result.teams, participantsById);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      provider: "fallback",
      explanations: fallback,
      warnings: ["OPENAI_API_KEY is not configured; using deterministic fallback explanations."]
    };
  }

  const model = process.env.OPENAI_EXPLANATION_MODEL ?? "gpt-5.2";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        instructions:
          "You explain hackathon team assignments after a deterministic algorithm has already assigned teams. Do not change teams, invent members, or imply AI selected the teams. Keep explanations concise, practical, and grounded only in the supplied participants, scores, warnings, and assignments.",
        input: JSON.stringify({
          teams: result.teams,
          scoreBreakdowns: result.scoreBreakdowns,
          participants: participants.map((participant) => ({
            id: participant.id,
            fullName: participant.fullName,
            experienceLevel: participant.experienceLevel,
            primaryRole: participant.primaryRole,
            secondaryRoles: participant.secondaryRoles,
            technicalSkills: participant.technicalSkills,
            nonTechnicalSkills: participant.nonTechnicalSkills,
            tools: participant.tools,
            interests: participant.interests,
            availability: participant.availability
          })),
          matcherWarnings: result.warnings
        }),
        text: {
          format: {
            type: "json_schema",
            name: "hackmatch_team_explanations",
            strict: true,
            schema: explanationSchema
          }
        },
        max_output_tokens: 2500
      })
    });

    if (!response.ok) {
      return {
        provider: "fallback",
        model,
        explanations: fallback,
        warnings: [
          `OpenAI explanation request failed with ${response.status}; using deterministic fallback explanations.`
        ]
      };
    }

    const payload = (await response.json()) as { output_text?: string };
    const parsed = JSON.parse(payload.output_text ?? "{}") as {
      explanations?: TeamExplanation[];
    };
    const explanations = alignExplanationsWithTeams(
      parsed.explanations ?? [],
      fallback
    );

    return {
      provider: "openai",
      model,
      explanations,
      warnings: []
    };
  } catch {
    return {
      provider: "fallback",
      model,
      explanations: fallback,
      warnings: ["OpenAI explanation request could not be completed; using deterministic fallback explanations."]
    };
  }
}

function alignExplanationsWithTeams(
  candidate: TeamExplanation[],
  fallback: TeamExplanation[]
): TeamExplanation[] {
  const candidateByTeamId = new Map(candidate.map((item) => [item.teamId, item]));
  return fallback.map((fallbackExplanation) => {
    const explanation = candidateByTeamId.get(fallbackExplanation.teamId);
    return explanation ?? fallbackExplanation;
  });
}
