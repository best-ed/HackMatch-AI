import { NextResponse } from "next/server";
import { evaluateSecurityReadiness } from "@/lib/security-readiness";

export async function GET() {
  return NextResponse.json(
    evaluateSecurityReadiness({
      hasAdminPasscode: Boolean(process.env.ADMIN_PASSCODE?.trim()),
      hasAdminSessionSecret: Boolean(process.env.ADMIN_SESSION_SECRET?.trim()),
      adminPasscode: process.env.ADMIN_PASSCODE?.trim(),
      adminSessionSecret: process.env.ADMIN_SESSION_SECRET?.trim(),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
      hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
      hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
      hasSmokeScript: true
    })
  );
}
