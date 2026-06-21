import { NextRequest, NextResponse } from "next/server";
import {
  adminSessionCookieName,
  adminSessionCookieClearOptions,
  isAdminAuthConfigured,
  summarizeAdminSession
} from "@/lib/admin-auth";

export async function requireAdminApiSession(request: NextRequest) {
  if (!isAdminAuthConfigured()) {
    return null;
  }

  const session = await summarizeAdminSession(
    request.cookies.get(adminSessionCookieName)?.value
  );

  if (session.authenticated) {
    return null;
  }

  const response = NextResponse.json(
    {
      ok: false,
      error: "Admin authentication required.",
      detail: session.detail,
      sessionStatus: session.status
    },
    {
      status: 401,
      headers: {
        "cache-control": "no-store"
      }
    }
  );

  if (session.status === "expired" || session.status === "invalid") {
    response.cookies.set(adminSessionCookieName, "", adminSessionCookieClearOptions());
  }

  return response;
}
