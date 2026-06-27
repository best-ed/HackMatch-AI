import type { SupabaseSchemaReadiness } from "@/lib/supabase-schema-readiness";

export type SupabaseSyncCoverage = {
  title: string;
  detail: string;
  items: Array<{
    label: string;
    status: "active" | "fallback" | "planned";
    detail: string;
  }>;
};

export function buildSupabaseSyncCoverage({
  persistenceMode,
  schema
}: {
  persistenceMode: "local" | "supabase";
  schema: SupabaseSchemaReadiness;
}): SupabaseSyncCoverage {
  const items = schema.items.map((item) => ({
    label: item.label,
    status: item.status === "planned"
      ? "planned" as const
      : persistenceMode === "supabase"
        ? "active" as const
        : "fallback" as const,
    detail: item.detail
  }));

  return {
    title: persistenceMode === "supabase" ? "Remote sync coverage" : "Local fallback coverage",
    detail: persistenceMode === "supabase"
      ? "These surfaces are currently configured to use Supabase where adapter support exists."
      : "These surfaces still fall back to browser-local storage until Supabase is attached and reachable.",
    items
  };
}
