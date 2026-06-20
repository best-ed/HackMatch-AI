import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET, POST } from "@/app/api/admin/session/route";
import { GET as GET_RUNTIME_SIGNALS } from "@/app/api/admin/runtime-signals/route";
import { GET as GET_SECURITY_READINESS } from "@/app/api/admin/security-readiness/route";
import { POST as POST_EXPLANATIONS } from "@/app/api/explanations/route";
import { adminSessionCookieName, createAdminSessionToken } from "@/lib/admin-auth";
import { demoMatchingSettings, demoParticipants } from "@/lib/demo-data";

describe("admin cache headers", () => {
  it("marks admin session responses as no-store", async () => {
    const getResponse = await withAdminEnv(
      {
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
      },
      async () => GET(new NextRequest("http://localhost:3000/api/admin/session"))
    );

    const postResponse = await withAdminEnv(
      {
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong"
      },
      async () =>
        POST(
          new NextRequest("http://localhost:3000/api/admin/session", {
            method: "POST",
            body: JSON.stringify({ passcode: "LaunchCode2026" }),
            headers: {
              "content-type": "application/json"
            }
          })
        )
    );

    const deleteResponse = await DELETE();

    expect(getResponse.headers.get("cache-control")).toBe("no-store");
    expect(postResponse.headers.get("cache-control")).toBe("no-store");
    expect(deleteResponse.headers.get("cache-control")).toBe("no-store");
  });

  it("marks protected security surfaces as no-store", async () => {
    await withAdminEnv(
      {
        ADMIN_PASSCODE: "LaunchCode2026",
        ADMIN_SESSION_SECRET: "LaunchCode2026-Session-Secret-Strong",
        OPENAI_API_KEY: "sk-test-key"
      },
      async () => {
        const token = await createAdminSessionToken({
          passcode: process.env.ADMIN_PASSCODE!,
          secret: process.env.ADMIN_SESSION_SECRET!
        });
        const headers = {
          cookie: `${adminSessionCookieName}=${token}`
        };

        const runtimeSignalsResponse = await GET_RUNTIME_SIGNALS(
          new NextRequest("http://localhost:3000/api/admin/runtime-signals", { headers })
        );
        const securityReadinessResponse = await GET_SECURITY_READINESS(
          new NextRequest("http://localhost:3000/api/admin/security-readiness", { headers })
        );
        const explanationResponse = await POST_EXPLANATIONS(
          new NextRequest("http://localhost:3000/api/explanations", {
            method: "POST",
            headers: {
              ...headers,
              "content-type": "application/json"
            },
            body: JSON.stringify({
              participants: demoParticipants.slice(0, 4),
              settings: demoMatchingSettings
            })
          })
        );

        expect(runtimeSignalsResponse.headers.get("cache-control")).toBe("no-store");
        expect(securityReadinessResponse.headers.get("cache-control")).toBe("no-store");
        expect(explanationResponse.headers.get("cache-control")).toBe("no-store");
      }
    );
  });
});

async function withAdminEnv<T>(env: Record<string, string>, run: () => Promise<T>) {
  const original = {
    ADMIN_PASSCODE: process.env.ADMIN_PASSCODE,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  };

  Object.assign(process.env, env);

  try {
    return await run();
  } finally {
    process.env.ADMIN_PASSCODE = original.ADMIN_PASSCODE;
    process.env.ADMIN_SESSION_SECRET = original.ADMIN_SESSION_SECRET;
    process.env.OPENAI_API_KEY = original.OPENAI_API_KEY;
  }
}
