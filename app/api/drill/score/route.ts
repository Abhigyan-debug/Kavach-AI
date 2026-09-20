import { NextResponse } from "next/server";
import { DrillScoreRequestSchema, DrillScoreSchema } from "@/lib/schema";
import { parseStructured, LlmUnavailableError, isLlmConfigured, COACH_MODELS } from "@/lib/llm";
import { coachSystemPrompt, coachUserPrompt, SCENARIO_SPECS } from "@/lib/prompts";
import { insertDrill } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

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

  const parsed = DrillScoreRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { scenario, transcript, lang } = parsed.data;
  const cuesTotal = SCENARIO_SPECS[scenario].cues.length;

  if (!isLlmConfigured()) {
    return NextResponse.json(
      { error: "Scoring unavailable: AI key not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await parseStructured({
      schema: DrillScoreSchema,
      system: coachSystemPrompt(scenario, lang),
      content: coachUserPrompt(transcript),
      models: COACH_MODELS,
      maxTokens: 1200,
    });

    // Persisting the score is a nice-to-have; never fail the response for it.
    try {
      await insertDrill({
        scenario,
        score: result.score,
        cuesCaught: result.caught.length,
        cuesTotal,
      });
    } catch (dbErr) {
      console.warn("[drill/score] could not persist drill", dbErr);
    }

    return NextResponse.json({ ...result, cuesTotal });
  } catch (err) {
    if (err instanceof LlmUnavailableError) {
      console.warn("[drill/score] llm unavailable:", err.message);
      return NextResponse.json({ error: "Scoring unavailable right now" }, { status: 503 });
    }
    console.error("[drill/score] unexpected error", err);
    return NextResponse.json({ error: "Scoring failed" }, { status: 500 });
  }
}
