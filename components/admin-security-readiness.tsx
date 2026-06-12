"use client";

import { useEffect, useState } from "react";
import { Badge, Card } from "@/components/ui";
import type { SecurityReadiness } from "@/lib/security-readiness";

export function AdminSecurityReadiness() {
  const [readiness, setReadiness] = useState<SecurityReadiness | undefined>();

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/security-readiness")
      .then((response) => response.json() as Promise<SecurityReadiness>)
      .then((payload) => {
        if (!cancelled) setReadiness(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setReadiness({
            status: "review",
            readyCount: 0,
            totalCount: 1,
            checks: [
              {
                label: "Security readiness endpoint",
                status: "review",
                detail: "Could not load environment readiness checks."
              }
            ]
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Security readiness</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sanitized launch checks for admin auth, remote persistence, AI explanations, and smoke testing.
          </p>
        </div>
        <Badge className={readiness?.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
          {readiness ? `${readiness.readyCount}/${readiness.totalCount} ready` : "Loading"}
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {(readiness?.checks ?? skeletonChecks).map((check) => (
          <div className="rounded-md border border-border bg-white p-4" key={check.label}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">{check.label}</div>
              <Badge className={check.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                {check.status}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{check.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

const skeletonChecks: SecurityReadiness["checks"] = [
  {
    label: "Loading checks",
    status: "review",
    detail: "Reading sanitized environment readiness from the server."
  }
];
