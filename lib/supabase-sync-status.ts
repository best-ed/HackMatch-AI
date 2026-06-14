import type { SupabaseReadiness } from "@/lib/supabase-readiness";
import type { SupabaseSchemaReadiness } from "@/lib/supabase-schema-readiness";

export type SupabaseSyncStatus = "remote-active" | "local-only" | "needs-review";

export type SupabaseSyncSurface = {
  label: string;
  status: "synced" | "local" | "ready" | "review";
  detail: string;
};

export type SupabaseSyncSummary = {
  status: SupabaseSyncStatus;
  title: string;
  detail: string;
  activeModeLabel: string;
  fallbackLabel: string;
  surfaces: SupabaseSyncSurface[];
};

export function buildSupabaseSyncSummary({
  persistenceMode,
  persistenceWarning,
  readiness,
  schema,
  participantsCount,
  savedRunsCount
}: {
  persistenceMode: "local" | "supabase";
  persistenceWarning?: string;
  readiness: SupabaseReadiness;
  schema: SupabaseSchemaReadiness;
  participantsCount: number;
  savedRunsCount: number;
}): SupabaseSyncSummary {
  const remoteEnvReady = readiness.status === "ready";
  const remoteSurfacesReady = schema.readyCount === schema.totalCount;
  const hasWarning = Boolean(persistenceWarning?.trim());
  const status: SupabaseSyncStatus = hasWarning
    ? "needs-review"
    : persistenceMode === "supabase"
      ? "remote-active"
      : "local-only";

  return {
    status,
    title: statusTitle(status),
    detail: statusDetail({ status, remoteEnvReady, remoteSurfacesReady, hasWarning }),
    activeModeLabel: persistenceMode === "supabase" ? "Supabase active" : "Browser-local active",
    fallbackLabel: persistenceMode === "supabase"
      ? "Local fallback remains updated after successful remote loads and local edits."
      : "Local storage is the source of truth until Supabase env vars connect.",
    surfaces: [
      {
        label: "Runtime mode",
        status: persistenceMode === "supabase" ? "synced" : "local",
        detail: persistenceMode === "supabase"
          ? "Admin data loaded through the Supabase adapter in this browser session."
          : "Admin data is currently read and written in this browser."
      },
      {
        label: "Remote env",
        status: remoteEnvReady ? "ready" : readiness.status === "misconfigured" ? "review" : "local",
        detail: readiness.detail
      },
      {
        label: "Remote surfaces",
        status: remoteSurfacesReady ? "ready" : "review",
        detail: `${schema.readyCount}/${schema.totalCount} persistence surfaces are marked remote-ready.`
      },
      {
        label: "Local data footprint",
        status: participantsCount > 0 || savedRunsCount > 0 ? "ready" : "review",
        detail: `${participantsCount} participant record(s) and ${savedRunsCount} saved run(s) are available to the app.`
      }
    ]
  };
}

function statusTitle(status: SupabaseSyncStatus) {
  if (status === "remote-active") return "Remote sync is active";
  if (status === "needs-review") return "Sync needs review";
  return "Local persistence is active";
}

function statusDetail({
  status,
  remoteEnvReady,
  remoteSurfacesReady,
  hasWarning
}: {
  status: SupabaseSyncStatus;
  remoteEnvReady: boolean;
  remoteSurfacesReady: boolean;
  hasWarning: boolean;
}) {
  if (status === "remote-active") {
    return "Supabase is the active persistence layer for editable organizer data in this browser session.";
  }

  if (hasWarning) {
    return "The app is preserving local edits, but the latest Supabase operation reported a warning.";
  }

  if (!remoteEnvReady) {
    return "Supabase is not connected yet, so local browser storage is intentionally carrying the MVP.";
  }

  if (!remoteSurfacesReady) {
    return "Supabase env values look ready, but persistence coverage should be reviewed before launch.";
  }

  return "Remote persistence is plug-ready, but this browser session is still using local storage.";
}
