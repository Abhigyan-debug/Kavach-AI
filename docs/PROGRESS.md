# Progress

Last updated: **15 October 2026**

## Done

- **Core app (20 Sep 2026, HackDay 1.0):** Check, Fire Drill, Helper mode, Family Loop, `/benchmark`,
  Hindi/English, voice in/out, streak, 1930 report action. Deployed at
  https://kavach-ai-lilac.vercel.app and verified in production.
- **Docs moved into `docs/`** (15 Oct 2026). README links rewritten to `../` and checked.
- **Security patch: Next.js 14.2.15 → 14.2.35** (15 Oct 2026). Fixes CVE-2025-55184, a
  high-severity denial of service affecting App Router apps. Verified locally; **not yet deployed**.
- **Milestone 4: Motion + anime.js foundation** (15 Oct 2026). Installed and proven on the landing
  page's "How it works" section: circuit traces (anime.js) and HUD corner brackets (Motion).
  Landing page JavaScript **121 → 139 kB (+18 kB, budget +25 kB)**; measured in a real browser.
- **Milestone 5: robotics theme** (15 Oct 2026). Graphite-steel palette with lime as the "power on"
  signal; boot intro (logo draws, letters grow, logo flies into the header); radar reticle hero;
  growing headline words; telemetry labels; CSS scroll-progress bar; laser-scan state on Check;
  HUD frames on cards. Every page within the +25 kB budget; verified in a real browser.
- **Accuracy page in plain language, English and Hindi** (15 Oct 2026). Previously English-only and
  full of jargon. `<html lang>` now follows the language toggle (it was always `en`).

## In progress — Milestone 1: auth backbone

| Step | Status |
|---|---|
| Install `better-auth` pinned to `1.7.9` | ✅ done |
| `lib/auth.ts`, `app/api/auth/[...all]/route.ts`, `lib/auth-client.ts` | ✅ written, typecheck + lint pass |
| Build still passes with **no** env vars (CI simulation) | ✅ verified |
| `npm ci` still succeeds (what CI runs) | ✅ verified |
| `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` in local `.env` | ✅ done |
| Generate Better Auth tables (SQL) | ⛔ **blocked** — see below |
| Apply tables to Neon, drop old empty `users` / `family_links` | ⛔ blocked |
| Verify sign-up + session through the API | ⛔ blocked |
| Google OAuth credentials | ✅ created and in `.env` (15 Oct 2026). Shape validated; Better Auth loads them (its "missing clientId" warning is gone) |
| Google sign-in end to end | ⛔ blocked — first login creates the user row, so it needs the database |

## Blocked

**The development machine's current network blocks outbound port 5432** (the Postgres port).
Evidence (15 Oct 2026): TCP to the Neon host on port 443 succeeds, on 5432 fails; `pg` reports
`ETIMEDOUT`. Production is unaffected — Vercel's `/api/health` returns `"storage":"postgres"`.

The Better Auth CLI can only generate Postgres SQL against a live database, so schema generation
is blocked too. Ways forward: use a network that allows 5432 (e.g. a phone hotspot), start Docker
Desktop for a throwaway local Postgres, or run the SQL in Neon's web SQL editor (port 443).

## Planned

- **M2** — login page, header session state, `/family` protection (Google + email/password)
- **M2.5** — transactional email (Resend) for verification and password reset
- **M3** — guardian family link; alerts visible only to their guardian (**closes a privacy hole**:
  today `GET /api/alert` returns every alert to anyone)

## Known issues

- The PWA icons (`public/icon*.png`, `apple-touch-icon.png`) still have the old purple plaque.
  Regenerating them needs an SVG renderer; not yet done.
- `next/font` downloads Google Fonts at build time; one build failed on a bad font response and
  passed on retry. If it recurs, self-host the fonts with `next/font/local`.
- `better-auth` needed `--legacy-peer-deps` once: it lists SvelteKit as an *optional* peer, whose
  Vite 8 requirement clashes with Vitest's Vite 5. Plain `npm install` and `npm ci` both pass after.
