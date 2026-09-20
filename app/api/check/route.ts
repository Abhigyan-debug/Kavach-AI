import { NextResponse } from "next/server";
import { CheckRequestSchema, CheckResultSchema } from "@/lib/schema";
import { redact } from "@/lib/redact";
import { rulesVerdict } from "@/lib/fallback";
import { parseStructured, LlmUnavailableError, isLlmConfigured } from "@/lib/llm";
import {
  detectionSystemPrompt,
  detectionUserPrompt,
  imageDetectionPrompt,
} from "@/lib/prompts";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const limit = rateLimit(clientIp(req));
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CheckRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { text, imageBase64, imageMediaType, lang } = parsed.data;

  // Mask OTPs, phone and account numbers BEFORE anything leaves this process.
  const safeText = text ? redact(text) : "";

  if (!isLlmConfigured()) {
    return NextResponse.json({
      ...rulesVerdict(safeText, lang),
      source: "rules",
      note: "AI key not configured",
    });
  }

  try {
    const content = imageBase64
      ? {
          imageBase64,
          imageMediaType: imageMediaType ?? "image/png",
          text: imageDetectionPrompt(),
        }
      : detectionUserPrompt(safeText);

    const result = await parseStructured({
      schema: CheckResultSchema,
      system: detectionSystemPrompt(lang),
      content,
      maxTokens: 1500,
    });

    // Keep the verdict and the score from contradicting each other in the UI.
    const reconciled = {
      ...result,
      family_alert_recommended:
        result.verdict === "SCAM" ||
        (result.verdict === "SUSPICIOUS" && result.risk_score >= 45),
    };

    return NextResponse.json({ ...reconciled, source: "ai" });
  } catch (err) {
    if (err instanceof LlmUnavailableError) {
      console.warn("[check] falling back to rules:", err.message);
      return NextResponse.json({
        ...rulesVerdict(safeText, lang),
        source: "rules",
        note: err.message,
      });
    }
    console.error("[check] unexpected error", err);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
