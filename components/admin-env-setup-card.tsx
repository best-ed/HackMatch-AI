"use client";

import React from "react";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { clipboardStatusMessage, copyTextToClipboard } from "@/lib/clipboard";

export function AdminEnvSetupCard({
  title = "Env shape",
  detail = "Add these keys to `.env.local`, then restart the server.",
  envLines,
  copyLabel = "Copy env block"
}: {
  title?: string;
  detail?: string;
  envLines: string[];
  copyLabel?: string;
}) {
  const [copyStatus, setCopyStatus] = useState("");

  async function copyEnvBlock() {
    const result = await copyTextToClipboard(envLines.join("\n"));
    setCopyStatus(clipboardStatusMessage(result, "Copied env block."));
  }

  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
        <Button className="border border-border bg-white text-foreground hover:bg-muted" onClick={() => void copyEnvBlock()} type="button">
          {copyLabel}
        </Button>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 px-3 py-2 text-xs text-slate-100">
        <code>{envLines.join("\n")}</code>
      </pre>
      {copyStatus ? (
        <div className="mt-3">
          <Badge className="bg-sky-100 text-sky-800">{copyStatus}</Badge>
        </div>
      ) : null}
    </div>
  );
}
