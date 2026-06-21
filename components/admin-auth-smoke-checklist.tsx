"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { buildAdminAuthSmokeChecklist } from "@/lib/admin-auth-smoke-checklist";
import type { AdminAuthSetupSummary, AdminSessionSummary } from "@/lib/admin-auth";
import type { AdminRuntimeSignals } from "@/lib/admin-runtime-signals";

type AdminSessionPayload = AdminAuthSetupSummary & {
  loginGuard?: { retryAfterSeconds?: number };
  session?: AdminSessionSummary;
};

export function AdminAuthSmokeChecklist({
  nextPath = "/admin",
  initialRuntimeSignals,
  disableRuntimeFetch = false
}: {
  nextPath?: string;
  initialRuntimeSignals?: AdminRuntimeSignals;
  disableRuntimeFetch?: boolean;
}) {
  const [sessionPayload, setSessionPayload] = useState<AdminSessionPayload | undefined>();
  const [runtimeSignals, setRuntimeSignals] = useState<AdminRuntimeSignals | undefined>(initialRuntimeSignals);
  const [runtimeReachable, setRuntimeReachable] = useState(Boolean(initialRuntimeSignals) || disableRuntimeFetch);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/session")
      .then((response) => response.json() as Promise<AdminSessionPayload>)
      .then((payload) => {
        if (!cancelled) setSessionPayload(payload);
      })
      .catch(() => {
        if (!cancelled) setSessionPayload(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (disableRuntimeFetch || initialRuntimeSignals) return;

    let cancelled = false;
    void fetch("/api/admin/runtime-signals")
      .then((response) => {
        if (!response.ok) throw new Error("runtime-unavailable");
        return response.json() as Promise<AdminRuntimeSignals>;
      })
      .then((payload) => {
        if (!cancelled) {
          setRuntimeSignals(payload);
          setRuntimeReachable(true);
        }
      })
      .catch(() => {
        if (!cancelled) setRuntimeReachable(false);
      });

    return () => {
      cancelled = true;
    };
  }, [disableRuntimeFetch, initialRuntimeSignals]);

  const checklist = useMemo(
    () =>
      buildAdminAuthSmokeChecklist({
        nextPath,
        setupSummary: sessionPayload && {
          enabled: sessionPayload.enabled,
          sessionSecretConfigured: sessionPayload.sessionSecretConfigured,
          readyCount: sessionPayload.readyCount,
          totalCount: sessionPayload.totalCount
        },
        session: sessionPayload?.session,
        loginGuardRetryAfterSeconds: sessionPayload?.loginGuard?.retryAfterSeconds ?? 0,
        runtimeSignals,
        runtimeReachable
      }),
    [nextPath, runtimeReachable, runtimeSignals, sessionPayload]
  );

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Admin auth smoke checklist</h2>
          <p className="mt-1 text-sm text-muted-foreground">{checklist.detail}</p>
        </div>
        <Badge className={checklist.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
          {checklist.readyCount}/{checklist.totalCount} ready
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {checklist.items.map((item) => (
          <div className="rounded-md border border-border bg-white p-3 text-sm" key={item.label}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{item.label}</div>
              <Badge className={item.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                {item.status}
              </Badge>
            </div>
            <p className="mt-2 text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
