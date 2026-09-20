import { NextResponse } from "next/server";
import {
  HelperStartRequestSchema,
  HelperTurnRequestSchema,
  HelperReplySchema,
  HELPER_MAX_TURNS,
} from "@/lib/schema";
import { parseStructured, LlmUnavailableError, isLlmConfigured, CHAT_MODELS } from "@/lib/llm";
import { helperSystemPrompt, helperOpenerPrompt, helperTurnPrompt } from "@/lib/prompts";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const CANNED_OPENER = {
  en: "Beta, I am so scared. Someone just called and said our boy is in trouble with the police. They want 50,000 rupees right now to settle it quietly. I am opening the bank app.",
  hi: "बेटा, मैं बहुत डर गई हूँ। अभी किसी का फ़ोन आया, कह रहे हैं अपना बच्चा पुलिस केस में फँस गया है। अभी 50,000 रुपये माँग रहे हैं। मैं बैंक ऐप खोल रही हूँ।",
};

/**
 * One turn of Helper mode. The client owns the transcript and the current
 * conviction, so the route stays stateless like the drill routes.
 * POST with no history starts a new conversation.
 */
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

  const isStart = !(body as { history?: unknown })?.history;

  if (isStart) {
    const parsed = HelperStartRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { lang } = parsed.data;

    const fallback = () =>
      NextResponse.json({
        reply: CANNED_OPENER[lang],
        conviction: 85,
        moved_because: "",
        turn: 0,
        done: false,
        source: "canned" as const,
      });

    if (!isLlmConfigured()) return fallback();

    try {
      const r = await parseStructured({
        schema: HelperReplySchema,
        system: helperSystemPrompt(lang),
        content: helperOpenerPrompt(),
        models: CHAT_MODELS,
        maxTokens: 1200,
      });
      return NextResponse.json({ ...r, turn: 0, done: false, source: "ai" as const });
    } catch (err) {
      if (err instanceof LlmUnavailableError) {
        console.warn("[helper/start] canned opener:", err.message);
        return fallback();
      }
      return NextResponse.json({ error: "Could not start" }, { status: 500 });
    }
  }

  const parsed = HelperTurnRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { history, userMessage, conviction, lang } = parsed.data;
  const turn = history.filter((m) => m.role === "user").length + 1;

  if (!isLlmConfigured()) {
    return NextResponse.json({ error: "Helper mode needs the AI" }, { status: 503 });
  }

  try {
    const transcript = [...history, { role: "user" as const, text: userMessage }]
      .map((m) => `${m.role === "scammer" ? "SUNITA" : "YOU"}: ${m.text}`)
      .join("\n");

    const r = await parseStructured({
      schema: HelperReplySchema,
      system: helperSystemPrompt(lang),
      content: helperTurnPrompt(transcript, conviction, turn),
      models: CHAT_MODELS,
      maxTokens: 1200,
    });

    // Saved when she no longer believes it; lost when the turns run out.
    const saved = r.conviction <= 15;
    return NextResponse.json({
      ...r,
      turn,
      done: saved || turn >= HELPER_MAX_TURNS,
      saved,
      source: "ai" as const,
    });
  } catch (err) {
    if (err instanceof LlmUnavailableError) {
      console.warn("[helper/turn] llm unavailable:", err.message);
      return NextResponse.json({
        reply:
          lang === "hi"
            ? "बेटा, फ़ोन कट गया... मैं थोड़ा सोचती हूँ।"
            : "Beta, the line cut... let me think for a moment.",
        conviction,
        moved_because: "",
        turn,
        done: true,
        saved: false,
        source: "guard" as const,
      });
    }
    return NextResponse.json({ error: "Turn failed" }, { status: 500 });
  }
}
