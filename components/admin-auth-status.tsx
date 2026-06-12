"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";

type AdminSessionStatus = {
  enabled: boolean;
};

export function AdminAuthStatus() {
  const [status, setStatus] = useState<AdminSessionStatus | undefined>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/session")
      .then((response) => response.json() as Promise<AdminSessionStatus>)
      .then((payload) => {
        if (!cancelled) setStatus(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({ enabled: true });
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

  return (
    <Card className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <div className="font-semibold">Admin access protection</div>
        <p className="mt-1 text-sm text-muted-foreground">
          {enabled
            ? "Admin passcode protection is enabled for this environment."
            : "Admin passcode protection is not configured, so admin routes are open for local MVP testing."}
        </p>
        <div className="mt-3 rounded-md border border-border bg-white p-3 text-sm">
          <div className="font-medium">Where to set the admin password</div>
          <p className="mt-1 text-muted-foreground">
            Add <code className="rounded bg-muted px-1 py-0.5">ADMIN_PASSCODE</code> and{" "}
            <code className="rounded bg-muted px-1 py-0.5">ADMIN_SESSION_SECRET</code> to{" "}
            <code className="rounded bg-muted px-1 py-0.5">.env.local</code>, then restart the server.
          </p>
        </div>
        {message ? <p className="mt-2 text-sm font-medium text-amber-700">{message}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={enabled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
          {enabled ? "Protected" : "Setup needed"}
        </Badge>
        {enabled ? (
          <Button className="border border-border bg-white text-foreground hover:bg-muted" onClick={logout} type="button">
            Log out
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
