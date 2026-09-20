import { NextResponse } from "next/server";
import { AlertRequestSchema } from "@/lib/schema";
import { insertAlert, listAlerts, resolveAlert, listDrills } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limit = rateLimit(clientIp(req));
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = AlertRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    // Only the summary and tactic tags are stored - never the raw message.
    const alert = await insertAlert(parsed.data);
    return NextResponse.json({ alertId: alert.id }, { status: 201 });
  } catch (err) {
    console.error("[alert] insert failed", err);
    return NextResponse.json({ error: "Could not raise the alert" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [alerts, drills] = await Promise.all([listAlerts(), listDrills()]);
    return NextResponse.json({ alerts, drills });
  } catch (err) {
    console.error("[alert] list failed", err);
    return NextResponse.json({ error: "Could not load alerts" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = (body as { id?: unknown })?.id;
  if (typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const ok = await resolveAlert(id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
