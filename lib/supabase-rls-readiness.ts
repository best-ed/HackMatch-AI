export type SupabaseRlsReadinessStatus = "ready" | "review";

export type SupabaseRlsReadinessItem = {
  label: string;
  status: SupabaseRlsReadinessStatus;
  detail: string;
  action: string;
};

export type SupabaseRlsReadiness = {
  status: SupabaseRlsReadinessStatus;
  readyCount: number;
  totalCount: number;
  title: string;
  detail: string;
  items: SupabaseRlsReadinessItem[];
};

export function evaluateSupabaseRlsReadiness({
  hasAdminPasscode,
  hasSupabaseEnv,
  usesAnonClient
}: {
  hasAdminPasscode: boolean;
  hasSupabaseEnv: boolean;
  usesAnonClient: boolean;
}): SupabaseRlsReadiness {
  const items: SupabaseRlsReadinessItem[] = [
    {
      label: "Admin access boundary",
      status: hasAdminPasscode ? "ready" : "review",
      detail: hasAdminPasscode
        ? "Admin routes can be gated before organizers reach Supabase-backed data."
        : "Admin routes are open in local-demo mode.",
      action: hasAdminPasscode
        ? "Keep ADMIN_PASSCODE and ADMIN_SESSION_SECRET configured outside source control."
        : "Configure admin auth before exposing Supabase-backed organizer pages."
    },
    {
      label: "Remote env boundary",
      status: hasSupabaseEnv ? "ready" : "review",
      detail: hasSupabaseEnv
        ? "Public Supabase URL and anon key are present for remote persistence."
        : "Supabase env vars are absent, so localStorage remains the active persistence layer.",
      action: hasSupabaseEnv
        ? "Confirm the anon key belongs to the intended project."
        : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY when remote persistence is needed."
    },
    {
      label: "Anon client policy",
      status: usesAnonClient ? "review" : "ready",
      detail: usesAnonClient
        ? "The browser adapter uses the public anon key, so table access must be constrained by Supabase policies before production."
        : "Server-only persistence can enforce authorization before database access.",
      action: usesAnonClient
        ? "Enable RLS and add least-privilege policies before treating Supabase as production-ready."
        : "Keep service-role keys server-only if server persistence is added later."
    },
    {
      label: "Participant contact privacy",
      status: "review",
      detail: "Participant rows include email, phone, links, consent, access tokens, and cohort data.",
      action: "Use RLS policies that prevent public reads of participant contact fields outside an authenticated organizer flow."
    },
    {
      label: "Saved-run snapshots",
      status: "review",
      detail: "Saved runs store full participant and settings snapshots for deterministic export history.",
      action: "Restrict match_runs reads and writes to authenticated organizers before launch."
    }
  ];
  const readyCount = items.filter((item) => item.status === "ready").length;
  const totalCount = items.length;
  const status = readyCount === totalCount ? "ready" : "review";

  return {
    status,
    readyCount,
    totalCount,
    title: status === "ready" ? "RLS posture is ready" : "RLS posture needs review",
    detail:
      status === "ready"
        ? "Supabase access boundaries look ready for production review."
        : "Schema and env readiness do not replace row-level policies or authenticated organizer authorization.",
    items
  };
}
