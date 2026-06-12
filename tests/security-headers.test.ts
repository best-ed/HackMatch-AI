import { describe, expect, it } from "vitest";
import {
  baselineSecurityHeaders,
  securityHeadersForNextConfig
} from "@/lib/security-headers";

describe("security headers", () => {
  it("defines baseline browser hardening headers", () => {
    expect(baselineSecurityHeaders).toEqual(
      expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" }
      ])
    );
  });

  it("applies headers to every route in Next config format", () => {
    expect(securityHeadersForNextConfig()).toEqual([
      {
        source: "/:path*",
        headers: baselineSecurityHeaders
      }
    ]);
  });
});
