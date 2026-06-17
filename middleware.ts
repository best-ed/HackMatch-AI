import { NextResponse, type NextRequest } from "next/server";
import {
  adminLoginPath,
  adminSessionCookieName,
  isAdminAuthConfigured,
  verifyAdminSessionToken
} from "@/lib/admin-auth";
import {
  buildAdminLoginDestination,
  isAdminLoginPath,
  resolveAuthenticatedAdminDestination
} from "@/lib/admin-auth-routing";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (!isAdminAuthConfigured()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(adminSessionCookieName)?.value;
  const authenticated = await verifyAdminSessionToken(token);
  const isLoginRoute = isAdminLoginPath(pathname);

  if (authenticated) {
    if (isLoginRoute) {
      const nextPath = resolveAuthenticatedAdminDestination(
        request.nextUrl.searchParams.get("next")
      );
      const safeNextUrl = new URL(nextPath, request.url);
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = safeNextUrl.pathname;
      redirectUrl.search = safeNextUrl.search;
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  if (isLoginRoute) {
    const response = NextResponse.next();
    if (token) {
      response.cookies.set(adminSessionCookieName, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
        path: "/"
      });
    }
    return response;
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = adminLoginPath;
  loginUrl.search = "";
  loginUrl.searchParams.set("next", buildAdminLoginDestination(request.nextUrl));
  const response = NextResponse.redirect(loginUrl);
  if (token) {
    response.cookies.set(adminSessionCookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/"
    });
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"]
};
