export const adminSessionCookieName = "hackmatch_admin_session";
export const adminLoginPath = "/admin/login";
const adminSessionTokenPrefix = "hm-admin-v2";

const sessionDurationSeconds = 60 * 60 * 8;

type AdminAuthEnv = {
  [key: string]: string | undefined;
  ADMIN_PASSCODE?: string;
  ADMIN_SESSION_SECRET?: string;
};

export type AdminSecretQuality = {
  detail: string;
  label: string;
  status: "ready" | "review";
};

export type AdminAuthSetupStep = {
  label: string;
  status: "ready" | "review";
  detail: string;
};

export type AdminAuthSetupSummary = {
  enabled: boolean;
  sessionSecretConfigured: boolean;
  readyCount: number;
  totalCount: number;
  steps: AdminAuthSetupStep[];
};

export type AdminAuthGuidance = {
  mode: "disabled" | "review" | "ready";
  badgeLabel: string;
  title: string;
  detail: string;
  steps: string[];
  envTemplate: string[];
};

export type AdminSessionSummary = {
  authenticated: boolean;
  detail: string;
  expiresAt?: string;
  remainingSeconds?: number;
  status: "not-required" | "active" | "missing" | "expired" | "invalid";
};

export function isAdminAuthConfigured(env: AdminAuthEnv = process.env): boolean {
  return Boolean(env.ADMIN_PASSCODE?.trim());
}

export function summarizeAdminAuthSetup(env: AdminAuthEnv = process.env): AdminAuthSetupSummary {
  const enabled = isAdminAuthConfigured(env);
  const passcodeQuality = evaluateAdminPasscodeQuality(env);
  const sessionSecretQuality = evaluateAdminSessionSecretQuality(env);
  const sessionSecretConfigured = sessionSecretQuality.configured;
  const steps: AdminAuthSetupStep[] = [
    {
      label: "Admin passcode",
      status: passcodeQuality.status,
      detail: passcodeQuality.detail
    },
    {
      label: "Session secret",
      status: sessionSecretQuality.status,
      detail: sessionSecretQuality.detail
    },
    {
      label: "Server restart",
      status: passcodeQuality.status === "ready" && sessionSecretQuality.status === "ready" ? "ready" : "review",
      detail: passcodeQuality.status === "ready" && sessionSecretQuality.status === "ready"
        ? "Restart completed after env setup or the server is already reading the configured values."
        : "Restart the dev or production server after editing .env.local."
    }
  ];

  return {
    enabled,
    sessionSecretConfigured,
    readyCount: steps.filter((step) => step.status === "ready").length,
    totalCount: steps.length,
    steps
  };
}

export function buildAdminAuthGuidance(summary: Pick<AdminAuthSetupSummary, "enabled" | "readyCount" | "totalCount" | "sessionSecretConfigured">): AdminAuthGuidance {
  if (!summary.enabled) {
    return {
      mode: "disabled",
      badgeLabel: "Auth disabled",
      title: "Admin passcode protection is off in this environment.",
      detail: "The MVP stays open for local demo testing until you add admin auth env vars. Turn protection on before sharing a deployed admin URL.",
      steps: [
        "Set ADMIN_PASSCODE to a private organizer passcode with at least 12 characters.",
        "Set ADMIN_SESSION_SECRET to a different private value with at least 24 characters.",
        "Restart the dev or production server, then reopen /admin/login to confirm protection is active."
      ],
      envTemplate: [
        "ADMIN_PASSCODE=choose_a_private_admin_passcode",
        "ADMIN_SESSION_SECRET=choose_a_long_random_session_secret"
      ]
    };
  }

  if (summary.readyCount < summary.totalCount) {
    return {
      mode: "review",
      badgeLabel: "Setup review",
      title: "Admin protection is on, but the setup still needs one more pass.",
      detail: summary.sessionSecretConfigured
        ? `Auth is enabled, but only ${summary.readyCount}/${summary.totalCount} setup checks are ready.`
        : "Auth is enabled, but the session secret is still missing or relying on the passcode fallback.",
      steps: [
        "Keep ADMIN_PASSCODE configured for organizer login.",
        "Set a separate ADMIN_SESSION_SECRET so the session cookie is signed with its own secret.",
        "Restart the server after updating env values so login and middleware read the latest configuration."
      ],
      envTemplate: [
        "ADMIN_PASSCODE=your_existing_or_updated_passcode",
        "ADMIN_SESSION_SECRET=add_a_separate_long_random_session_secret"
      ]
    };
  }

  return {
    mode: "ready",
    badgeLabel: "Protection ready",
    title: "Admin protection is configured and ready for organizer sign-in.",
    detail: "Use the admin passcode below to unlock protected organizer routes. Keep env values outside source control and restart the server any time you change them.",
    steps: [
      "Share only the admin URL, never the passcode in the same message.",
      "If the passcode or secret changes, restart the server before testing login again.",
      "Use a real auth provider later for production launches; this passcode gate is the MVP boundary."
    ],
    envTemplate: [
      "ADMIN_PASSCODE=already_configured",
      "ADMIN_SESSION_SECRET=already_configured"
    ]
  };
}

export function adminSessionMaxAgeSeconds() {
  return sessionDurationSeconds;
}

export async function createAdminSessionToken({
  passcode,
  secret = passcode,
  issuedAt = Date.now(),
  maxAgeSeconds = adminSessionMaxAgeSeconds()
}: {
  passcode: string;
  secret?: string;
  issuedAt?: number | Date;
  maxAgeSeconds?: number;
}): Promise<string> {
  const issuedAtMs = resolveTimestamp(issuedAt);
  const expiresAtMs = issuedAtMs + maxAgeSeconds * 1000;
  const payload = `${adminSessionTokenPrefix}::${issuedAtMs}::${expiresAtMs}::${passcode.trim()}::${secret.trim()}`;
  const digest = await sha256(payload);
  return `${adminSessionTokenPrefix}.${issuedAtMs}.${expiresAtMs}.${digest}`;
}

export async function verifyAdminPasscode(
  candidate: string,
  env: AdminAuthEnv = process.env
): Promise<boolean> {
  const passcode = env.ADMIN_PASSCODE?.trim();
  if (!passcode) return true;
  return timingSafeEqual(candidate.trim(), passcode);
}

export async function verifyAdminSessionToken(
  token: string | undefined,
  env: AdminAuthEnv = process.env,
  now: number | Date = Date.now()
): Promise<boolean> {
  const passcode = env.ADMIN_PASSCODE?.trim();
  if (!passcode) return true;
  if (!token) return false;

  const parsed = parseAdminSessionToken(token);
  if (!parsed) return false;

  if (resolveTimestamp(now) > parsed.expiresAtMs) {
    return false;
  }

  const expected = await createAdminSessionToken({
    passcode,
    secret: env.ADMIN_SESSION_SECRET?.trim() || passcode,
    issuedAt: parsed.issuedAtMs,
    maxAgeSeconds: Math.max(0, Math.floor((parsed.expiresAtMs - parsed.issuedAtMs) / 1000))
  });
  return timingSafeEqual(token, expected);
}

export async function summarizeAdminSession(
  token: string | undefined,
  env: AdminAuthEnv = process.env,
  now: number | Date = Date.now()
): Promise<AdminSessionSummary> {
  const passcode = env.ADMIN_PASSCODE?.trim();
  if (!passcode) {
    return {
      authenticated: true,
      detail: "Admin auth is disabled in this environment, so no session cookie is required.",
      status: "not-required"
    };
  }

  if (!token) {
    return {
      authenticated: false,
      detail: "No admin session cookie is present. Sign in to access protected organizer routes.",
      status: "missing"
    };
  }

  const parsed = parseAdminSessionToken(token);
  if (!parsed) {
    return {
      authenticated: false,
      detail: "The admin session cookie format is invalid. Sign in again to refresh it.",
      status: "invalid"
    };
  }

  const currentTime = resolveTimestamp(now);
  if (currentTime > parsed.expiresAtMs) {
    return {
      authenticated: false,
      detail: "The admin session cookie has expired. Sign in again to restore protected access.",
      expiresAt: new Date(parsed.expiresAtMs).toISOString(),
      remainingSeconds: 0,
      status: "expired"
    };
  }

  const expected = await createAdminSessionToken({
    passcode,
    secret: env.ADMIN_SESSION_SECRET?.trim() || passcode,
    issuedAt: parsed.issuedAtMs,
    maxAgeSeconds: Math.max(0, Math.floor((parsed.expiresAtMs - parsed.issuedAtMs) / 1000))
  });

  if (!timingSafeEqual(token, expected)) {
    return {
      authenticated: false,
      detail: "The admin session cookie failed signature verification. Sign in again to replace it.",
      expiresAt: new Date(parsed.expiresAtMs).toISOString(),
      status: "invalid"
    };
  }

  const remainingSeconds = Math.max(0, Math.ceil((parsed.expiresAtMs - currentTime) / 1000));
  return {
    authenticated: true,
    detail: `Admin session is active for about ${formatAdminSessionDuration(remainingSeconds)}.`,
    expiresAt: new Date(parsed.expiresAtMs).toISOString(),
    remainingSeconds,
    status: "active"
  };
}

export function evaluateAdminPasscodeQuality(env: AdminAuthEnv = process.env): AdminSecretQuality {
  const passcode = env.ADMIN_PASSCODE?.trim() ?? "";
  if (!passcode) {
    return {
      detail: "Set ADMIN_PASSCODE in .env.local before sharing an admin URL.",
      label: "missing",
      status: "review"
    };
  }

  if (passcode.length < 12) {
    return {
      detail: "ADMIN_PASSCODE is configured, but it should be at least 12 characters long.",
      label: "weak",
      status: "review"
    };
  }

  if (!/[A-Z]/.test(passcode) || !/[a-z]/.test(passcode) || !/\d/.test(passcode)) {
    return {
      detail: "ADMIN_PASSCODE should mix uppercase, lowercase, and numeric characters.",
      label: "weak",
      status: "review"
    };
  }

  return {
    detail: "ADMIN_PASSCODE is configured with a stronger baseline for shared admin access.",
    label: "strong",
    status: "ready"
  };
}

export function evaluateAdminSessionSecretQuality(env: AdminAuthEnv = process.env) {
  const sessionSecret = env.ADMIN_SESSION_SECRET?.trim() ?? "";
  const passcode = env.ADMIN_PASSCODE?.trim() ?? "";

  if (!sessionSecret) {
    return {
      configured: false,
      detail: "Set ADMIN_SESSION_SECRET to a long private value instead of relying on the passcode fallback.",
      label: "missing",
      status: "review" as const
    };
  }

  if (sessionSecret === passcode && passcode) {
    return {
      configured: true,
      detail: "ADMIN_SESSION_SECRET should not match ADMIN_PASSCODE.",
      label: "reused",
      status: "review" as const
    };
  }

  if (sessionSecret.length < 24) {
    return {
      configured: true,
      detail: "ADMIN_SESSION_SECRET is configured, but it should be at least 24 characters long.",
      label: "weak",
      status: "review" as const
    };
  }

  return {
    configured: true,
    detail: "ADMIN_SESSION_SECRET is configured with a stronger signing baseline.",
    label: "strong",
    status: "ready" as const
  };
}

function parseAdminSessionToken(token: string) {
  const [prefix, issuedAtRaw, expiresAtRaw, digest] = token.split(".");
  if (prefix !== adminSessionTokenPrefix || !issuedAtRaw || !expiresAtRaw || !digest) {
    return null;
  }

  const issuedAtMs = Number(issuedAtRaw);
  const expiresAtMs = Number(expiresAtRaw);
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs)) {
    return null;
  }
  if (issuedAtMs <= 0 || expiresAtMs <= issuedAtMs) {
    return null;
  }

  return {
    digest,
    expiresAtMs,
    issuedAtMs
  };
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function resolveTimestamp(value: number | Date) {
  return value instanceof Date ? value.getTime() : value;
}

function formatAdminSessionDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 60) {
    return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const leftoverMinutes = minutes % 60;
  return leftoverMinutes > 0 ? `${hours}h ${leftoverMinutes}m` : `${hours}h`;
}
