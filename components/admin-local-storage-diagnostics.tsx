"use client";

import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import {
  formatBytes,
  readLocalStorageDiagnostics,
  type LocalStorageDiagnostics,
  type LocalStorageDiagnosticStatus
} from "@/lib/local-storage-diagnostics";

export function AdminLocalStorageDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<LocalStorageDiagnostics | null>(null);

  useEffect(() => {
    setDiagnostics(readLocalStorageDiagnostics());
  }, []);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-emerald-50 text-primary">
            <HardDrive size={20} />
          </div>
          <div>
            <h2 className="font-semibold">Local storage diagnostics</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browser-local data health for the MVP before remote persistence is connected.
            </p>
          </div>
        </div>
        <Badge className={statusClass(diagnostics?.status ?? "review")}>
          {diagnostics ? diagnostics.status : "checking"}
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <DiagnosticMetric label="HackMatch keys" value={diagnostics?.keyCount ?? 0} />
        <DiagnosticMetric label="Stored data" value={diagnostics ? formatBytes(diagnostics.totalBytes) : "checking"} />
        <DiagnosticMetric label="Largest key" value={diagnostics?.largestKey ? formatBytes(diagnostics.largestKeyBytes) : "none"} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {(diagnostics?.items ?? placeholderItems).map((item) => (
          <div className="rounded-md border border-border bg-white p-3" key={item.label}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">{item.label}</div>
              <Badge className={statusClass(item.status)}>{item.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

const placeholderItems = [
  {
    label: "Storage availability",
    status: "review" as const,
    detail: "Checking browser localStorage after the page loads."
  }
];

function DiagnosticMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function statusClass(status: LocalStorageDiagnosticStatus) {
  if (status === "healthy") return "bg-emerald-100 text-emerald-800";
  if (status === "review") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}
