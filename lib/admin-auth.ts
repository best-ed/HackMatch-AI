export const adminSessionCookieName = "hackmatch_admin_session";
export const adminLoginPath = "/admin/login";
const adminSessionTokenPrefix = "hm-admin-v2";

const sessionDurationSeconds = 60 * 60 * 8;

type AdminAuthEnv = {
  [key: string]: string | undefined;
  ADMIN_PASSCODE?: string;
  ADMIN_SESSION_SECRET?: string;
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
  const sessionSecretConfigured = Boolean(env.ADMIN_SESSION_SECRET?.trim());
  const steps: AdminAuthSetupStep[] = [
    {
      label: "Admin passcode",
      status: enabled ? "ready" : "review",
      detail: enabled
        ? "ADMIN_PASSCODE is configured, so admin routes can require login."
        : "Set ADMIN_PASSCODE in .env.local before sharing an admin URL."
    },
    {
      label: "Session secret",
      status: sessionSecretConfigured ? "ready" : "review",
      detail: sessionSecretConfigured
        ? "ADMIN_SESSION_SECRET is configured for session token signing."
        : "Set ADMIN_SESSION_SECRET to a long private value instead of relying on the passcode fallback."
    },
    {
      label: "Server restart",
      status: enabled && sessionSecretConfigured ? "ready" : "review",
      detail: enabled && sessionSecretConfigured
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
