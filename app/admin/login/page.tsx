"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Card, TextInput } from "@/components/ui";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const [passcode, setPasscode] = useState("");
  const [enabled, setEnabled] = useState<boolean | undefined>();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/session")
      .then((response) => response.json() as Promise<{ enabled: boolean }>)
      .then((payload) => {
        if (!cancelled) setEnabled(payload.enabled);
      })
      .catch(() => {
        if (!cancelled) setEnabled(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode })
    });

    if (!response.ok) {
      setStatus("Invalid passcode. Try again.");
      setLoading(false);
      return;
    }

    window.location.href = nextPath;
  }

  if (enabled === false) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="space-y-4">
          <Badge className="bg-slate-100 text-slate-800">Auth disabled</Badge>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin access</h1>
            <p className="mt-2 text-muted-foreground">
              Admin passcode protection is not configured in this environment.
            </p>
          </div>
          <a className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={nextPath}>
            Continue to admin
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin login</h1>
            <p className="mt-2 text-muted-foreground">
              Enter the event admin passcode to manage participants, matching settings, saved runs, and exports.
            </p>
          </div>
          <Badge>Protected</Badge>
        </div>
        <form className="space-y-4" onSubmit={submitLogin}>
          <label className="grid gap-2 text-sm font-medium">
            <span>Admin passcode</span>
            <TextInput
              autoComplete="current-password"
              autoFocus
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Enter passcode"
              type="password"
              value={passcode}
            />
          </label>
          <Button disabled={loading || !passcode.trim()} type="submit">
            {loading ? "Checking..." : "Unlock admin"}
          </Button>
        </form>
        {status ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800" role="status">
            {status}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <div className="text-sm text-muted-foreground">Loading admin access...</div>
      </Card>
    </div>
  );
}

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/admin") || value.startsWith("/admin/login")) {
    return "/admin";
  }
  return value;
}
