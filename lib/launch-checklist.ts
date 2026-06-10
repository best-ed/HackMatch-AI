import type { DeploymentReadiness } from "@/lib/deployment-readiness";
import type { SupabaseReadiness } from "@/lib/supabase-readiness";

export type LaunchChecklistItem = {
  label: string;
  status: "ready" | "review";
  detail: string;
};

export type LaunchChecklist = {
  readyCount: number;
  totalCount: number;
  items: LaunchChecklistItem[];
};

export function buildLaunchChecklist({
  deployment,
  supabase,
  hasFinalRun,
  hasSavedRun,
  hasRemoteSavedRunSupport,
  hasOpenAiKey
}: {
  deployment: DeploymentReadiness;
  supabase: SupabaseReadiness;
  hasFinalRun: boolean;
  hasSavedRun: boolean;
  hasRemoteSavedRunSupport: boolean;
  hasOpenAiKey: boolean;
}): LaunchChecklist {
  const items: LaunchChecklistItem[] = [
    {
      label: "Production build",
      status: deployment.status === "ready" ? "ready" : "review",
      detail:
        deployment.status === "ready"
          ? "Browser-visible preflight is ready; still run npm run build before launch."
          : "Resolve deployment preflight review items before launch."
    },
    {
      label: "Persistence decision",
      status: supabase.status === "ready" || supabase.status === "local" ? "ready" : "review",
      detail:
        supabase.status === "ready"
          ? "Supabase env values look ready for remote editable data."
          : supabase.status === "local"
            ? "Local-storage mode is acceptable for demos, but not multi-admin production."
            : "Supabase env values are partially configured or malformed."
    },
    {
      label: "Saved-run handoff",
      status: hasSavedRun && hasFinalRun ? "ready" : "review",
      detail:
        hasSavedRun && hasFinalRun
          ? "A saved run is marked final for organizer handoff."
          : hasSavedRun
            ? "Mark one saved run as final before event handoff."
            : "Save a deterministic run before launch handoff."
    },
    {
      label: "Remote saved-run support",
      status: hasRemoteSavedRunSupport ? "ready" : "review",
      detail: hasRemoteSavedRunSupport
        ? "Schema and adapter support saved match runs remotely."
        : "Saved runs need remote persistence before multi-admin production."
    },
    {
      label: "AI explanation mode",
      status: "ready",
      detail: hasOpenAiKey
        ? "OpenAI-backed explanations can be enabled; assignments remain deterministic."
        : "Deterministic fallback explanations are active without an API key."
    }
  ];

  return {
    readyCount: items.filter((item) => item.status === "ready").length,
    totalCount: items.length,
    items
  };
}
