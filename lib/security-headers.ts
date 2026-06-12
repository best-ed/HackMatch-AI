export type SecurityHeader = {
  key: string;
  value: string;
};

export const baselineSecurityHeaders: SecurityHeader[] = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()"
  }
];

export function securityHeadersForNextConfig() {
  return [
    {
      source: "/:path*",
      headers: baselineSecurityHeaders
    }
  ];
}
