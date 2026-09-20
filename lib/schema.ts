import * as z from "zod/v4";

/**
 * Tactic taxonomy: Stajano & Wilson's seven scam-victim principles, plus Fear.
 * Kept as a closed enum so the UI can always map a tag to a translated label.
 */
export const TACTICS = [
  "Distraction",
  "Authority",
  "Herd",
  "Dishonesty",
  "Kindness",
  "Need and Greed",
  "Time pressure",
  "Fear",
] as const;

export const VERDICTS = ["SAFE", "SUSPICIOUS", "SCAM"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const LANGS = ["en", "hi"] as const;
export type Lang = (typeof LANGS)[number];

export const SCENARIOS = [
  "bank_kyc",
  "parcel",
  "lottery",
  "fake_official",
  "legit_call",
] as const;
export type Scenario = (typeof SCENARIOS)[number];

/** Shape returned by POST /api/check. */
export const CheckResultSchema = z.object({
  verdict: z.enum(VERDICTS),
  risk_score: z.number().int().min(0).max(100),
  tactics: z.array(z.enum(TACTICS)).max(4),
  reasons: z.array(z.string()).min(1).max(3),
  do_now: z.array(z.string()).min(1).max(4),
  family_alert_recommended: z.boolean(),
});
export type CheckResult = z.infer<typeof CheckResultSchema>;

export const CheckRequestSchema = z
  .object({
    text: z.string().min(1).max(4000).optional(),
    imageBase64: z.string().max(7_000_000).optional(),
    imageMediaType: z
      .enum(["image/png", "image/jpeg", "image/webp", "image/gif"])
      .optional(),
    lang: z.enum(LANGS).default("en"),
  })
  .refine((v) => Boolean(v.text || v.imageBase64), {
    message: "Provide either text or imageBase64",
  });

/** One message in a drill transcript. */
export const DrillMessageSchema = z.object({
  role: z.enum(["scammer", "user"]),
  text: z.string().max(2000),
});
export type DrillMessage = z.infer<typeof DrillMessageSchema>;

export const DrillStartRequestSchema = z.object({
  scenario: z.enum(SCENARIOS),
  lang: z.enum(LANGS).default("en"),
});

export const DrillTurnRequestSchema = z.object({
  scenario: z.enum(SCENARIOS),
  history: z.array(DrillMessageSchema).max(20),
  userMessage: z.string().min(1).max(1000),
  lang: z.enum(LANGS).default("en"),
});

/** Model output for a single scammer turn. */
export const DrillReplySchema = z.object({
  reply: z.string(),
  tactic: z.enum(TACTICS),
  /** True when the user revealed something a real scammer could use. */
  break_character: z.boolean(),
});
export type DrillReply = z.infer<typeof DrillReplySchema>;

export const DrillScoreRequestSchema = z.object({
  scenario: z.enum(SCENARIOS),
  transcript: z.array(DrillMessageSchema).min(1).max(30),
  lang: z.enum(LANGS).default("en"),
});

export const DrillScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  caught: z.array(z.string()).max(6),
  missed: z.array(z.string()).max(6),
  lesson: z.string(),
  encouragement: z.string(),
});
export type DrillScore = z.infer<typeof DrillScoreSchema>;

export const AlertRequestSchema = z.object({
  elderId: z.string().uuid().optional(),
  elderName: z.string().min(1).max(80).default("Family member"),
  verdict: z.enum(VERDICTS),
  risk_score: z.number().int().min(0).max(100),
  tactics: z.array(z.enum(TACTICS)).max(4),
  summary: z.string().min(1).max(400),
});
export type AlertRequest = z.infer<typeof AlertRequestSchema>;

/* ------------------------------------------------------------------ */
/* Helper mode (ROLESafe "Helper" role)                                */
/* ------------------------------------------------------------------ */

/**
 * The user is not the target here - a relative is. The user has to talk them
 * out of sending money. Conviction is the relative's belief that the scam is
 * real; the drill is won by arguing it down, not by refusing anything.
 */
export const HELPER_MAX_TURNS = 7;

export const HelperStartRequestSchema = z.object({
  lang: z.enum(LANGS).default("en"),
});

export const HelperTurnRequestSchema = z.object({
  history: z.array(DrillMessageSchema).max(20),
  userMessage: z.string().min(1).max(1000),
  conviction: z.number().int().min(0).max(100),
  lang: z.enum(LANGS).default("en"),
});

export const HelperReplySchema = z.object({
  reply: z.string(),
  /** 100 = certain the scam is real, 0 = fully convinced it is a scam. */
  conviction: z.number().int().min(0).max(100),
  /** Why the conviction moved, shown to the user as live coaching. */
  moved_because: z.string(),
});
export type HelperReply = z.infer<typeof HelperReplySchema>;
