# Architecture

## Components

```
Browser (phone or desktop, installable PWA)
   │
   │  Pages: / · /check · /drill · /helper · /family · /benchmark
   │  lib/auth-client.ts  ── browser auth helpers (no secrets)
   ▼
Next.js 14 App Router on Vercel (serverless)
   │
   ├── /api/check            scam analysis (text or image)
   ├── /api/drill/*          scammer role-play + coach score
   ├── /api/helper/turn      helper-mode role-play
   ├── /api/alert            family alerts (GET / POST / PATCH)
   ├── /api/health           which subsystems are live
   └── /api/auth/[...all]    every auth endpoint (Better Auth)      ← new, M1
          │
          │  lib/auth.ts  ── server-only: DB connection + secrets
          ▼
   ┌──────────────────┐        ┌──────────────────────────────┐
   │  Google Gemini   │        │  PostgreSQL (Neon)           │
   │  model chains    │        │  alerts, drill_sessions      │
   └──────────────────┘        │  + auth tables (pending)     │
                               └──────────────────────────────┘
```

## Request flow — checking a message

1. Browser posts text to `/api/check`.
2. `lib/redact.ts` masks OTPs, phone, card, account, UPI and email values.
3. `lib/prompts.ts` wraps the text in `<message>` tags as untrusted data.
4. `lib/llm.ts` calls Gemini with a JSON schema; on 503/429 it tries the next model in the chain.
5. The response is re-validated with Zod (`lib/schema.ts`).
6. If every model fails, `lib/fallback.ts` returns a rules-based verdict marked `source: "rules"`.

## Request flow — signing in (M1, not yet verified end to end)

```
Email + password                         Google
────────────────                         ──────
browser → POST /api/auth/sign-up/email   browser → /api/auth/sign-in/social
        → Better Auth hashes password            → redirect to Google
        → rows in user + account                 → Google redirects to
        → row in session                           /api/auth/callback/google?code=…
        → Set-Cookie (httpOnly)                  → server swaps code for profile
                                                 → rows in user + account + session
                                                 → Set-Cookie (httpOnly)
```

## Security boundaries

| Boundary | Enforced by |
|---|---|
| Secrets never reach the browser | `lib/auth.ts` and `lib/llm.ts` are imported only by server routes; browser code imports `lib/auth-client.ts` |
| Raw messages never stored | `/api/alert` stores verdict, score, tactics and a summary only |
| Untrusted text cannot instruct the model | `<message>` wrapping + injection guard in every prompt |
| Model output cannot break the UI | JSON schema at generation time, Zod validation after |
