import { NextResponse } from "next/server";
import {
  adminSessionCookieName,
  adminSessionMaxAgeSeconds,
  createAdminSessionToken,
  isAdminAuthConfigured,
  summarizeAdminAuthSetup,
  verifyAdminPasscode
} from "@/lib/admin-auth";

export async function GET() {
  return NextResponse.json(summarizeAdminAuthSetup());
}

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ ok: true, enabled: false });
  }

  const body = await request.json().catch(() => ({})) as { passcode?: string };
  const passcode = body.passcode ?? "";
  const valid = await verifyAdminPasscode(passcode);

  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid admin passcode." },
      { status: 401 }
    );
  }

  const configuredPasscode = process.env.ADMIN_PASSCODE?.trim() ?? "";
  const token = await createAdminSessionToken({
    passcode: configuredPasscode,
    secret: process.env.ADMIN_SESSION_SECRET?.trim() || configuredPasscode
  });
  const response = NextResponse.json({ ok: true, enabled: true });
  response.cookies.set(adminSessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: adminSessionMaxAgeSeconds(),
    path: "/"
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminSessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
  return response;
}
