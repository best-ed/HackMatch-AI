"use client";

import React from "react";
import { useMemo, useState } from "react";
import { Badge, Card, TextInput } from "@/components/ui";
import {
  evaluateAdminPasscodeQuality,
  evaluateAdminSessionSecretQuality
} from "@/lib/admin-auth";

export function AdminSecretStrengthPreview() {
  const [passcode, setPasscode] = useState("LaunchCode2026");
  const [sessionSecret, setSessionSecret] = useState("LaunchCode2026-Session-Secret-Strong");

  const preview = useMemo(() => {
    const passcodeQuality = evaluateAdminPasscodeQuality({
      ADMIN_PASSCODE: passcode
    });
    const sessionSecretQuality = evaluateAdminSessionSecretQuality({
      ADMIN_PASSCODE: passcode,
      ADMIN_SESSION_SECRET: sessionSecret
    });

    return {
      passcodeQuality,
      sessionSecretQuality
    };
  }, [passcode, sessionSecret]);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Secret strength preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Test candidate values before editing `.env.local`. This preview is browser-only and never stores what you type.
          </p>
        </div>
        <Badge className="bg-slate-100 text-slate-800">local preview</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          <span>Candidate admin passcode</span>
          <TextInput
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="Choose a private admin passcode"
            type="text"
            value={passcode}
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>Candidate session secret</span>
          <TextInput
            onChange={(event) => setSessionSecret(event.target.value)}
            placeholder="Choose a separate long signing secret"
            type="text"
            value={sessionSecret}
          />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <PreviewResult
          label="Passcode quality"
          status={preview.passcodeQuality.status}
          detail={preview.passcodeQuality.detail}
        />
        <PreviewResult
          label="Session secret quality"
          status={preview.sessionSecretQuality.status}
          detail={preview.sessionSecretQuality.detail}
        />
      </div>
    </Card>
  );
}

function PreviewResult({
  label,
  status,
  detail
}: {
  label: string;
  status: "ready" | "review";
  detail: string;
}) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">{label}</div>
        <Badge className={status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
          {status}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
