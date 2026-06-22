"use client";

import React from "react";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { clipboardStatusMessage, copyTextToClipboard } from "@/lib/clipboard";

export function AdminEnvSetupCard({
  title = "Env shape",
  detail = "Add these keys to `.env.local`, then restart the server.",
  envLines,
  templates,
  copyLabel = "Copy env block"
}: {
  title?: string;
  detail?: string;
  envLines: string[];
  templates?: Array<{
    id: string;
    label: string;
    detail?: string;
    envLines: string[];
  }>;
  copyLabel?: string;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const [activeTemplateId, setActiveTemplateId] = useState(templates?.[0]?.id ?? "default");

  const activeTemplate = templates?.find((template) => template.id === activeTemplateId);
  const activeEnvLines = activeTemplate?.envLines ?? envLines;
  const activeDetail = activeTemplate?.detail ?? detail;

  async function copyEnvBlock() {
    const result = await copyTextToClipboard(activeEnvLines.join("\n"));
    setCopyStatus(clipboardStatusMessage(result, "Copied env block."));
  }

  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{activeDetail}</p>
        </div>
        <Button className="border border-border bg-white text-foreground hover:bg-muted" onClick={() => void copyEnvBlock()} type="button">
          {copyLabel}
        </Button>
      </div>
      {templates?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {templates.map((template) => (
            <button
              className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                template.id === activeTemplateId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground hover:bg-muted"
              }`}
              key={template.id}
              onClick={() => setActiveTemplateId(template.id)}
              type="button"
            >
              {template.label}
            </button>
          ))}
        </div>
      ) : null}
      <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 px-3 py-2 text-xs text-slate-100">
        <code>{activeEnvLines.join("\n")}</code>
      </pre>
      {copyStatus ? (
        <div className="mt-3">
          <Badge className="bg-sky-100 text-sky-800">{copyStatus}</Badge>
        </div>
      ) : null}
    </div>
  );
}
