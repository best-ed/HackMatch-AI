import {
  buildAdminAuthSurfaceSummary,
  type AdminAuthSetupSummary,
  type AdminSessionSummary
} from "@/lib/admin-auth";
import type { AdminLoginGuardState } from "@/lib/admin-login-guard";

export type AdminSecurityPostureTone = "ready" | "review" | "blocked" | "info";

export type AdminSecurityPostureChip = {
  label: string;
  tone: AdminSecurityPostureTone;
};

export type AdminSecurityPostureNotice = {
  label: string;
  detail: string;
  tone: Exclude<AdminSecurityPostureTone, "info">;
};

export type AdminSecurityPosture = {
  title: string;
  detail: string;
  tone: "demo" | "review" | "protected";
  chips: AdminSecurityPostureChip[];
  notice?: AdminSecurityPostureNotice;
};

export function buildAdminSecurityPosture({
  enabled,
  readyCount,
  totalCount,
  session,
  loginGuard
}: Pick<AdminAuthSetupSummary, "enabled" | "readyCount" | "totalCount"> & {
  session?: Pick<AdminSessionSummary, "authenticated" | "detail" | "status" | "remainingSeconds">;
  loginGuard?: Pick<AdminLoginGuardState, "blocked" | "remainingAttempts" | "retryAfterSeconds">;
}): AdminSecurityPosture {
  const surface = buildAdminAuthSurfaceSummary({ enabled, readyCount, totalCount, session });
  const chips: AdminSecurityPostureChip[] = [
    {
      label: surface.modeLabel,
      tone: surface.mode === "protected" ? "ready" : surface.mode === "review" ? "review" : "info"
    },
    {
      label: sessionChipLabel(session),
      tone: sessionChipTone(session)
    },
    {
      label: `${readyCount}/${totalCount} setup ready`,
      tone: readyCount === totalCount ? "ready" : "review"
    }
  ];

  if (loginGuard?.blocked) {
    chips.push({
      label: `Login retry in ${loginGuard.retryAfterSeconds}s`,
      tone: "blocked"
    });
  } else if (enabled && loginGuard) {
    chips.push({
      label: `${loginGuard.remainingAttempts} login attempt${loginGuard.remainingAttempts === 1 ? "" : "s"} left`,
      tone: loginGuard.remainingAttempts <= 1 ? "review" : "info"
    });
  }

  return {
    title: titleForMode(surface.mode),
    detail: detailForMode(surface.detail, loginGuard),
    tone: surface.mode,
    chips,
    notice: buildNotice({ enabled, session, loginGuard })
  };
}

function titleForMode(mode: ReturnType<typeof buildAdminAuthSurfaceSummary>["mode"]) {
  switch (mode) {
    case "protected":
      return "Protected organizer workspace";
    case "review":
      return "Organizer protection needs attention";
    case "demo":
      return "Demo organizer access is open";
  }
}

function detailForMode(
  surfaceDetail: string,
  loginGuard?: Pick<AdminLoginGuardState, "blocked">
) {
  if (loginGuard?.blocked) {
    return `${surfaceDetail} New sign-in attempts from this browser are temporarily paused.`;
  }

  return surfaceDetail;
}

function buildNotice({
  enabled,
  session,
  loginGuard
}: {
  enabled: boolean;
  session?: Pick<AdminSessionSummary, "authenticated" | "detail" | "status" | "remainingSeconds">;
  loginGuard?: Pick<AdminLoginGuardState, "blocked" | "retryAfterSeconds">;
}): AdminSecurityPostureNotice | undefined {
  if (loginGuard?.blocked) {
    return {
      label: "Login cooldown active",
      detail: `Too many sign-in attempts were blocked for this browser. Wait about ${loginGuard.retryAfterSeconds}s before trying again. Existing authenticated sessions can keep working.`,
      tone: "blocked"
    };
  }

  if (!enabled) {
    return {
      label: "Protection is still optional here",
      detail: "This browser session can reach admin routes without a passcode because admin auth is disabled in the current environment.",
      tone: "review"
    };
  }

  if (session?.authenticated && typeof session.remainingSeconds === "number" && session.remainingSeconds <= 15 * 60) {
    return {
      label: "Session is nearing expiry",
      detail: session.detail,
      tone: "review"
    };
  }

  if (session && !session.authenticated && session.status !== "not-required") {
    return {
      label: "Protected admin routes need sign-in",
      detail: session.detail,
      tone: "review"
    };
  }

  return undefined;
}

function sessionChipLabel(
  session?: Pick<AdminSessionSummary, "authenticated" | "status">
) {
  switch (session?.status) {
    case "active":
      return "Session active";
    case "expired":
      return "Session expired";
    case "invalid":
      return "Session invalid";
    case "missing":
      return "No session";
    case "not-required":
      return "No session needed";
    default:
      return "Checking session";
  }
}

function sessionChipTone(
  session?: Pick<AdminSessionSummary, "authenticated" | "status">
): AdminSecurityPostureTone {
  switch (session?.status) {
    case "active":
    case "not-required":
      return "ready";
    case "expired":
    case "invalid":
      return "blocked";
    case "missing":
      return "review";
    default:
      return "info";
  }
}
