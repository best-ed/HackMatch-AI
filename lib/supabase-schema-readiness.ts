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
    status: "ready",
    detail: "Remote adapter and schema cover saved runs, final-run markers, organizer notes, participant snapshots, settings snapshots, and generated results."
  },
  {
    label: "Team review checklist",
    status: "planned",
    detail: "The SQL schema includes checklist rows, but the current UI still stores review checklist state in browser storage."
  }
];

export function evaluateSupabaseSchemaReadiness(): SupabaseSchemaReadiness {
  const readyCount = schemaItems.filter((item) => item.status === "ready").length;

  return {
    readyCount,
    totalCount: schemaItems.length,
    title: `${readyCount}/${schemaItems.length} persistence surfaces are remote-ready`,
    detail: "Supabase can be plugged in for editable participants, matching settings, and saved runs now. Review checklist metadata still needs a UI adapter before multi-admin production use.",
    items: schemaItems
  };
}
