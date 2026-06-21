import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/admin/session/route";
import { adminSessionCookieName, createAdminSessionToken } from "@/lib/admin-auth";

describe("admin session route", () => {
  it("refreshes an active admin session and returns renewed session details", async () => {
    await withAdminEnv(
      {
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
      },
      async () => {
        const token = await createAdminSessionToken({
          passcode: process.env.ADMIN_PASSCODE!,
          secret: process.env.ADMIN_SESSION_SECRET!,
          issuedAt: new Date("2026-06-21T07:00:00.000Z")
        });

        const response = await PATCH(
          new NextRequest("http://localhost:3000/api/admin/session", {
            headers: {
              cookie: `${adminSessionCookieName}=${token}`
            }
          })
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
          ok: true,
          enabled: true,
          refreshed: true,
          session: {
            authenticated: true,
            status: "active"
          }
        });
        expect(response.cookies.get(adminSessionCookieName)?.value).toMatch(/^hm-admin-v2\./);
      }
    );
  });

  it("rejects refresh attempts without an active admin session", async () => {
    await withAdminEnv(
      {
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
      },
      async () => {
        const response = await PATCH(
          new NextRequest("http://localhost:3000/api/admin/session")
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toMatchObject({
          ok: false,
          sessionStatus: "missing"
        });
      }
    );
  });

  it("keeps refresh inert while admin auth is disabled", async () => {
    await withAdminEnv(
      {
        ADMIN_PASSCODE: undefined,
        ADMIN_SESSION_SECRET: undefined
      },
      async () => {
        const response = await PATCH(
          new NextRequest("http://localhost:3000/api/admin/session")
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
          ok: true,
          enabled: false,
          refreshed: false
        });
      }
    );
  });
});

async function withAdminEnv<T>(
  env: Record<string, string | undefined>,
  run: () => Promise<T>
) {
  const original = {
    ADMIN_PASSCODE: process.env.ADMIN_PASSCODE,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET
  };

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  try {
    return await run();
  } finally {
    restoreEnvValue("ADMIN_PASSCODE", original.ADMIN_PASSCODE);
    restoreEnvValue("ADMIN_SESSION_SECRET", original.ADMIN_SESSION_SECRET);
  }
}

function restoreEnvValue(key: "ADMIN_PASSCODE" | "ADMIN_SESSION_SECRET", value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
