import type { SecurityReadiness } from "@/lib/security-readiness";

export type SecurityReadinessExportArtifact = {
  filename: string;
  text: string;
};

export function buildSecurityReadinessExportArtifact({
  readiness,
  generatedAt = new Date().toISOString()
}: {
  readiness: SecurityReadiness;
  generatedAt?: string;
}): SecurityReadinessExportArtifact {
  const timestamp = new Date(generatedAt).toISOString();
  const compactDate = timestamp.replace(/[:.]/g, "-");

  return {
    filename: `hackmatch-security-readiness-${compactDate}.txt`,
    text: [
      "HackMatch AI security readiness summary",
      `Generated: ${timestamp}`,
      `Status: ${readiness.status}`,
      `Ready checks: ${readiness.readyCount}/${readiness.totalCount}`,
      "",
      "Checks:",
      ...readiness.checks.map((check) => `- ${check.label}: ${check.status} - ${check.detail}`)
    ].join("\n")
  };
}
