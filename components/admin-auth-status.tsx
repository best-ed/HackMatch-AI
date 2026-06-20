"use client";

import { useEffect, useState } from "react";
import { persistAdminAuditEntry } from "@/lib/admin-audit-history";
import { Badge, Button, Card } from "@/components/ui";
import type { AdminAuthSetupSummary, AdminSessionSummary } from "@/lib/admin-auth";
import { buildAdminSessionWarning } from "@/lib/admin-session-warning";

type AdminAuthStatusPayload = AdminAuthSetupSummary & {
  session?: AdminSessionSummary;
};

export function AdminAuthStatus() {
  const [status, setStatus] = useState<AdminAuthStatusPayload | undefined>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/session")
      .then((response) => response.json() as Promise<AdminAuthStatusPayload>)
      .then((payload) => {
        if (!cancelled) setStatus(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({
            enabled: true,
            sessionSecretConfigured: false,
            readyCount: 0,
            session: {
              authenticated: false,
              detail: "Could not confirm current admin session state from the session endpoint.",
              status: "invalid"
            },
            totalCount: 1,
            steps: [
              {
                label: "Admin session endpoint",
                status: "review",
                detail: "Could not confirm admin auth setup from the session endpoint."
              }
            ]
          });
          setMessage("Could not confirm admin auth status from the session endpoint.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    persistAdminAuditEntry({
      action: "auth-logout",
      label: "Admin signed out",
      detail: "Ended the current organizer session from the admin workspace."
    });
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  const enabled = Boolean(status?.enabled);
  const readyCount = status?.readyCount ?? 0;
  const totalCount = status?.totalCount ?? 3;
  const isReady = Boolean(status && readyCount === totalCount);
  const session = status?.session;
  const sessionWarning = buildAdminSessionWarning(session);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="font-semibold">Admin access protection</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {enabled
              ? "Admin passcode protection is enabled for this environment."
              : "Admin passcode protection is not configured, so admin routes are open for local MVP testing."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={isReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
            {status ? `${readyCount}/${totalCount} ready` : "Checking"}
          </Badge>
          <Badge className={enabled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
            {enabled ? "Protected" : "Setup needed"}
          </Badge>
          {session ? (
            <Badge className={sessionBadgeClass(session.status)}>
              {sessionBadgeLabel(session.status)}
            </Badge>
          ) : null}
          {sessionWarning ? (
            <Badge className="bg-amber-100 text-amber-800">
              {sessionWarning.label}
            </Badge>
          ) : null}
          {enabled ? (
            <Button className="border border-border bg-white text-foreground hover:bg-muted" onClick={logout} type="button">
              Log out
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3 md:grid-cols-3">
          {(status?.steps ?? fallbackSteps).map((step) => (
            <div className="rounded-md border border-border bg-white p-3 text-sm" key={step.label}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{step.label}</div>
                <Badge className={step.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                  {step.status}
                </Badge>
              </div>
              <p className="mt-2 text-muted-foreground">{step.detail}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3">
          <div className="rounded-md border border-border bg-white p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">Current session</div>
              <Badge className={session ? sessionBadgeClass(session.status) : "bg-slate-100 text-slate-800"}>
                {session ? sessionBadgeLabel(session.status) : "Checking"}
              </Badge>
            </div>
            <p className="mt-2 text-muted-foreground">
              {session?.detail ?? "Reading admin session health from the server."}
            </p>
            {session?.expiresAt ? (
              <div className="mt-3 rounded-md bg-muted p-3 text-xs text-foreground">
                <div>Expires at: {formatSessionExpiry(session.expiresAt)}</div>
                {typeof session.remainingSeconds === "number" ? (
                  <div>Time left: {formatRemaining(session.remainingSeconds)}</div>
                ) : null}
              </div>
            ) : null}
            {sessionWarning ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <div className="font-semibold">{sessionWarning.label}</div>
                <p className="mt-1 text-amber-900/80">{sessionWarning.detail}</p>
              </div>
            ) : null}
          </div>
          <div className="rounded-md border border-border bg-white p-3 text-sm">
            <div className="font-medium">Where to set the admin password</div>
            <p className="mt-1 text-muted-foreground">
              Add <code className="rounded bg-muted px-1 py-0.5">ADMIN_PASSCODE</code> and{" "}
              <code className="rounded bg-muted px-1 py-0.5">ADMIN_SESSION_SECRET</code> to{" "}
              <code className="rounded bg-muted px-1 py-0.5">.env.local</code>, then restart the server.
            </p>
            <div className="mt-3 rounded-md bg-muted p-3 font-mono text-xs text-foreground">
              <div>ADMIN_PASSCODE=choose_a_private_passcode</div>
              <div>ADMIN_SESSION_SECRET=choose_a_long_random_secret</div>
            </div>
          </div>
        </div>
      </div>
      {message ? <p className="text-sm font-medium text-amber-700">{message}</p> : null}
      {!enabled ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Local demos can stay open, but deployed organizer links should not be shared until admin protection is configured.
        </p>
      ) : null}
    </Card>
  );
}

const fallbackSteps: AdminAuthSetupSummary["steps"] = [
  {
    label: "Loading setup",
    status: "review",
    detail: "Reading sanitized admin auth setup from the server."
  }
];

function sessionBadgeLabel(status: AdminSessionSummary["status"]) {
  switch (status) {
    case "active":
      return "Session active";
    case "not-required":
      return "No session needed";
    case "missing":
      return "No session";
    case "expired":
      return "Expired";
    case "invalid":
      return "Invalid";
  }
}

function sessionBadgeClass(status: AdminSessionSummary["status"]) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "not-required":
      return "bg-sky-100 text-sky-800";
    case "missing":
      return "bg-slate-100 text-slate-800";
    case "expired":
      return "bg-amber-100 text-amber-800";
    case "invalid":
      return "bg-rose-100 text-rose-800";
  }
}

function formatRemaining(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function formatSessionExpiry(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}
