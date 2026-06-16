import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";
import { buildTeamCsvArtifact } from "@/lib/export";
import { generateTeams } from "@/lib/matching/algorithm";

export function GET() {
  const result = generateTeams(demoParticipants, demoMatchingSettings);
  const artifact = buildTeamCsvArtifact({
    cohort: "General",
    participants: demoParticipants,
    result,
    scope: "live"
  });

  return new Response(artifact.csv, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${artifact.filename}"`,
      "x-hackmatch-export-assigned": String(artifact.assignedCount),
      "x-hackmatch-export-cohort": artifact.cohort,
      "x-hackmatch-export-kind": "teams",
      "x-hackmatch-export-scope": artifact.scope
    }
  });
}
