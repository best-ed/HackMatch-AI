export const adminSessionCookieName = "hackmatch_admin_session";
export const adminLoginPath = "/admin/login";

const sessionDurationSeconds = 60 * 60 * 8;

type AdminAuthEnv = {
  [key: string]: string | undefined;
  ADMIN_PASSCODE?: string;
  ADMIN_SESSION_SECRET?: string;
};

export function isAdminAuthConfigured(env: AdminAuthEnv = process.env): boolean {
  return Boolean(env.ADMIN_PASSCODE?.trim());
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
