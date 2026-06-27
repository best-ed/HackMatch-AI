export type SupabaseEnvSummary = {
  status: "local" | "ready" | "review";
  title: string;
  detail: string;
  checks: Array<{
    label: string;
    value: string;
    status: "ready" | "review";
  }>;
};

export function buildSupabaseEnvSummary({
  url,
  anonKey
}: {
  url?: string;
  anonKey?: string;
}): SupabaseEnvSummary {
  const trimmedUrl = url?.trim() ?? "";
  const trimmedKey = anonKey?.trim() ?? "";
  const parsed = parseSupabaseUrl(trimmedUrl);
  const keyShape = describeKeyShape(trimmedKey);

  if (!trimmedUrl && !trimmedKey) {
    return {
      status: "local",
      title: "Supabase env is not attached yet",
      detail: "This workspace is still in browser-local rehearsal mode until public Supabase env vars are added.",
      checks: [
        { label: "Project host", value: "Not configured", status: "review" },
        { label: "Project ref", value: "Not configured", status: "review" },
        { label: "Anon key shape", value: "Missing", status: "review" }
      ]
    };
  }

  const allReady = Boolean(parsed.host) && Boolean(parsed.projectRef) && keyShape.status === "ready";

  return {
    status: allReady ? "ready" : "review",
    title: allReady ? "Supabase env summary looks healthy" : "Supabase env summary needs review",
    detail: allReady
      ? "The attached public URL and anon key look consistent enough for a first remote persistence rehearsal."
      : "One or more public Supabase env values still look incomplete or malformed for a reliable remote test.",
    checks: [
      {
        label: "Project host",
        value: parsed.host ?? "Could not parse",
        status: parsed.host ? "ready" : "review"
      },
      {
        label: "Project ref",
        value: parsed.projectRef ?? "Could not parse",
        status: parsed.projectRef ? "ready" : "review"
      },
      {
        label: "Anon key shape",
        value: keyShape.label,
        status: keyShape.status
      }
    ]
  };
}

function parseSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    const projectRef = url.hostname.split(".")[0] || undefined;

    return {
      host: url.hostname,
      projectRef
    };
  } catch {
    return {
      host: undefined,
      projectRef: undefined
    };
  }
}

function describeKeyShape(value: string) {
  if (!value) {
    return { label: "Missing", status: "review" as const };
  }

  const segments = value.split(".").length;
  if (segments === 3 && value.length > 40) {
    return { label: "JWT-shaped anon key", status: "ready" as const };
  }

  return { label: `Unexpected token shape (${segments} segments)`, status: "review" as const };
}
