import {
  evaluateAdminPasscodeQuality,
  evaluateAdminSessionSecretQuality
} from "@/lib/admin-auth";

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
  adminPasscode,
  adminSessionSecret,
  hasSupabaseUrl,
  hasSupabaseAnonKey,
  hasOpenAiKey,
  hasSmokeScript
}: {
  hasAdminPasscode: boolean;
  hasAdminSessionSecret: boolean;
  adminPasscode?: string;
  adminSessionSecret?: string;
  hasSupabaseUrl: boolean;
  hasSupabaseAnonKey: boolean;
  hasOpenAiKey: boolean;
  hasSmokeScript: boolean;
}): SecurityReadiness {
  const passcodeQuality = evaluateAdminPasscodeQuality({
    ADMIN_PASSCODE: hasAdminPasscode ? adminPasscode ?? "configured-passcode" : undefined
  });
  const secretQuality = evaluateAdminSessionSecretQuality({
    ADMIN_PASSCODE: hasAdminPasscode ? adminPasscode ?? "configured-passcode" : undefined,
    ADMIN_SESSION_SECRET: hasAdminSessionSecret ? adminSessionSecret ?? "configured-session-secret" : undefined
  });
  const checks: SecurityReadinessCheck[] = [
    {
      label: "Admin passcode",
      status: passcodeQuality.status,
      detail: passcodeQuality.detail
    },
    {
      label: "Session secret",
      status: secretQuality.status,
      detail: secretQuality.detail
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
