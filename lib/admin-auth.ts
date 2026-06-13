export const adminSessionCookieName = "hackmatch_admin_session";
export const adminLoginPath = "/admin/login";

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
  secret = passcode
}: {
  passcode: string;
  secret?: string;
}): Promise<string> {
  const payload = `${passcode.trim()}::${secret.trim()}`;
  const digest = await sha256(payload);
  return `hm-admin-${digest}`;
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
  env: AdminAuthEnv = process.env
): Promise<boolean> {
  const passcode = env.ADMIN_PASSCODE?.trim();
  if (!passcode) return true;
  if (!token) return false;
  const expected = await createAdminSessionToken({
    passcode,
    secret: env.ADMIN_SESSION_SECRET?.trim() || passcode
  });
  return timingSafeEqual(token, expected);
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
