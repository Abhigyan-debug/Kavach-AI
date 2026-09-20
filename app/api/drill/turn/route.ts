import { NextResponse } from "next/server";
import { DrillTurnRequestSchema, DrillReplySchema } from "@/lib/schema";
import { parseStructured, LlmUnavailableError, isLlmConfigured, CHAT_MODELS } from "@/lib/llm";
import { scammerSystemPrompt } from "@/lib/prompts";
import { containsSensitiveDigits } from "@/lib/redact";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/** A drill runs 5-8 turns; we cap at 8 so it always reaches the score card. */
const MAX_TURNS = 8;

const SAFETY_BREAK = {
  en: "Let us stop there. That looked like a real number. Never share an OTP, card number or account number with anyone who calls you - not even in a drill like this one.",
  hi: "यहीं रुकते हैं। वह असली नंबर जैसा लग रहा था। किसी भी कॉल करने वाले को कभी अपना OTP, कार्ड नंबर या खाता नंबर न बताएं - इस अभ्यास में भी नहीं।",
};

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

  const parsed = DrillTurnRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { scenario, history, userMessage, lang } = parsed.data;

  const turn = history.filter((m) => m.role === "user").length + 1;

  // Deterministic safety net: if the user typed something that looks like a
  // real secret, we break character here rather than trusting the model to.
  if (containsSensitiveDigits(userMessage)) {
    return NextResponse.json({
      reply: SAFETY_BREAK[lang],
      turn,
      done: true,
      breakCharacter: true,
      source: "guard" as const,
    });
  }

  if (turn >= MAX_TURNS) {
    return NextResponse.json({
      reply:
        lang === "hi"
          ? "अभ्यास पूरा हुआ। अब अपने अंक देखिए।"
          : "That is the end of the drill. Let us look at how you did.",
      turn,
      done: true,
      breakCharacter: false,
      source: "guard" as const,
    });
  }

  if (!isLlmConfigured()) {
    return NextResponse.json(
      { error: "Drill unavailable: AI key not configured" },
      { status: 503 },
    );
  }

  try {
    // The client owns the transcript and replays it each turn, so the route
    // stays stateless and any instance can serve any turn.
    const transcript = [...history, { role: "user" as const, text: userMessage }]
      .map((m) => `${m.role === "scammer" ? "YOU" : "THEM"}: ${m.text}`)
      .join("\n");

    const result = await parseStructured({
      schema: DrillReplySchema,
      system: scammerSystemPrompt(scenario, lang),
      content: `Conversation so far:\n${transcript}\n\nWrite your next message (turn ${turn} of ${MAX_TURNS}).`,
      models: CHAT_MODELS,
      maxTokens: 1200,
    });

    return NextResponse.json({
      reply: result.reply,
      tactic: result.tactic,
      turn,
      done: result.break_character || turn >= MAX_TURNS - 1,
      breakCharacter: result.break_character,
      source: "ai" as const,
    });
  } catch (err) {
    if (err instanceof LlmUnavailableError) {
      console.warn("[drill/turn] llm unavailable:", err.message);
      return NextResponse.json(
        {
          reply:
            lang === "hi"
              ? "कनेक्शन टूट गया। चलिए यहीं रुककर आपके अंक देखते हैं।"
              : "The line dropped. Let us stop here and look at your score.",
          turn,
          done: true,
          breakCharacter: false,
          source: "guard" as const,
        },
        { status: 200 },
      );
    }
    console.error("[drill/turn] unexpected error", err);
    return NextResponse.json({ error: "Drill turn failed" }, { status: 500 });
  }
}
