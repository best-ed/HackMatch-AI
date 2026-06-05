import type { SupabaseReadiness } from "@/lib/supabase-readiness";

export type DeploymentReadinessStatus = "ready" | "review";

export type DeploymentReadinessCheck = {
  label: string;
  ok: boolean;
  detail: string;
};

export type DeploymentReadiness = {
  status: DeploymentReadinessStatus;
  title: string;
  detail: string;
  checks: DeploymentReadinessCheck[];
};

export function evaluateDeploymentReadiness(input: {
  supabase: SupabaseReadiness;
  hasParticipants: boolean;
  hasGeneratedTeams: boolean;
  hasSavedRun: boolean;
}): DeploymentReadiness {
  const supabaseOk = input.supabase.status === "local" || input.supabase.status === "ready";
  const checks: DeploymentReadinessCheck[] = [
    {
      label: "Persistence mode",
      ok: supabaseOk,
      detail:
        input.supabase.status === "ready"
          ? "Remote Supabase env values look ready for deployment."
          : input.supabase.status === "local"
            ? "Local-storage MVP mode is valid for demo deployment."
            : "Supabase env values are partially configured or malformed."
    },
    {
      label: "Participant data",
      ok: input.hasParticipants,
      detail: input.hasParticipants
        ? "Demo or live participants are available for smoke testing."
        : "Add or import participants before a launch smoke test."
    },
    {
      label: "Generated teams",
      ok: input.hasGeneratedTeams,
      detail: input.hasGeneratedTeams
        ? "The deterministic matcher can produce a visible team run."
        : "Generate teams before sharing the app with organizers."
    },
    {
      label: "Saved run",
      ok: input.hasSavedRun,
      detail: input.hasSavedRun
        ? "At least one frozen saved run is available for review."
        : "Save a match run before final event operations."
    }
  ];
  const blockingIssue = checks.some((check) => !check.ok && check.label !== "Saved run");

  return {
    status: blockingIssue ? "review" : "ready",
    title: blockingIssue ? "Deployment needs review" : "Deployment preflight looks ready",
    detail: blockingIssue
      ? "Resolve the flagged checks, then run the production build and smoke test."
      : "Run the production build and smoke test before treating the deployment as final.",
    checks
  };
}
