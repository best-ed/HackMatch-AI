import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api-guard";
import { readAdminRuntimeSignals } from "@/lib/admin-runtime-signals";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminApiSession(request);
  if (unauthorized) return unauthorized;

  return NextResponse.json(readAdminRuntimeSignals(), {
    headers: {
      "cache-control": "no-store"
    }
  });
}
