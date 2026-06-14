import smokeRouteData from "@/smoke-routes.json";

export const smokeRoutes = smokeRouteData;

export function normalizeSmokeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function buildSmokeTargets(baseUrl: string, routes = smokeRoutes): string[] {
  const normalizedBaseUrl = normalizeSmokeBaseUrl(baseUrl);
  return routes.map((route) => `${normalizedBaseUrl}${route}`);
}

export function validateSmokeRoutes(routes = smokeRoutes): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();

  routes.forEach((route) => {
    if (!route.startsWith("/")) {
      issues.push(`${route} must start with /.`);
    }
    if (route.length > 1 && route.endsWith("/")) {
      issues.push(`${route} should not end with a trailing slash.`);
    }
    if (seen.has(route)) {
      issues.push(`${route} is duplicated.`);
    }
    seen.add(route);
  });

  return issues;
}
