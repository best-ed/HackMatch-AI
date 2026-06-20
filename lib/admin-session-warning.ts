import type { AdminSessionSummary } from "@/lib/admin-auth";

const warningThresholdSeconds = 15 * 60;
const urgentThresholdSeconds = 5 * 60;

export type AdminSessionWarning = {
  label: string;
  detail: string;
};

export function buildAdminSessionWarning(
  session?: Pick<AdminSessionSummary, "status" | "remainingSeconds">
): AdminSessionWarning | undefined {
  if (session?.status !== "active" || typeof session.remainingSeconds !== "number") {
    return undefined;
  }

  if (session.remainingSeconds > warningThresholdSeconds) {
    return undefined;
  }

  const remaining = formatRemaining(session.remainingSeconds);

  if (session.remainingSeconds <= urgentThresholdSeconds) {
    return {
      label: "Session ending very soon",
      detail: `Your admin session has about ${remaining} left. Finish critical changes or re-open admin login before a long review flow.`
    };
  }

  return {
    label: "Session ending soon",
    detail: `Your admin session has about ${remaining} left. Save work soon or re-enter the admin passcode before continuing a longer workflow.`
  };
}

function formatRemaining(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}
