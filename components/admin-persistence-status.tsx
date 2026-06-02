"use client";

import { Badge, Card } from "@/components/ui";

export function AdminPersistenceStatus({
  mode,
  warning,
  detail = "Participants and matching settings are editable in this browser. Configure Supabase env vars to persist them remotely."
}: {
  mode: "local" | "supabase";
  warning?: string;
  detail?: string;
}) {
  return (
    <Card className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="font-semibold">Persistence status</div>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "supabase"
            ? "Supabase is configured. Successful participant and settings edits are mirrored to the remote database."
            : detail}
        </p>
        {warning ? (
          <p className="mt-2 text-sm font-medium text-amber-700">{warning}</p>
        ) : null}
      </div>
      <Badge className={mode === "supabase" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}>
        {mode === "supabase" ? "Supabase connected" : "Local storage"}
      </Badge>
    </Card>
  );
}
