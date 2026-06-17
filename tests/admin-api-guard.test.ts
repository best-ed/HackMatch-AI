import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api-guard";
import { adminSessionCookieName, createAdminSessionToken } from "@/lib/admin-auth";

describe("admin api guard", () => {
  it("allows requests when admin auth is not configured", async () => {
    const request = new NextRequest("http://localhost:3000/api/admin/security-readiness");

    await expect(requireAdminApiSession(request)).resolves.toBeNull();
  });

  it("blocks missing sessions when admin auth is configured", async () => {
    const response = await withAdminEnv(
      {
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
      },
      async () =>
        requireAdminApiSession(
          new NextRequest("http://localhost:3000/api/admin/security-readiness")
        )
    );

    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toMatchObject({
      ok: false,
      sessionStatus: "missing"
    });
  });

  it("allows valid sessions and clears invalid ones", async () => {
    await withAdminEnv(
      {
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
      },
      async () => {
        const token = await createAdminSessionToken({
          passcode: process.env.ADMIN_PASSCODE!,
          secret: process.env.ADMIN_SESSION_SECRET!
        });

        const valid = await requireAdminApiSession(
          new NextRequest("http://localhost:3000/api/explanations", {
            headers: {
              cookie: `${adminSessionCookieName}=${token}`
            }
          })
        );
        expect(valid).toBeNull();

        const invalid = await requireAdminApiSession(
          new NextRequest("http://localhost:3000/api/explanations", {
            headers: {
              cookie: `${adminSessionCookieName}=hm-admin-v2.bad.bad.bad`
            }
          })
        );
        expect(invalid?.status).toBe(401);
        expect(invalid?.cookies.get(adminSessionCookieName)?.value).toBe("");
      }
    );
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
