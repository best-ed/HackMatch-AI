export type SupabaseReadinessStatus = "local" | "ready" | "misconfigured";

export type SupabaseReadiness = {
  status: SupabaseReadinessStatus;
  title: string;
  detail: string;
  checks: Array<{
    label: string;
    ok: boolean;
    detail: string;
  }>;
};

export function evaluateSupabaseReadiness(env: {
  url?: string;
  anonKey?: string;
}): SupabaseReadiness {
  const url = env.url?.trim() ?? "";
  const anonKey = env.anonKey?.trim() ?? "";
  const hasUrl = Boolean(url);
  const hasAnonKey = Boolean(anonKey);
  const urlLooksValid = !hasUrl || isValidSupabaseUrl(url);
  const keyLooksValid = !hasAnonKey || looksLikeJwt(anonKey);
  const checks = [
    {
      label: "Project URL",
      ok: hasUrl ? urlLooksValid : false,
      detail: hasUrl
        ? urlLooksValid
          ? "NEXT_PUBLIC_SUPABASE_URL is present and URL-shaped."
          : "NEXT_PUBLIC_SUPABASE_URL should be a valid https Supabase project URL."
        : "NEXT_PUBLIC_SUPABASE_URL is not configured."
    },
    {
      label: "Anon key",
      ok: hasAnonKey ? keyLooksValid : false,
      detail: hasAnonKey
        ? keyLooksValid
          ? "NEXT_PUBLIC_SUPABASE_ANON_KEY is present and JWT-shaped."
          : "NEXT_PUBLIC_SUPABASE_ANON_KEY should be the public anon JWT, not the service role key."
        : "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured."
    }
  ];

  if (!hasUrl && !hasAnonKey) {
    return {
      status: "local",
      title: "Local-storage MVP mode",
      detail: "Supabase is optional right now. Add both public Supabase env vars when you are ready to persist organizer edits remotely.",
      checks
    };
  }

  if (hasUrl && hasAnonKey && urlLooksValid && keyLooksValid) {
    return {
      status: "ready",
      title: "Supabase env looks ready",
      detail: "Run the SQL schema, redeploy with these env vars, then confirm admin pages show Supabase connected.",
      checks
    };
  }

  return {
    status: "misconfigured",
    title: "Supabase env needs review",
    detail: "Both public Supabase env vars must be present and valid-looking before remote persistence can be trusted.",
    checks
  };
}

function isValidSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

function looksLikeJwt(value: string) {
  return value.split(".").length === 3 && value.length > 40;
}
