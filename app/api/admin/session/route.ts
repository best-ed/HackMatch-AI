import { NextRequest, NextResponse } from "next/server";
import {
  adminLoginAttemptKey,
  clearAdminLoginGuard,
  describeAdminLoginGuard,
  recordFailedAdminLogin
} from "@/lib/admin-login-guard";
import {
  adminSessionCookieName,
  adminSessionCookieClearOptions,
  adminSessionCookieOptions,
  adminSessionMaxAgeSeconds,
  createAdminSessionToken,
  isAdminAuthConfigured,
  summarizeAdminSession,
  summarizeAdminAuthSetup,
  verifyAdminPasscode
} from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      ...summarizeAdminAuthSetup(),
      loginGuard: describeAdminLoginGuard(attemptKeyForRequest(request)),
      session: await summarizeAdminSession(request.cookies.get(adminSessionCookieName)?.value)
    },
    {
      headers: {
        "cache-control": "no-store"
      }
    }
  );
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { ok: true, enabled: false },
      {
        headers: {
          "cache-control": "no-store"
        }
      }
    );
  }

  const attemptKey = attemptKeyForRequest(request);
  const loginGuard = describeAdminLoginGuard(attemptKey);
  if (loginGuard.blocked) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many admin login attempts.",
        retryAfterSeconds: loginGuard.retryAfterSeconds
      },
      {
        status: 429,
        headers: {
          "cache-control": "no-store",
          "retry-after": String(loginGuard.retryAfterSeconds)
        }
      }
    );
  }

  const body = await request.json().catch(() => ({})) as { passcode?: string };
  const passcode = body.passcode ?? "";
  const valid = await verifyAdminPasscode(passcode);

  if (!valid) {
    const failedGuard = recordFailedAdminLogin(attemptKey);
    const status = failedGuard.blocked ? 429 : 401;
    return NextResponse.json(
      {
        ok: false,
        error: failedGuard.blocked ? "Too many admin login attempts." : "Invalid admin passcode.",
        remainingAttempts: failedGuard.remainingAttempts,
        retryAfterSeconds: failedGuard.retryAfterSeconds
      },
      {
        status,
        headers: {
          "cache-control": "no-store",
          ...(failedGuard.retryAfterSeconds > 0
            ? { "retry-after": String(failedGuard.retryAfterSeconds) }
            : {})
        }
      }
    );
  }

  clearAdminLoginGuard(attemptKey);
  const configuredPasscode = process.env.ADMIN_PASSCODE?.trim() ?? "";
  const token = await createAdminSessionToken({
    passcode: configuredPasscode,
    secret: process.env.ADMIN_SESSION_SECRET?.trim() || configuredPasscode
  });
  const response = NextResponse.json({ ok: true, enabled: true });
  response.headers.set("cache-control", "no-store");
  response.cookies.set(adminSessionCookieName, token, adminSessionCookieOptions(adminSessionMaxAgeSeconds()));
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("cache-control", "no-store");
  response.cookies.set(adminSessionCookieName, "", adminSessionCookieClearOptions());
  return response;
}

function attemptKeyForRequest(request: NextRequest) {
  return adminLoginAttemptKey({
    forwardedFor: request.headers.get("x-forwarded-for"),
    realIp: request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent")
  });
}
