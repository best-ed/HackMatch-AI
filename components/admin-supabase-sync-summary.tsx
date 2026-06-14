import { Badge } from "@/components/ui";
import type { SupabaseSyncStatus, SupabaseSyncSummary } from "@/lib/supabase-sync-status";

export function AdminSupabaseSyncSummary({ summary }: { summary: SupabaseSyncSummary }) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{summary.title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{summary.detail}</p>
        </div>
        <Badge className={syncStatusClass(summary.status)}>{summary.activeModeLabel}</Badge>
      </div>
      <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
        {summary.fallbackLabel}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {summary.surfaces.map((surface) => (
          <div className="rounded-md border border-border bg-muted/35 p-3" key={surface.label}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">{surface.label}</div>
              <Badge className={surfaceStatusClass(surface.status)}>{surface.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{surface.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function syncStatusClass(status: SupabaseSyncStatus) {
  if (status === "remote-active") return "bg-emerald-100 text-emerald-800";
  if (status === "needs-review") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-800";
}

function surfaceStatusClass(status: SupabaseSyncSummary["surfaces"][number]["status"]) {
  if (status === "synced" || status === "ready") return "bg-emerald-100 text-emerald-800";
  if (status === "review") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-800";
}
