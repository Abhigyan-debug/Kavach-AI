import {
  GoogleGenAI,
  ApiError,
  FinishReason,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/genai";
import * as z from "zod/v4";

/**
 * Gemini model layer.
 *
 * Each role gets an ordered fallback chain, not a single model. Measured on
 * the free tier on build day: gemini-3.8-flash and gemini-flash-latest both
 * returned 503 "high demand", while the 2.5 and lite models answered fine.
 * Newest != most available, so the primaries below are the ones that actually
 * responded, and a 503/429 falls through to the next entry rather than
 * dropping the user straight to keyword rules.
 *
 * Override with a comma-separated list, e.g.
 *   GEMINI_ANALYSIS_MODEL=gemini-2.5-flash,gemini-3.1-flash-lite
 */
const parseChain = (value: string | undefined, fallback: string[]): string[] => {
  const parsed = (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parsed.length ? parsed : fallback;
};

/** Accuracy first - this is the verdict users act on. */
export const ANALYSIS_MODELS = parseChain(process.env.GEMINI_ANALYSIS_MODEL, [
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
]);

/** Latency first - a drill reply has to feel like a live conversation. */
export const CHAT_MODELS = parseChain(process.env.GEMINI_CHAT_MODEL, [
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
]);

/**
 * Coaching sits between the two. Measured on the same transcripts:
 * gemini-2.5-flash spent ~950 thinking tokens to emit ~100 tokens of score
 * card (6.3s); gemini-3.1-flash-lite produced identical grades with no
 * thinking tokens (~4s). flash-lite-latest is faster still but grades a long
 * ambiguous transcript more harshly, and under-scoring someone who did
 * everything right is the one failure this feature cannot have.
 */
export const COACH_MODELS = parseChain(process.env.GEMINI_COACH_MODEL, [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
]);

const TIMEOUT_MS = 22_000;

/**
 * Kavach quotes scam messages verbatim and role-plays a scammer for training.
 * At default thresholds Gemini sometimes blocks that as dangerous content,
 * which would break the core feature. BLOCK_ONLY_HIGH keeps genuine protection
 * while allowing the educational use case; anything still blocked is handled
 * below and falls back to rules rather than failing the request.
 */
const SAFETY_SETTINGS = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }));

export class LlmUnavailableError extends Error {
  /** True when another model in the chain might succeed (overload, quota). */
  readonly retryable: boolean;

  constructor(message: string, opts: { retryable?: boolean; cause?: unknown } = {}) {
    super(message);
    this.name = "LlmUnavailableError";
    this.retryable = opts.retryable ?? false;
    this.cause = opts.cause;
  }
}

let cached: GoogleGenAI | null = null;

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new LlmUnavailableError("GEMINI_API_KEY is not set");
  }
  if (!cached) cached = new GoogleGenAI({ apiKey });
  return cached;
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY);
}

/** Either plain text, or a screenshot plus the instruction that frames it. */
export type LlmContent =
  | string
  | { imageBase64: string; imageMediaType: string; text: string };

/**
 * Gemini accepts a JSON Schema subset that does not include `$schema`, and
 * rejects unknown top-level keywords. Zod emits `$schema`, so strip it.
 */
function toGeminiSchema(schema: z.ZodType): unknown {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

function buildContents(content: LlmContent) {
  if (typeof content === "string") return content;
  return [
    {
      role: "user",
      parts: [
        { inlineData: { mimeType: content.imageMediaType, data: content.imageBase64 } },
        { text: content.text },
      ],
    },
  ];
}

/**
 * Structured call: constrains the response to `schema` and returns a parsed,
 * validated object. Throws LlmUnavailableError on anything the caller should
 * handle by falling back to rules.
 */
export async function parseStructured<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  content: LlmContent;
  models?: string[];
  maxTokens?: number;
}): Promise<z.infer<T>> {
  const chain = opts.models ?? ANALYSIS_MODELS;
  let last: LlmUnavailableError | null = null;

  for (const model of chain) {
    try {
      return await callOnce({ ...opts, model });
    } catch (err) {
      const e =
        err instanceof LlmUnavailableError ? err : toLlmError(err, model);
      last = e;
      // Overload and quota are the provider's problem, not ours - try the
      // next model. A schema or safety failure would repeat, so stop there.
      if (!e.retryable) throw e;
      console.warn(`[llm] ${model} unavailable (${e.message}), trying next`);
    }
  }
  throw last ?? new LlmUnavailableError("No model available");
}

async function callOnce<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  content: LlmContent;
  model: string;
  maxTokens?: number;
}): Promise<z.infer<T>> {
  try {
    const response = await client().models.generateContent({
      model: opts.model,
      contents: buildContents(opts.content),
      config: {
        systemInstruction: opts.system,
        responseMimeType: "application/json",
        responseJsonSchema: toGeminiSchema(opts.schema),
        maxOutputTokens: opts.maxTokens ?? 2000,
        temperature: 0.3,
        safetySettings: SAFETY_SETTINGS,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
        // No thinkingConfig on purpose. The two generations disagree:
        // thinkingBudget:0 is a 400 on 3.x lite models, thinkingLevel is a 400
        // on 2.5. Omitting it is the only form valid on both, and measured
        // latency is already ~1.5s on the lite model.
      },
    });

    // A safety block returns 200 with no usable candidate - check before reading.
    const blocked = response.promptFeedback?.blockReason;
    if (blocked) {
      throw new LlmUnavailableError(`Prompt blocked by safety filter (${blocked})`);
    }

    const finish = response.candidates?.[0]?.finishReason;
    if (finish && finish !== FinishReason.STOP) {
      throw new LlmUnavailableError(`Generation stopped early (${finish})`, {
        retryable: true,
      });
    }

    const text = response.text;
    if (!text) {
      throw new LlmUnavailableError("Model returned an empty response", { retryable: true });
    }

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new LlmUnavailableError("Model returned output that was not valid JSON", {
        retryable: true,
      });
    }

    // The schema is enforced server-side, but we re-validate so a drifted
    // response can never reach the UI.
    const parsed = opts.schema.safeParse(raw);
    if (!parsed.success) {
      throw new LlmUnavailableError("Model returned output that did not match the schema", {
        retryable: true,
      });
    }
    return parsed.data;
  } catch (err) {
    if (err instanceof LlmUnavailableError) throw err;
    throw toLlmError(err, opts.model);
  }
}

/**
 * Classifies a provider error, most-specific-first, and decides whether a
 * different model could succeed. Overload (503) and quota (429) are about the
 * model, so the chain retries; a bad key or a blocked prompt would fail
 * identically on every model, so those stop immediately.
 */
function toLlmError(err: unknown, model: string): LlmUnavailableError {
  const make = (message: string, retryable = false) =>
    new LlmUnavailableError(message, { retryable, cause: err });

  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return make(`Model call timed out (${model})`, true);
  }

  if (err instanceof ApiError) {
    const status = (err as ApiError & { status?: number }).status;
    if (status === 429) return make("Free-tier quota exceeded - please wait a minute", true);
    if (status === 503) return make(`${model} is overloaded`, true);
    if (status && status >= 500) return make(`Gemini service error ${status}`, true);
    if (status === 404) return make(`Model not found (${model})`, true);
    if (status === 401 || status === 403) return make("Invalid or missing Gemini API key");
    // 400 is usually "this model rejects that config" rather than a malformed
    // request, and the chain spans two model generations - so try the next one.
    if (status === 400) return make(`${model} rejected the request`, true);
    return make(`Gemini API error ${status ?? "unknown"}`);
  }

  // The SDK does not always surface a typed ApiError; fall back to the body.
  const text = err instanceof Error ? err.message : String(err);
  if (/\b503\b|UNAVAILABLE|overloaded|high demand/i.test(text)) {
    return make(`${model} is overloaded`, true);
  }
  if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(text)) {
    return make("Free-tier quota exceeded - please wait a minute", true);
  }
  if (/\b404\b|not found|no longer available/i.test(text)) {
    return make(`Model not found (${model})`, true);
  }
  return make(text.slice(0, 200));
}
