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

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
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
          "You explain hackathon team assignments after a deterministic algorithm has already assigned teams. Do not change teams, invent members, or imply AI selected the teams. Keep explanations concise, practical, and grounded only in the supplied participants, scores, warnings, and assignments. For suggestedInternalRoles, use participant IDs from the assigned team as object keys.",
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

    const payload = (await response.json()) as OpenAIResponsePayload;
    const parsedText = extractOpenAIText(payload);
    if (!parsedText) {
      return {
        provider: "fallback",
        model,
        explanations: fallback,
        warnings: ["OpenAI explanation response did not include parseable text; using deterministic fallback explanations."]
      };
    }

    const parsed = JSON.parse(parsedText) as { explanations?: unknown };
    const validation = validateAndAlignExplanations(
      parsed.explanations,
      fallback,
      result.teams,
      new Map(normalized.map((participant) => [participant.id, participant.fullName]))
    );

    return {
      provider: validation.usedFallback ? "fallback" : "openai",
      model,
      explanations: validation.explanations,
      warnings: validation.warnings
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

function extractOpenAIText(payload: OpenAIResponsePayload): string | undefined {
  if (payload.output_text) return payload.output_text;

  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((text): text is string => Boolean(text));
}

function validateAndAlignExplanations(
  candidate: unknown,
  fallback: TeamExplanation[],
  teams: Array<{ id: string; participantIds: string[] }>,
  participantNamesById: Map<string, string>
): {
  explanations: TeamExplanation[];
  warnings: string[];
  usedFallback: boolean;
} {
  if (!Array.isArray(candidate)) {
    return {
      explanations: fallback,
      warnings: ["OpenAI explanation response was not an array; using deterministic fallback explanations."],
      usedFallback: true
    };
  }

  const warnings: string[] = [];
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const acceptedByTeamId = new Map<string, TeamExplanation>();

  for (const item of candidate) {
    const teamId = readStringProperty(item, "teamId");
    if (!teamId || !teamsById.has(teamId)) {
      warnings.push("OpenAI returned an explanation for an unknown team; it was ignored.");
      continue;
    }

    const team = teamsById.get(teamId);
    const explanation = toValidTeamExplanation(
      item,
      teamId,
      new Set(team?.participantIds ?? []),
      participantNamesById
    );
    if (!explanation) {
      warnings.push(`OpenAI explanation for ${teamId} was incomplete; deterministic fallback used for that team.`);
      continue;
    }

    acceptedByTeamId.set(teamId, explanation);
  }

  const explanations = fallback.map((fallbackExplanation) => {
    const explanation = acceptedByTeamId.get(fallbackExplanation.teamId);
    if (!explanation) {
      warnings.push(`No valid OpenAI explanation was returned for ${fallbackExplanation.teamId}; deterministic fallback used.`);
      return fallbackExplanation;
    }
    return explanation;
  });

  return {
    explanations,
    warnings: Array.from(new Set(warnings)),
    usedFallback: acceptedByTeamId.size === 0
  };
}

function toValidTeamExplanation(
  item: unknown,
  teamId: string,
  participantIds: Set<string>,
  participantNamesById: Map<string, string>
): TeamExplanation | undefined {
  const summary = readStringProperty(item, "summary");
  const strengths = readStringArrayProperty(item, "strengths");
  const weaknesses = readStringArrayProperty(item, "weaknesses");
  const suggestedProjectDirection = readStringProperty(item, "suggestedProjectDirection");
  const warnings = readStringArrayProperty(item, "warnings");
  const suggestedInternalRoles = readRoleMap(item, participantIds, participantNamesById);

  if (
    !summary ||
    strengths.length === 0 ||
    weaknesses.length === 0 ||
    !suggestedProjectDirection ||
    Object.keys(suggestedInternalRoles).length === 0
  ) {
    return undefined;
  }

  return {
    teamId,
    summary,
    strengths,
    weaknesses,
    suggestedProjectDirection,
    suggestedInternalRoles,
    warnings
  };
}

function readStringProperty(item: unknown, key: string): string | undefined {
  if (!item || typeof item !== "object" || !(key in item)) return undefined;
  const value = (item as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArrayProperty(item: unknown, key: string): string[] {
  if (!item || typeof item !== "object" || !(key in item)) return [];
  const value = (item as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function readRoleMap(
  item: unknown,
  participantIds: Set<string>,
  participantNamesById: Map<string, string>
): Record<string, string> {
  if (!item || typeof item !== "object") return {};
  const value = (item as Record<string, unknown>).suggestedInternalRoles;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const entries = Object.entries(value)
    .filter(([participantId, role]) => participantIds.has(participantId) && typeof role === "string" && role.trim())
    .map(([participantId, role]) => [participantNamesById.get(participantId) ?? participantId, String(role).trim()]);

  return Object.fromEntries(entries);
}
