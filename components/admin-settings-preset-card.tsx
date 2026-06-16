import { Badge } from "@/components/ui";
import type { SettingsPresetPreview } from "@/lib/settings-preset-preview";

export function AdminSettingsPresetCard({
  onApply,
  preview
}: {
  onApply: () => void;
  preview?: SettingsPresetPreview;
}) {
  if (!preview) return null;

  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{preview.name}</div>
          <p className="mt-1 text-sm text-muted-foreground">{preview.description}</p>
        </div>
        <Badge className={healthBadgeClass(preview.health.status)}>{preview.health.status}</Badge>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="rounded-md bg-muted p-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Optimizes</div>
          <p className="mt-1">{preview.objective}</p>
        </div>
        <div className="rounded-md bg-amber-50 p-3 text-amber-950">
          <div className="text-xs font-semibold uppercase text-amber-800">Tradeoff</div>
          <p className="mt-1">{preview.tradeoff}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Badge>{preview.changeCount} draft change{preview.changeCount === 1 ? "" : "s"}</Badge>
        <button
          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:-translate-y-0.5"
          onClick={onApply}
          type="button"
        >
          Apply to draft
        </button>
      </div>
    </div>
  );
}

function healthBadgeClass(status: "healthy" | "warning" | "error") {
  if (status === "healthy") return "bg-emerald-100 text-emerald-800";
  if (status === "warning") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}
