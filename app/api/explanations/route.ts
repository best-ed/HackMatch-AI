import { explainGeneratedTeams } from "@/lib/ai/explanation-service";
import type { MatchingSettings, Participant } from "@/lib/matching/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    participants?: Participant[];
    settings?: MatchingSettings;
  };

  if (!Array.isArray(body.participants) || !body.settings) {
    return Response.json(
      { error: "participants and settings are required" },
      { status: 400 }
    );
  }

  const explanationResult = await explainGeneratedTeams(
    body.participants,
    body.settings
  );

  return Response.json(explanationResult);
}
