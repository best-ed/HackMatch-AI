import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { teamsToCsv } from "@/lib/export";
import { generateTeams } from "@/lib/matching/algorithm";

export function GET() {
  const result = generateTeams(demoParticipants, demoMatchingSettings);
  const csv = teamsToCsv(result, demoParticipants);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="hackmatch-teams.csv"'
    }
  });
}
