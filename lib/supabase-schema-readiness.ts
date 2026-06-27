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
    status: "ready",
    detail: "Remote adapter and schema cover organizer checklist rows while preserving local browser fallback."
  },
  {
    label: "Workspace state",
    status: "planned",
    detail: "Schema now includes active cohort, archived cohorts, and admin audit history, but the remote workspace adapter still needs to be wired."
  }
];

export function evaluateSupabaseSchemaReadiness(): SupabaseSchemaReadiness {
  const readyCount = schemaItems.filter((item) => item.status === "ready").length;

  return {
    readyCount,
    totalCount: schemaItems.length,
    title: `${readyCount}/${schemaItems.length} persistence surfaces are remote-ready`,
    detail: "Supabase can be plugged in for editable participants, matching settings, saved runs, and team review checklist metadata while preserving local browser fallback.",
    items: schemaItems
  };
}
