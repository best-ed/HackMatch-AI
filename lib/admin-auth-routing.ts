import { adminLoginPath } from "@/lib/admin-auth";

export function sanitizeAdminNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/admin") || value.startsWith("/admin/login")) {
    return "/admin";
  }
  return value;
}

export function buildAdminLoginDestination(nextUrl: {
  pathname: string;
  search: string;
}) {
  return sanitizeAdminNextPath(`${nextUrl.pathname}${nextUrl.search}`);
}

export function resolveAuthenticatedAdminDestination(nextPath: string | null | undefined) {
  return sanitizeAdminNextPath(nextPath);
}

export function isAdminLoginPath(pathname: string) {
  return pathname === adminLoginPath || pathname.startsWith(`${adminLoginPath}/`);
}
