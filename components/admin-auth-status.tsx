"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import type { AdminAuthSetupSummary } from "@/lib/admin-auth";

export function AdminAuthStatus() {
  const [status, setStatus] = useState<AdminAuthSetupSummary | undefined>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/session")
      .then((response) => response.json() as Promise<AdminAuthSetupSummary>)
      .then((payload) => {
        if (!cancelled) setStatus(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({
            enabled: true,
            sessionSecretConfigured: false,
            readyCount: 0,
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
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  const enabled = Boolean(status?.enabled);
  const readyCount = status?.readyCount ?? 0;
  const totalCount = status?.totalCount ?? 3;
  const isReady = Boolean(status && readyCount === totalCount);

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
