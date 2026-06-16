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
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/session")
      .then((response) => response.json() as Promise<{ enabled: boolean; loginGuard?: { retryAfterSeconds: number } }>)
      .then((payload) => {
        if (!cancelled) {
          setEnabled(payload.enabled);
          if ((payload.loginGuard?.retryAfterSeconds ?? 0) > 0) {
            const retryAfterSeconds = payload.loginGuard?.retryAfterSeconds ?? 0;
            setCooldownSeconds(retryAfterSeconds);
            setStatus(`Too many attempts. Try again in ${formatCooldown(retryAfterSeconds)}.`);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setEnabled(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

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
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        remainingAttempts?: number;
        retryAfterSeconds?: number;
      };
      const retryAfterSeconds = payload.retryAfterSeconds ?? 0;

      if (retryAfterSeconds > 0) {
        setCooldownSeconds(retryAfterSeconds);
        setStatus(`Too many attempts. Try again in ${formatCooldown(retryAfterSeconds)}.`);
      } else if (typeof payload.remainingAttempts === "number") {
        setStatus(
          `Invalid passcode. ${payload.remainingAttempts} attempt${payload.remainingAttempts === 1 ? "" : "s"} left before cooldown.`
        );
      } else {
        setStatus("Invalid passcode. Try again.");
      }

      setLoading(false);
      return;
    }

    setCooldownSeconds(0);
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
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={loading || !passcode.trim() || cooldownSeconds > 0} type="submit">
              {loading ? "Checking..." : cooldownSeconds > 0 ? `Retry in ${formatCooldown(cooldownSeconds)}` : "Unlock admin"}
            </Button>
            {cooldownSeconds > 0 ? (
              <Badge className="bg-amber-100 text-amber-800">
                Cooldown {formatCooldown(cooldownSeconds)}
              </Badge>
            ) : null}
          </div>
        </form>
        {status ? (
          <div
            className={`rounded-md px-4 py-3 text-sm font-medium ${
              cooldownSeconds > 0
                ? "border border-amber-200 bg-amber-50 text-amber-800"
                : "border border-rose-200 bg-rose-50 text-rose-800"
            }`}
            role="status"
          >
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

function formatCooldown(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}
