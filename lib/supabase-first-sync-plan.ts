import type { SupabaseReadiness } from "@/lib/supabase-readiness";

export type SupabaseFirstSyncPlan = {
  title: string;
  detail: string;
  steps: Array<{
    label: string;
    detail: string;
  }>;
};

export function buildSupabaseFirstSyncPlan({
  readiness,
  participantCount,
  savedRunCount,
  backupExports
}: {
  readiness: SupabaseReadiness;
  participantCount: number;
  savedRunCount: number;
  backupExports: number;
}): SupabaseFirstSyncPlan {
  const steps = [
    {
      label: "Back up the local workspace",
      detail: backupExports > 0
        ? "A backup has already been exported in this browser. Download a fresh one if anything important changed."
        : "Download a backup JSON before the first remote rehearsal so you can recover the current browser state quickly."
    },
    {
      label: "Run the SQL schema",
      detail: "Apply lib/schema.sql to the target Supabase project before expecting workspace state, participants, or saved runs to sync remotely."
    },
    {
      label: "Attach public env vars",
      detail: readiness.status === "ready"
        ? "Public Supabase env vars already look attached. Redeploy or restart localhost if the current runtime still shows local mode."
        : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app."
    },
    {
      label: "Seed a deterministic checkpoint",
      detail: savedRunCount > 0
        ? `There are already ${savedRunCount} saved run(s) available for remote comparison after first sync.`
        : "Generate teams and save at least one run so first-sync verification has a frozen baseline."
    },
    {
      label: "Verify organizer state",
      detail: participantCount > 0
        ? "Switch cohorts, archive one, and confirm the overview/settings pages still reflect the same organizer state after reload."
        : "Load participants first so remote sync can be verified with meaningful organizer data."
    }
  ];

  return {
    title: "First remote sync plan",
    detail: "Use this sequence when you are ready to move from browser-only rehearsal into the first Supabase-backed organizer rehearsal.",
    steps
  };
}
