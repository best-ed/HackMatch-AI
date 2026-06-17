import { NextRequest } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api-guard";
import { explainGeneratedTeams } from "@/lib/ai/explanation-service";
import type { MatchingSettings, Participant } from "@/lib/matching/types";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminApiSession(request);
  if (unauthorized) return unauthorized;

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
