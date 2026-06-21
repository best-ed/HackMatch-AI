import { buildAdminAuthGuidance, isAdminAuthConfigured, summarizeAdminAuthSetup } from "@/lib/admin-auth";

type AdminRuntimeEnv = {
  [key: string]: string | undefined;
  OPENAI_API_KEY?: string;
};

export type AdminRuntimeSignals = {
  hasAdminPasscode: boolean;
  hasAdminSessionSecret: boolean;
  adminProtectionConfigured: boolean;
  authMode: "disabled" | "review" | "ready";
  authReadyCount: number;
  authTotalCount: number;
  hasOpenAiKey: boolean;
};

export function readAdminRuntimeSignals(env: AdminRuntimeEnv = process.env): AdminRuntimeSignals {
  const authSetup = summarizeAdminAuthSetup(env);
  const guidance = buildAdminAuthGuidance(authSetup);

  return {
    hasAdminPasscode: isAdminAuthConfigured(env),
    hasAdminSessionSecret: authSetup.sessionSecretConfigured,
    adminProtectionConfigured: authSetup.enabled && authSetup.readyCount === authSetup.totalCount,
    authMode: guidance.mode,
    authReadyCount: authSetup.readyCount,
    authTotalCount: authSetup.totalCount,
    hasOpenAiKey: Boolean(env.OPENAI_API_KEY?.trim())
  };
}
