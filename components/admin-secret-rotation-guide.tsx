"use client";

import { Badge, Card } from "@/components/ui";

export function AdminSecretRotationGuide() {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Secret rotation and session reset</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When you rotate the admin passcode or session secret, treat it like a controlled access reset so old sessions do not linger.
          </p>
        </div>
        <Badge className="bg-amber-100 text-amber-800">operator flow</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <RotationPanel
          title="Recommended rotation order"
          items={[
            "Choose the new passcode and a separate new session secret.",
            "Update your env values locally or in the deployment provider.",
            "Restart the server so middleware and API routes read the new values.",
            "Open `/admin/login` again and sign in with the new passcode."
          ]}
        />
        <RotationPanel
          title="Why existing sessions reset"
          items={[
            "Session cookies are signed with the current passcode plus session secret.",
            "Changing either value invalidates old signatures on the server.",
            "Expired or invalid cookies are cleared automatically during protected admin access.",
            "That forces a fresh sign-in instead of silently trusting stale browser state."
          ]}
        />
      </div>
    </Card>
  );
}

function RotationPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="font-medium">{title}</div>
      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <div className="rounded-md border border-border bg-muted/35 px-3 py-2" key={item}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
