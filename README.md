# Kavach — AI Scam Shield for Families

**Check it. Practise against it. Protect your family.**

Kavach does three things: it tells you whether a message is a scam and why, it lets you
practise against a safe AI scammer so the real one stops working, and it tells someone who
cares when the risk is real.

Built for HackDay 1.0 — theme *Tech for a Better Tomorrow*.

---

## The problem

Scams work on people, not on systems. The people hit hardest — elders and first-time internet
users — are the least likely to get help in language they understand. Most tools flag a scam
*after* it arrives, in technical words, and never involve the family.

Kavach is **Check + Fire Drill + Family Loop**.

| Module | What it does |
|---|---|
| **Check** | Paste a message or a screenshot. Get `SAFE` / `SUSPICIOUS` / `SCAM`, a risk score, the manipulation tactics used, three plain-language reasons, and concrete next steps. |
| **Fire Drill** | An AI plays a scammer for up to 8 turns across 5 scenarios. One of them is a *genuine* call. A coach then scores which cues you caught and missed. |
| **Family Loop** | On a high-risk result, one tap raises an alert. The guardian sees a summary, the tactic tags, and a call button. |

---

## Running it

```bash
npm install
# create .env with the variables in the table below, then:
npm run verify:ai              # confirms the key + models actually work
npm run db:init                # only if DATABASE_URL is set
npm run dev                    # http://localhost:3000
```

Minimum `.env` to get AI verdicts:

```
GEMINI_API_KEY=your-key-here
```

Get a free Gemini key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
`npm run verify:ai` lists the models your key can reach, checks the configured model is one of
them, and runs a real scam check with timing — run it before you demo, not during.

### Environment

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | for AI verdicts | Free tier — get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Server-side only. Without it, Check falls back to offline rules and the Drill is disabled. |
| `DATABASE_URL` | no | Postgres connection string. Without it, alerts and drill scores go to an in-memory store. |
| `RATE_LIMIT_PER_MIN` | no | Per-IP cap on `/api` routes. Default 20. |
| `GEMINI_ANALYSIS_MODEL` | no | Comma-separated fallback chain for Check. Default `gemini-2.5-flash,gemini-3.1-flash-lite`. |
| `GEMINI_CHAT_MODEL` | no | Chain for drill turns. Default `gemini-flash-lite-latest,gemini-2.5-flash`. |
| `GEMINI_COACH_MODEL` | no | Chain for the score card. Default `gemini-3.1-flash-lite,gemini-2.5-flash`. |

`GET /api/health` reports which subsystems are actually live (`storage: postgres | memory | error`,
`ai: configured | missing-key`), so a degraded deploy is visible before a demo rather than during one.

### Database

Plain PostgreSQL via `pg` — no ORM, no hosted-vendor SDK. Any Postgres works (local, Neon,
Vercel Postgres, RDS). Schema is in [`db/schema.sql`](db/schema.sql); `npm run db:init` applies it
and is safe to re-run.

Four tables: `users`, `family_links`, `alerts`, `drill_sessions`.

---

## Architecture

```
Phone browser / installed PWA
        |
Next.js 14 App Router + Tailwind        <- Check | Fire Drill | Family | EN-HI toggle
        |
Next.js API routes (serverless)
  POST /api/check           scam analysis (text or image)
  POST /api/drill/start     opening scammer message
  POST /api/drill/turn      one roleplay turn
  POST /api/drill/score     coach score card
  POST /api/alert           raise a family alert
  GET  /api/alert           guardian dashboard feed
  PATCH /api/alert          mark an alert handled
  GET  /api/health          CI smoke target
        |
  Guardrails: PII redaction | zod validation | rate limit | injection defence | rules fallback
        |
Gemini API  ----------------  PostgreSQL
```

**Models.** Google Gemini on the free tier, via the `@google/genai` SDK. Each of the three roles
has its own ordered **fallback chain** — the first model that answers wins, so a 503 or a quota
429 tries the next model before anything degrades. Chains were picked by measurement, not by
version number: `gemini-3.8-flash` and `gemini-flash-latest` both returned 503 "high demand" on
build day, while the 2.5 and lite models answered fine.

| Role | Chain | Why |
|---|---|---|
| Check | `gemini-2.5-flash` → `gemini-3.1-flash-lite` | Accuracy: this is the verdict users act on |
| Drill turn | `gemini-flash-lite-latest` → `gemini-2.5-flash` | Latency: ~1.5s keeps the roleplay alive |
| Score card | `gemini-3.1-flash-lite` → `gemini-2.5-flash` | 2.5-flash spent ~950 thinking tokens for ~100 tokens of output; the lite model grades identically in ~35% less time |

No `thinkingConfig` is sent. The generations disagree about it — `thinkingBudget: 0` is a 400 on
3.x lite models and `thinkingLevel` is a 400 on 2.5 — so omitting it is the only form valid
across a chain spanning both.

**Score-card latency is hidden, not just reduced.** Scoring starts the moment the drill ends, so
it runs while the user reads the scammer's last message. By the time they tap "hang up" the
result is usually already there — measured 0ms perceived wait after 3s of reading, against ~4s
of real work.

Structured output is constrained server-side with `responseJsonSchema`, generated from the same
Zod schemas in [`lib/schema.ts`](lib/schema.ts) via `z.toJSONSchema()`. Responses are then
re-validated with Zod before reaching the UI, so a drifted response cannot render.

The provider is isolated to [`lib/llm.ts`](lib/llm.ts) — prompts, schemas, routes and UI are
provider-agnostic, so swapping models is a one-file change.

### Guardrails

Each of these exists because a specific thing goes wrong without it:

- **PII redaction** ([`lib/redact.ts`](lib/redact.ts)) — OTPs, phone, card, account, UPI and email
  patterns are masked *before* any text leaves the process. The model sees `[OTP]`, never the code.
- **Prompt-injection defence** ([`lib/prompts.ts`](lib/prompts.ts)) — untrusted text is wrapped in
  `<message>` tags and every prompt states that content inside is data. A message that tries to
  instruct the model is treated as *evidence of a scam*, not as an instruction.
- **Schema validation** — every model response is constrained and parsed. The UI cannot render
  malformed output.
- **Rules fallback** ([`lib/fallback.ts`](lib/fallback.ts)) — if the API is down, slow, quota-limited
  or safety-blocked, Check still returns a real verdict from keyword and pattern rules, and the
  response says `source: "rules"` so the downgrade is never silent.
- **Safety-filter handling** — Kavach quotes scam text verbatim and role-plays a scammer, which
  default safety thresholds sometimes block. Thresholds are set to `BLOCK_ONLY_HIGH`, and anything
  still blocked is caught and routed to the fallback rather than failing the request.
- **Drill safety** — a deterministic check breaks character the moment the user types something
  that looks like a real secret, rather than trusting the model to catch it. Every drill screen is
  labelled `SIMULATION`.
- **Rate limiting** — per-IP, per-minute, on every `/api` route.

### Privacy

Raw message text is never persisted. `alerts` stores the verdict, score, tactic tags and a
reason summary — nothing else. The API key is server-side only and never reaches the client.

---

## Accuracy — read this before quoting a number

`npm test` prints **offline-rules accuracy: 20/20** on [`tests/scam-set.json`](tests/scam-set.json).

That number is the **offline fallback**, not the model, and the rules were tuned against that
same 20-message set — so it measures "the offline path still works", not real-world accuracy.
Quoting it as a headline accuracy figure would be dishonest.

To measure the model honestly, run it against messages it has not been tuned on, with a key set.
Published LLM phishing-detection results (e.g. ChatSpamDetector's 99.70%) are on **email**
datasets and do not transfer to Hindi/Hinglish SMS and WhatsApp — measure your own.

---

## Accessibility

The visual language is deliberately high-contrast neon-on-indigo, but the accessibility floor
from the brief is enforced, not traded away:

- Body text never below 18px (`base` is overridden to `1.125rem` in the Tailwind theme).
- Every interactive target clears 56px; nav targets clear 44px.
- Verdicts are announced with `aria-live` and take focus when they appear.
- Colour is never the only signal — every verdict carries a word and a number too.
- `prefers-reduced-motion` is respected.
- Bottom tab bar on phones with safe-area insets.

---

## Limitations, stated openly

- **LLMs get things wrong.** Kavach is advisory. It defaults to `SUSPICIOUS` when uncertain and
  never claims certainty.
- **The offline fallback is weaker in Hindi** than English; it covers common Devanagari scam
  keywords but is a safety net, not a replacement for the model.
- **The in-memory store is not shared** across serverless instances. Set `DATABASE_URL` for any
  real use.
- **Rate limiting is per-instance**, so the effective limit on serverless is higher than configured.
  Fine for protecting a demo budget; swap in Redis for anything real.
- **Family alerts are in-app only.** Real push / WhatsApp delivery is not implemented.
- **Free-tier quota is a real demo risk.** Gemini's free tier rate-limits per minute and per day.
  A burst of demo traffic returns 429, which Check absorbs into the rules fallback but which
  disables the Fire Drill for that minute. Warm the demo up early and avoid hammering it.
- **The research below supports the approach, not this implementation.** None of it measures Kavach.

---

## Research foundation

The Fire Drill is built on inoculation theory: practising against weakened attacks builds
resistance that reading tips does not.

| Work | Used for |
|---|---|
| Roozenbeek, van der Linden & Nygren (2020), *HKS Misinformation Review* | Drills teach **tactics**, not individual examples |
| Basol, Roozenbeek & van der Linden (2020), *Journal of Cognition* | Score card emphasises what the user **caught**, to build confidence |
| Maertens et al. (2020), *J. Exp. Psychology: Applied* | Protection decays without repetition → booster drills |
| Stajano & Wilson (2011), *CACM* — Understanding scam victims | The seven-principle **tactic taxonomy**; blame-free wording |
| ScamPilot (CHI 2026), arXiv:2601.22426 | Including a **genuine** scenario so users do not become indiscriminately suspicious |
| Experiencer, Helper, or Observer (CHI 2026), arXiv:2601.12324 | Fire Drill = the Experiencer role |
| Koide et al. (2024), *SecureComm* — ChatSpamDetector | Always return **reasons**, never a bare verdict |
| Jiang (2024), arXiv:2402.03147 | Measure per language and channel with your own test set |

Author lists for arXiv-only and CHI 2026 entries were not verified while writing this — confirm
before citing in slides.

---

## CI/CD

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint, typecheck, tests and build on
every PR. On `main` it additionally smoke-tests the deployed `/api/health` and posts a known scam
message to `/api/check`, asserting the verdict is not `SAFE`.

Set `PROD_URL` as a repo secret. Deployment is Vercel's Git integration — previews per branch,
production on `main`.

---

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zod · Google Gemini (`@google/genai`) ·
PostgreSQL (`pg`) · Vitest · Vercel

---

For real fraud, call **1930** or report at **[cybercrime.gov.in](https://cybercrime.gov.in)**.
