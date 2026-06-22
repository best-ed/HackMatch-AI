"use client";

import React from "react";
import { Badge, Card } from "@/components/ui";
import type { AdminAuthSetupSummary } from "@/lib/admin-auth";

export function AdminSetupHub({
  destinationLabel,
  nextPath,
  summary
}: {
  destinationLabel: string;
  nextPath: string;
  summary?: AdminAuthSetupSummary;
}) {
  const readyCount = summary?.readyCount ?? 0;
  const totalCount = summary?.totalCount ?? 3;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Admin setup hub</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One place to understand protection status, current destination, and the next setup move before organizers continue.
          </p>
        </div>
        <Badge className={readyCount === totalCount ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
          {readyCount}/{totalCount} ready
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <HubPanel
          title="Protection status"
          detail={
            summary?.enabled
              ? "Admin passcode protection is turned on for this environment."
              : "Admin protection is still disabled, so organizers are in local demo mode."
          }
          badge={summary?.enabled ? "enabled" : "demo"}
          badgeClassName={summary?.enabled ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}
        />
        <HubPanel
          title="After sign-in"
          detail={`Successful access continues to ${destinationLabel}.`}
          badge={nextPath}
          badgeClassName="bg-slate-100 text-slate-800"
        />
        <HubPanel
          title="Best next move"
          detail={
            readyCount === totalCount
              ? "Verify the passcode, unlock admin, and continue into the organizer workspace."
              : "Review setup checks first, then copy the right env template and restart the server."
          }
          badge={readyCount === totalCount ? "ready to unlock" : "needs setup review"}
          badgeClassName={readyCount === totalCount ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}
        />
      </div>
    </Card>
  );
}

function HubPanel({
  title,
  detail,
  badge,
  badgeClassName
}: {
  title: string;
  detail: string;
  badge: string;
  badgeClassName: string;
}) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="font-medium">{title}</div>
        <Badge className={badgeClassName}>{badge}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
