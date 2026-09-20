import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";
import { isLlmConfigured } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Smoke-test target for CI. Reports which subsystems are live so a degraded
 * deploy (no API key, unreachable Postgres) is visible before a demo rather
 * than during one.
 */
export async function GET() {
  const storage = await pingDb();

  return NextResponse.json({
    ok: true,
    service: "kavach",
    storage, // "postgres" | "memory" | "error"
    ai: isLlmConfigured() ? "configured" : "missing-key",
    time: new Date().toISOString(),
  });
}
