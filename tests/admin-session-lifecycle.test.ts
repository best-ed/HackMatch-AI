import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET, PATCH, POST } from "@/app/api/admin/session/route";
import {
  adminSessionCookieName,
  createAdminSessionToken
} from "@/lib/admin-auth";
import { resetAdminLoginGuardStore } from "@/lib/admin-login-guard";

describe("admin session lifecycle", () => {
  beforeEach(() => {
    resetAdminLoginGuardStore();
  });

  it("returns no-store session summaries for protected environments", async () => {
    await withAdminEnv(
      {
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
      },
      async () => {
        const response = await GET(
          new NextRequest("http://localhost:3000/api/admin/session")
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        await expect(response.json()).resolves.toMatchObject({
          enabled: true,
          session: {
            authenticated: false,
            status: "missing"
          },
          loginGuard: {
            blocked: false
          }
        });
      }
    );
  });

  it("enters cooldown after repeated invalid passcode attempts", async () => {
    await withAdminEnv(
      {
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
      },
      async () => {
        let lastResponse;

        for (let attempt = 0; attempt < 5; attempt += 1) {
          lastResponse = await POST(
            new NextRequest("http://localhost:3000/api/admin/session", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "user-agent": "vitest-agent"
              },
              body: JSON.stringify({ passcode: "wrong-passcode" })
            })
          );
        }

        expect(lastResponse?.status).toBe(429);
        expect(lastResponse?.headers.get("retry-after")).toBeTruthy();
        await expect(lastResponse?.json()).resolves.toMatchObject({
          ok: false,
          error: "Too many admin login attempts."
        });
      }
    );
  });

  it("clears the admin cookie on sign-out", async () => {
    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain(`${adminSessionCookieName}=;`);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("clears invalid refresh cookies instead of leaving stale sessions behind", async () => {
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

        const response = await PATCH(
          new NextRequest("http://localhost:3000/api/admin/session", {
            method: "PATCH",
            headers: {
              cookie: `${adminSessionCookieName}=${token}-tampered`
            }
          })
        );

        expect(response.status).toBe(401);
        expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
        await expect(response.json()).resolves.toMatchObject({
          ok: false,
          sessionStatus: "invalid"
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

function restoreEnvValue(
  key: "ADMIN_PASSCODE" | "ADMIN_SESSION_SECRET",
  value: string | undefined
) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
