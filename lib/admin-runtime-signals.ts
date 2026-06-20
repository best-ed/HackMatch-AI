import { isAdminAuthConfigured, summarizeAdminAuthSetup } from "@/lib/admin-auth";

type AdminRuntimeEnv = {
  [key: string]: string | undefined;
  OPENAI_API_KEY?: string;
};

export type AdminRuntimeSignals = {
  hasAdminPasscode: boolean;
  adminProtectionConfigured: boolean;
  hasOpenAiKey: boolean;
};

export function readAdminRuntimeSignals(env: AdminRuntimeEnv = process.env): AdminRuntimeSignals {
  const authSetup = summarizeAdminAuthSetup(env);

  return {
    hasAdminPasscode: isAdminAuthConfigured(env),
    adminProtectionConfigured: authSetup.enabled && authSetup.readyCount === authSetup.totalCount,
    hasOpenAiKey: Boolean(env.OPENAI_API_KEY?.trim())
  };
}
