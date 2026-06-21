"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { persistAdminAuditEntry } from "@/lib/admin-audit-history";
import { Badge, Button, Card } from "@/components/ui";
import {
  buildAdminAuthSurfaceSummary,
  type AdminAuthSetupSummary,
  type AdminSessionSummary
} from "@/lib/admin-auth";
import { buildAdminSessionWarning } from "@/lib/admin-session-warning";

type AdminRouteAuthPayload = AdminAuthSetupSummary & {
  session?: AdminSessionSummary;
};

export function AdminRouteAuthBanner() {
  const pathname = usePathname();
  const [status, setStatus] = useState<AdminRouteAuthPayload | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/session")
      .then((response) => response.json() as Promise<AdminRouteAuthPayload>)
      .then((payload) => {
        if (!cancelled) setStatus(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({
            enabled: true,
            sessionSecretConfigured: false,
            readyCount: 0,
            totalCount: 3,
            steps: [],
            session: {
              authenticated: false,
              detail: "Could not confirm the current admin access mode from the session endpoint.",
              status: "invalid"
            }
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (pathname === "/admin" || pathname === "/admin/login") {
    return null;
  }

  const surface = buildAdminAuthSurfaceSummary({
    enabled: Boolean(status?.enabled),
    readyCount: status?.readyCount ?? 0,
    totalCount: status?.totalCount ?? 3,
    session: status?.session
  });
  const sessionWarning = buildAdminSessionWarning(status?.session);
  const canRefresh = Boolean(status?.enabled) && status?.session?.status === "active";

  async function refreshSession() {
    setRefreshing(true);
    setMessage("");

    const response = await fetch("/api/admin/session", {
      method: "PATCH"
    });
    const payload = await response.json().catch(() => ({})) as {
      ok?: boolean;
      detail?: string;
      session?: AdminSessionSummary;
    };

    if (!response.ok) {
      setMessage(payload.detail ?? "Could not refresh the current admin session.");
      setRefreshing(false);
      return;
    }

    persistAdminAuditEntry({
      action: "auth-refresh",
      label: "Admin session refreshed",
      detail: "Extended the current organizer session before continuing admin work."
    });
    setStatus((current) => current ? {
      ...current,
      session: payload.session ?? current.session
    } : current);
    setMessage(payload.session?.detail ?? "Admin session refreshed.");
    setRefreshing(false);
  }

  return (
    <Card className="border-primary/15 bg-white/90 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold">Admin access mode</div>
            <Badge className={modeBadgeClass(surface.mode)}>
              {surface.modeLabel}
            </Badge>
            {status ? (
              <Badge className="bg-slate-100 text-slate-800">
                {status.readyCount}/{status.totalCount} setup checks ready
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-800">Checking</Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {surface.detail}
          </p>
          {sessionWarning ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <div className="font-semibold">{sessionWarning.label}</div>
              <p className="mt-1 text-amber-900/80">{sessionWarning.detail}</p>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canRefresh ? (
            <Button
              className="border border-border bg-white text-foreground hover:bg-muted"
              disabled={refreshing}
              onClick={() => void refreshSession()}
              type="button"
            >
              {refreshing ? "Refreshing..." : "Refresh session"}
            </Button>
          ) : null}
          <Link
            className="inline-flex rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            href={surface.actionHref}
          >
            {surface.actionLabel}
          </Link>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm font-medium text-amber-700">{message}</p> : null}
    </Card>
  );
}

function modeBadgeClass(mode: ReturnType<typeof buildAdminAuthSurfaceSummary>["mode"]) {
  switch (mode) {
    case "protected":
      return "bg-emerald-100 text-emerald-800";
    case "review":
      return "bg-amber-100 text-amber-800";
    case "demo":
      return "bg-sky-100 text-sky-800";
  }
}
