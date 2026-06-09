export type SupabaseSchemaReadinessItem = {
  label: string;
  status: "ready" | "planned" | "local";
  detail: string;
};

export type SupabaseSchemaReadiness = {
  readyCount: number;
  totalCount: number;
  title: string;
  detail: string;
  items: SupabaseSchemaReadinessItem[];
};

const schemaItems: SupabaseSchemaReadinessItem[] = [
  {
    label: "Participants",
    status: "ready",
    detail: "Remote adapter and schema cover participant profiles, cohorts, access tokens, consent, skills, and availability."
  },
  {
    label: "Matching settings",
    status: "ready",
    detail: "Remote adapter and schema cover team size constraints, hard constraints, locked teams, and scoring weights."
  },
  {
    label: "Saved match runs",
    status: "planned",
    detail: "The SQL schema includes match_runs, but the MVP still stores saved run snapshots in browser storage."
  },
  {
    label: "Team review checklist",
    status: "local",
    detail: "Review checklist state is browser-local operational metadata and does not affect deterministic assignments."
  }
];

export function evaluateSupabaseSchemaReadiness(): SupabaseSchemaReadiness {
  const readyCount = schemaItems.filter((item) => item.status === "ready").length;

  return {
    readyCount,
    totalCount: schemaItems.length,
    title: `${readyCount}/${schemaItems.length} persistence surfaces are remote-ready`,
    detail: "Supabase can be plugged in for editable participants and settings now. Saved runs and review metadata need a later remote persistence pass before multi-admin production use.",
    items: schemaItems
  };
}
