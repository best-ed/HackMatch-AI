import type { AdminAuthSetupSummary, AdminSessionSummary } from "@/lib/admin-auth";
import type { AdminRuntimeSignals } from "@/lib/admin-runtime-signals";

export type AdminAuthSmokeChecklistItem = {
  label: string;
  status: "ready" | "review";
  detail: string;
};

export type AdminAuthSmokeChecklist = {
  status: "ready" | "review";
  title: string;
  detail: string;
  readyCount: number;
  totalCount: number;
  items: AdminAuthSmokeChecklistItem[];
};

export function buildAdminAuthSmokeChecklist({
  nextPath = "/admin",
  setupSummary,
  session,
  loginGuardRetryAfterSeconds = 0,
  runtimeSignals,
  runtimeReachable = Boolean(runtimeSignals)
}: {
  nextPath?: string;
  setupSummary?: Pick<AdminAuthSetupSummary, "enabled" | "readyCount" | "totalCount" | "sessionSecretConfigured">;
  session?: AdminSessionSummary;
  loginGuardRetryAfterSeconds?: number;
  runtimeSignals?: AdminRuntimeSignals;
  runtimeReachable?: boolean;
}): AdminAuthSmokeChecklist {
  const enabled = Boolean(setupSummary?.enabled);
  const setupReady = Boolean(setupSummary && setupSummary.readyCount === setupSummary.totalCount && setupSummary.totalCount > 0);
  const sessionReady = session?.status === "active" || session?.status === "not-required";
  const protectedApiReady = !enabled
    ? true
    : Boolean(runtimeSignals?.adminProtectionConfigured && session?.authenticated);

  const items: AdminAuthSmokeChecklistItem[] = [
    {
      label: "Login route",
      status: "ready",
      detail: enabled
        ? "Use /admin/login to confirm the organizer passcode gate appears before protected admin pages."
        : "Use /admin/login to confirm local demo mode is clearly labeled while protection stays disabled."
    },
    {
      label: "Redirect target",
      status: nextPath.startsWith("/admin") ? "ready" : "review",
      detail: nextPath.startsWith("/admin")
        ? `After sign-in, the sanitized destination should continue to ${nextPath}.`
        : "Confirm the requested admin destination resolves back to a safe /admin path."
    },
    {
      label: "Session and cooldown",
      status: loginGuardRetryAfterSeconds > 0 || !sessionReady ? "review" : "ready",
      detail: loginGuardRetryAfterSeconds > 0
        ? `Login cooldown is active for about ${formatDuration(loginGuardRetryAfterSeconds)}. Wait for the guard to clear before retrying.`
        : session
          ? session.detail
          : "Session endpoint has not responded yet, so cookie health is still unconfirmed."
    },
    {
      label: "Protected APIs",
      status: protectedApiReady || !enabled ? "ready" : "review",
      detail: !enabled
        ? "Admin APIs are open in local demo mode; turn protection on before sharing a deployed admin URL."
        : runtimeReachable
          ? protectedApiReady
            ? "Protected admin APIs should accept the current session and reject unauthenticated requests."
            : "Admin APIs are protected, but confirm a valid session is active before relying on organizer-only routes."
          : "Protected API posture is confirmed after sign-in when runtime diagnostics become reachable."
    }
  ];

  const readyCount = items.filter((item) => item.status === "ready").length;
  const totalCount = items.length;
  const status = readyCount === totalCount ? "ready" : "review";

  return {
    status,
    title: status === "ready" ? "Auth smoke checklist is ready" : "Auth smoke checklist needs review",
    detail: status === "ready"
      ? "Login, redirect, session, and protected-route posture are aligned for a quick organizer auth rehearsal."
      : "One or more organizer auth checks still need a quick rehearsal before you trust this environment.",
    readyCount,
    totalCount,
    items
  };
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}
