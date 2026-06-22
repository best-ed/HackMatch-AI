"use client";

import { Badge, Card } from "@/components/ui";
import type { AdminAuthSetupSummary } from "@/lib/admin-auth";

export function AdminLoginTroubleshooting({
  cooldownSeconds,
  enabled,
  nextPath,
  status,
  summary
}: {
  cooldownSeconds: number;
  enabled?: boolean;
  nextPath: string;
  status: string;
  summary?: AdminAuthSetupSummary;
}) {
  const items = buildTroubleshootingItems({
    cooldownSeconds,
    enabled,
    nextPath,
    status,
    summary
  });

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Login troubleshooting</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            If organizer access does not behave as expected, start with the most likely cause below.
          </p>
        </div>
        <Badge className="bg-slate-100 text-slate-800">{items.length} checks</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div className="rounded-md border border-border bg-white p-4" key={item.label}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{item.label}</div>
              <Badge className={item.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                {item.status}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function buildTroubleshootingItems({
  cooldownSeconds,
  enabled,
  nextPath,
  status,
  summary
}: {
  cooldownSeconds: number;
  enabled?: boolean;
  nextPath: string;
  status: string;
  summary?: AdminAuthSetupSummary;
}) {
  return [
    {
      label: "Auth mode",
      status: enabled === false ? "review" : "ready",
      detail:
        enabled === false
          ? "Admin protection is disabled, so `/admin/login` is informational and the workspace stays open in demo mode."
          : "Admin protection is enabled or still being confirmed from the session endpoint."
    },
    {
      label: "Cooldown window",
      status: cooldownSeconds > 0 ? "review" : "ready",
      detail:
        cooldownSeconds > 0
          ? `Login retries are paused for about ${formatCooldown(cooldownSeconds)} after repeated failed attempts.`
          : "No login cooldown is active for this browser right now."
    },
    {
      label: "Server restart",
      status: summary && summary.readyCount < summary.totalCount ? "review" : "ready",
      detail:
        summary && summary.readyCount < summary.totalCount
          ? "At least one setup check still needs review. A server restart after env changes is a common missing step."
          : "Current setup checks do not point to a missing restart."
    },
    {
      label: "Destination path",
      status: nextPath.startsWith("/admin") ? "ready" : "review",
      detail: `Successful sign-in currently routes to ${nextPath}.`
    },
    {
      label: "Latest response",
      status: status ? "review" : "ready",
      detail: status || "No current login error is being shown."
    }
  ];
}

function formatCooldown(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}
