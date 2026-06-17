import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { adminSessionCookieName, createAdminSessionToken } from "@/lib/admin-auth";

describe("admin middleware", () => {
  it("allows admin requests through when auth is disabled", async () => {
    const response = await middleware(new NextRequest("http://localhost:3000/admin"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects unauthenticated admin requests to login with a safe next path", async () => {
    const response = await withAdminEnv(
      {
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
      },
      async () =>
        middleware(
          new NextRequest("http://localhost:3000/admin/teams?filter=attention")
        )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/admin/login?next=%2Fadmin%2Fteams%3Ffilter%3Dattention"
    );
  });

  it("redirects authenticated users away from admin login", async () => {
    const response = await withAdminEnv(
      {
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
      },
      async () => {
        const token = await createAdminSessionToken({
          passcode: process.env.ADMIN_PASSCODE!,
          secret: process.env.ADMIN_SESSION_SECRET!
        });

        return middleware(
          new NextRequest("http://localhost:3000/admin/login?next=/admin/settings", {
            headers: {
              cookie: `${adminSessionCookieName}=${token}`
            }
          })
        );
      }
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/admin/settings");
  });

  it("clears stale cookies when a protected admin request fails auth", async () => {
    const response = await withAdminEnv(
      {
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
      },
      async () =>
        middleware(
          new NextRequest("http://localhost:3000/admin/settings", {
            headers: {
              cookie: `${adminSessionCookieName}=hm-admin-v2.bad.bad.bad`
            }
          })
        )
    );

    expect(response.status).toBe(307);
    expect(response.cookies.get(adminSessionCookieName)?.value).toBe("");
  });
});

async function withAdminEnv<T>(env: Record<string, string>, run: () => Promise<T>) {
  const original = {
    ADMIN_PASSCODE: process.env.ADMIN_PASSCODE,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET
  };

  Object.assign(process.env, env);

  try {
    return await run();
  } finally {
    process.env.ADMIN_PASSCODE = original.ADMIN_PASSCODE;
    process.env.ADMIN_SESSION_SECRET = original.ADMIN_SESSION_SECRET;
  }
}
