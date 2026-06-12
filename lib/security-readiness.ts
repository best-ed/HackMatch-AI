export type SecurityReadinessStatus = "ready" | "review";

export type SecurityReadinessCheck = {
  label: string;
  status: SecurityReadinessStatus;
  detail: string;
};

export type SecurityReadiness = {
  status: SecurityReadinessStatus;
  readyCount: number;
  totalCount: number;
  checks: SecurityReadinessCheck[];
};

export function evaluateSecurityReadiness({
  hasAdminPasscode,
  hasAdminSessionSecret,
  hasSupabaseUrl,
  hasSupabaseAnonKey,
  hasOpenAiKey,
  hasSmokeScript
}: {
  hasAdminPasscode: boolean;
  hasAdminSessionSecret: boolean;
  hasSupabaseUrl: boolean;
  hasSupabaseAnonKey: boolean;
  hasOpenAiKey: boolean;
  hasSmokeScript: boolean;
}): SecurityReadiness {
  const checks: SecurityReadinessCheck[] = [
    {
      label: "Admin passcode",
      status: hasAdminPasscode ? "ready" : "review",
      detail: hasAdminPasscode
        ? "Admin routes can require a private passcode in this environment."
        : "Set ADMIN_PASSCODE before sharing a deployed admin URL."
    },
    {
      label: "Session secret",
      status: hasAdminSessionSecret ? "ready" : "review",
      detail: hasAdminSessionSecret
        ? "Admin session cookies use a separate secret."
        : "Set ADMIN_SESSION_SECRET so session cookies are not derived from the passcode."
    },
    {
      label: "Remote persistence",
      status: hasSupabaseUrl && hasSupabaseAnonKey ? "ready" : "review",
      detail: hasSupabaseUrl && hasSupabaseAnonKey
        ? "Supabase public env vars are present for remote persistence."
        : "Supabase env vars are optional for demos, but required for multi-admin launch."
    },
    {
      label: "AI explanation key",
      status: hasOpenAiKey ? "ready" : "review",
      detail: hasOpenAiKey
        ? "OpenAI explanations can be enabled without changing deterministic assignments."
        : "No OpenAI key is configured; deterministic fallback explanations remain active."
    },
    {
      label: "Smoke test command",
      status: hasSmokeScript ? "ready" : "review",
      detail: hasSmokeScript
        ? "npm run smoke is available for route-level launch checks."
        : "Add a smoke command before launch checks."
    }
  ];

  const readyCount = checks.filter((check) => check.status === "ready").length;

  return {
    status: readyCount === checks.length ? "ready" : "review",
    readyCount,
    totalCount: checks.length,
    checks
  };
}
