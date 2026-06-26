import type { SupabaseReadiness } from "@/lib/supabase-readiness";
import type { SupabaseRlsReadiness } from "@/lib/supabase-rls-readiness";
import type { SupabaseSchemaReadiness } from "@/lib/supabase-schema-readiness";

export type RemoteCutoverChecklist = {
  status: "ready" | "review";
  title: string;
  detail: string;
  items: Array<{
    label: string;
    status: "ready" | "review";
    detail: string;
  }>;
};

export function buildRemoteCutoverChecklist({
  supabase,
  schema,
  rls,
  participantCount,
  savedRunCount,
  hasFinalRun
}: {
  supabase: SupabaseReadiness;
  schema: SupabaseSchemaReadiness;
  rls: SupabaseRlsReadiness;
  participantCount: number;
  savedRunCount: number;
  hasFinalRun: boolean;
}): RemoteCutoverChecklist {
  const items = [
    {
      label: "Supabase env",
      status: supabase.status === "ready" ? "ready" : "review",
      detail: supabase.detail
    },
    {
      label: "Persistence coverage",
      status: schema.readyCount === schema.totalCount ? "ready" : "review",
      detail: `${schema.readyCount}/${schema.totalCount} current persistence surfaces are modeled for remote storage.`
    },
    {
      label: "Row-level security",
      status: rls.status === "ready" ? "ready" : "review",
      detail: rls.detail
    },
    {
      label: "Local backup",
      status: participantCount > 0 ? "ready" : "review",
      detail: participantCount > 0
        ? "Download a local backup JSON before switching organizer workflows to remote persistence."
        : "There is no participant data in the current browser workspace yet."
    },
    {
      label: "Frozen handoff run",
      status: hasFinalRun || savedRunCount > 0 ? "ready" : "review",
      detail: hasFinalRun
        ? "A final saved run already exists if you need to compare remote behavior later."
        : savedRunCount > 0
          ? "At least one saved run exists; mark a final one before launch if organizer handoff should be frozen."
          : "Create and save a deterministic run before remote cutover so rollout checks have a baseline."
    }
  ] as const;

  const readyCount = items.filter((item) => item.status === "ready").length;
  const status = readyCount === items.length ? "ready" : "review";

  return {
    status,
    title: status === "ready" ? "Remote cutover checklist looks ready" : "Remote cutover still needs review",
    detail: status === "ready"
      ? "The current workspace is in a good place to attach remote persistence deliberately."
      : "Use this checklist to move from browser-only rehearsal into a safer remote-persistence rollout.",
    items: [...items]
  };
}
