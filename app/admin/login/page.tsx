"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buildAdminAuthGuidance, type AdminAuthSetupSummary } from "@/lib/admin-auth";
import { persistAdminAuditEntry } from "@/lib/admin-audit-history";
import { Badge, Button, Card, TextInput } from "@/components/ui";
import { sanitizeAdminNextPath } from "@/lib/admin-auth-routing";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const nextPath = sanitizeAdminNextPath(searchParams.get("next"));
  const [passcode, setPasscode] = useState("");
  const [enabled, setEnabled] = useState<boolean | undefined>();
  const [setupSummary, setSetupSummary] = useState<AdminAuthSetupSummary | undefined>();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/session")
      .then((response) => response.json() as Promise<AdminAuthSetupSummary & { loginGuard?: { retryAfterSeconds: number } }>)
      .then((payload) => {
        if (!cancelled) {
          setEnabled(payload.enabled);
          setSetupSummary({
            enabled: payload.enabled,
            readyCount: payload.readyCount,
            totalCount: payload.totalCount,
            sessionSecretConfigured: payload.sessionSecretConfigured,
            steps: payload.steps
          });
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

  const setupGuidance = buildAdminAuthGuidance(
    setupSummary ?? {
      enabled: Boolean(enabled),
      sessionSecretConfigured: false,
      readyCount: 0,
      totalCount: 3
    }
  );
  const destinationLabel = describeAdminDestination(nextPath);

  function continueInDemoMode() {
    persistAdminAuditEntry({
      action: "auth-demo-access",
      label: "Admin demo access",
      detail: `Opened ${destinationLabel} while admin passcode protection is disabled in this environment.`
    });
    window.location.href = nextPath;
  }

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
        if (cooldownSeconds <= 0) {
          persistAdminAuditEntry({
            action: "auth-cooldown",
            label: "Admin login cooldown",
            detail: `Too many passcode attempts triggered a ${formatCooldown(retryAfterSeconds)} cooldown.`
          });
        }
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
    persistAdminAuditEntry({
      action: "auth-login",
      label: "Admin sign-in",
      detail: `Unlocked admin access and continued to ${destinationLabel}.`
    });
    window.location.href = nextPath;
  }

  if (enabled === false) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="space-y-4">
          <Badge className="bg-slate-100 text-slate-800">{setupGuidance.badgeLabel}</Badge>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin access</h1>
            <p className="mt-2 text-muted-foreground">
              {setupGuidance.detail}
            </p>
          </div>
          <SetupGuidancePanel
            guidance={setupGuidance}
            nextPath={nextPath}
            destinationLabel={destinationLabel}
            summary={setupSummary}
          />
          <button
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={continueInDemoMode}
            type="button"
          >
            Continue in local demo mode
          </button>
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
          <Badge>{setupGuidance.badgeLabel}</Badge>
        </div>
        <div className="grid gap-3 rounded-lg border border-border bg-muted/35 p-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold">{setupGuidance.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {setupGuidance.detail}
              </p>
            </div>
            <div className="grid gap-2">
              {setupSummary?.steps.map((step) => (
                <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-white px-3 py-2 text-sm" key={step.label}>
                  <div>
                    <div className="font-medium">{step.label}</div>
                    <div className="mt-1 text-muted-foreground">{step.detail}</div>
                  </div>
                  <Badge className={step.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                    {step.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-white p-3">
              <div className="text-sm font-semibold">After sign-in</div>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;ll continue to {destinationLabel}.
              </p>
            </div>
            <div className="rounded-md border border-border bg-white p-3">
              <div className="text-sm font-semibold">Env shape</div>
              <pre className="mt-2 overflow-x-auto rounded-md bg-slate-950 px-3 py-2 text-xs text-slate-100">
                <code>{setupGuidance.envTemplate.join("\n")}</code>
              </pre>
            </div>
          </div>
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

function SetupGuidancePanel({
  guidance,
  nextPath,
  destinationLabel,
  summary
}: {
  guidance: ReturnType<typeof buildAdminAuthGuidance>;
  nextPath: string;
  destinationLabel: string;
  summary?: AdminAuthSetupSummary;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-3 rounded-md border border-border bg-muted/35 p-4">
        <div>
          <div className="font-semibold">{guidance.title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{guidance.detail}</p>
        </div>
        <div className="space-y-2">
          {guidance.steps.map((step) => (
            <div className="rounded-md border border-border bg-white px-3 py-2 text-sm text-muted-foreground" key={step}>
              {step}
            </div>
          ))}
        </div>
        {summary ? (
          <div className="text-xs font-medium text-foreground">
            Setup checks ready: {summary.readyCount}/{summary.totalCount}
          </div>
        ) : null}
      </div>
      <div className="space-y-3 rounded-md border border-border bg-white p-4">
        <div>
          <div className="font-semibold">Env shape</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Add these keys to `.env.local`, then restart the server.
          </p>
        </div>
        <pre className="overflow-x-auto rounded-md bg-slate-950 px-3 py-2 text-xs text-slate-100">
          <code>{guidance.envTemplate.join("\n")}</code>
        </pre>
        <div className="rounded-md border border-border bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
          Current destination after setup: {destinationLabel} (`{nextPath}`)
        </div>
      </div>
    </div>
  );
}

function describeAdminDestination(path: string) {
  if (path === "/admin/participants") return "the participant directory";
  if (path === "/admin/matching") return "match setup";
  if (path === "/admin/teams") return "team review";
  if (path === "/admin/settings") return "settings";
  return "the organizer overview";
}

function formatCooldown(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}
