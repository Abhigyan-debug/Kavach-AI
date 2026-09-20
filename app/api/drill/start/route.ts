import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { DrillStartRequestSchema, DrillReplySchema } from "@/lib/schema";
import { parseStructured, LlmUnavailableError, isLlmConfigured, CHAT_MODELS } from "@/lib/llm";
import { scammerSystemPrompt, scammerOpenerPrompt, SCENARIO_SPECS } from "@/lib/prompts";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Used when the model is unavailable so a drill can still be demoed. */
const CANNED_OPENERS: Record<string, { en: string; hi: string }> = {
  bank_kyc: {
    en: "Good morning, I am calling from your bank's verification department. Am I speaking with the account holder? Your KYC expires today and the account will be blocked.",
    hi: "नमस्ते, मैं आपके बैंक के सत्यापन विभाग से बोल रहा हूँ। क्या मैं खाताधारक से बात कर रहा हूँ? आपका KYC आज समाप्त हो रहा है और खाता बंद हो जाएगा।",
  },
  parcel: {
    en: "Hello, this is regarding a parcel addressed to you. It is held at the sorting facility and a small clearance fee of 48 rupees is pending.",
    hi: "नमस्ते, यह आपके नाम आए एक पार्सल के बारे में है। यह सॉर्टिंग केंद्र पर रुका है और 48 रुपये का छोटा शुल्क बकाया है।",
  },
  lottery: {
    en: "Congratulations! Your number has been selected in our lucky draw for a prize of twenty-five lakh rupees. Shall I tell you how to claim it?",
    hi: "बधाई हो! हमारे लकी ड्रॉ में पच्चीस लाख रुपये के इनाम के लिए आपका नंबर चुना गया है। क्या मैं बताऊँ कि इसे कैसे लेना है?",
  },
  fake_official: {
    en: "This is Inspector Sharma from the cyber crime department. A case has been registered against your identity document. Do not disconnect this call.",
    hi: "मैं साइबर क्राइम विभाग से इंस्पेक्टर शर्मा बोल रहा हूँ। आपके पहचान दस्तावेज़ पर एक मामला दर्ज हुआ है। यह कॉल न काटें।",
  },
  legit_call: {
    en: "Good afternoon, I am calling from your bank branch to confirm your appointment this Thursday at 11 am. Does that time still suit you?",
    hi: "नमस्ते, मैं आपकी बैंक शाखा से आपकी गुरुवार सुबह 11 बजे की मुलाक़ात की पुष्टि के लिए कॉल कर रहा हूँ। क्या वह समय ठीक है?",
  },
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

  const parsed = DrillStartRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { scenario, lang } = parsed.data;

  const fallback = () =>
    NextResponse.json({
      sessionId: randomUUID(),
      firstMessage: CANNED_OPENERS[scenario][lang],
      cuesTotal: SCENARIO_SPECS[scenario].cues.length,
      source: "canned" as const,
    });

  if (!isLlmConfigured()) return fallback();

  try {
    const result = await parseStructured({
      schema: DrillReplySchema,
      system: scammerSystemPrompt(scenario, lang),
      content: scammerOpenerPrompt(scenario),
      models: CHAT_MODELS,
      maxTokens: 1200,
    });

    return NextResponse.json({
      sessionId: randomUUID(),
      firstMessage: result.reply,
      cuesTotal: SCENARIO_SPECS[scenario].cues.length,
      source: "ai" as const,
    });
  } catch (err) {
    if (err instanceof LlmUnavailableError) {
      console.warn("[drill/start] canned opener:", err.message);
      return fallback();
    }
    console.error("[drill/start] unexpected error", err);
    return NextResponse.json({ error: "Could not start the drill" }, { status: 500 });
  }
}
