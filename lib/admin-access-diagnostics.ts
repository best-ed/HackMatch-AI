import {
  buildAdminAuthSurfaceSummary,
  type AdminAuthSetupSummary,
  type AdminSessionSummary
} from "@/lib/admin-auth";
import type { AdminRuntimeSignals } from "@/lib/admin-runtime-signals";

export type AdminAccessDiagnosticsItem = {
  label: string;
  status: "ready" | "review";
  detail: string;
};

export type AdminAccessDiagnostics = {
  status: "ready" | "review";
  title: string;
  detail: string;
  items: AdminAccessDiagnosticsItem[];
};

export function buildAdminAccessDiagnostics({
  setupSummary,
  session,
  runtimeSignals,
  runtimeReachable = Boolean(runtimeSignals),
  sessionReachable = Boolean(setupSummary)
}: {
  setupSummary?: AdminAuthSetupSummary;
  session?: AdminSessionSummary;
  runtimeSignals?: AdminRuntimeSignals;
  runtimeReachable?: boolean;
  sessionReachable?: boolean;
}): AdminAccessDiagnostics {
  const setup = setupSummary ?? {
    enabled: false,
    sessionSecretConfigured: false,
    readyCount: 0,
    totalCount: 3,
    steps: []
  };
  const surface = buildAdminAuthSurfaceSummary({
    enabled: setup.enabled,
    readyCount: setup.readyCount,
    totalCount: setup.totalCount,
    session
  });

  const items: AdminAccessDiagnosticsItem[] = [
    {
      label: "Access mode",
      status: surface.mode === "protected" ? "ready" : "review",
      detail: `${surface.modeLabel}: ${surface.detail}`
    },
    {
      label: "Setup checks",
      status: setup.readyCount === setup.totalCount && setup.totalCount > 0 ? "ready" : "review",
      detail: sessionReachable
        ? `${setup.readyCount}/${setup.totalCount} sanitized admin setup checks are ready from the session endpoint.`
        : "The session endpoint did not respond, so setup state could not be confirmed live."
    },
    {
      label: "Session state",
      status: session?.authenticated || session?.status === "not-required" ? "ready" : "review",
      detail: session
        ? session.detail
        : "Current admin session state has not been confirmed yet."
    },
    {
      label: "Server runtime",
      status: runtimeSignals?.adminProtectionConfigured || runtimeSignals?.authMode === "disabled" ? "ready" : "review",
      detail: runtimeReachable
        ? describeRuntimeSignals(runtimeSignals)
        : setup.enabled
          ? "Protected runtime signals become available after admin sign-in."
          : "Runtime signal fetch is not required while admin protection is disabled."
    }
  ];

  const status = items.every((item) => item.status === "ready") ? "ready" : "review";

  return {
    status,
    title: status === "ready" ? "Admin access diagnostics look healthy" : "Admin access diagnostics need review",
    detail: status === "ready"
      ? "Protected routes, session state, and runtime confirmation are aligned for this environment."
      : "One or more admin access checks need attention before the environment is ready for dependable organizer use.",
    items
  };
}

function describeRuntimeSignals(runtimeSignals?: AdminRuntimeSignals) {
  if (!runtimeSignals) {
    return "Runtime signal data is not available yet.";
  }

  if (runtimeSignals.authMode === "disabled") {
    return runtimeSignals.hasOpenAiKey
      ? "Server runtime is in demo mode and an OpenAI key is present for optional explanations."
      : "Server runtime is in demo mode and deterministic fallback explanations remain active.";
  }

  const authReadiness = `${runtimeSignals.authReadyCount}/${runtimeSignals.authTotalCount} auth checks`;
  const secretDetail = runtimeSignals.hasAdminSessionSecret
    ? "a separate session secret is configured"
    : "the session secret still needs review";
  const explanationDetail = runtimeSignals.hasOpenAiKey
    ? "OpenAI explanations are available"
    : "fallback explanations are active";

  return `Server runtime sees ${authReadiness}, ${secretDetail}, and ${explanationDetail}.`;
}
