# Technical decisions

Each entry: what was decided, why, and what else was considered.

## Gemini instead of Claude (20 Sep 2026)
**Why:** the team needed a free tier for a one-day hackathon; Anthropic's API has none.
**Considered:** Claude (blueprint's original choice, ~$5–15 for the day), no AI at all (rules only).
Only `lib/llm.ts` talks to a model, so switching back is a one-file change.

## Plain PostgreSQL via `pg`, no ORM, no Supabase (20 Sep 2026)
**Why:** the team ruled out Supabase; raw SQL keeps the schema readable in one file
(`db/schema.sql`). **Considered:** Prisma, Drizzle — more setup than the four tables needed.

## Model fallback chains (20 Sep 2026)
**Why:** measured on build day, `gemini-3.8-flash` and `gemini-flash-latest` returned 503 "high
demand". Each role now has an ordered chain; overload, quota and config errors try the next model.
**Considered:** a single model ID — a single point of failure in front of judges.

## No `thinkingConfig` sent to Gemini (20 Sep 2026)
**Why:** `thinkingBudget: 0` is rejected (400) by 3.x lite models and `thinkingLevel` is rejected
by 2.5; omitting it is the only form valid across a chain spanning both. Measured, not assumed.

## `postcss.config.js` must be CommonJS (20 Sep 2026)
**Why:** Next 14 does not reliably load `postcss.config.mjs`. When ignored, the build passes with
**zero CSS and no error**. CI now asserts that CSS was emitted.

## Better Auth for authentication (15 Oct 2026)
**Why:** the team wants email + password **and** Google. Better Auth includes password hashing and
both methods; it plugs into the existing `pg` pool. Auth.js is in maintenance mode and its own
migration guide recommends Better Auth for new projects.
**Considered:** Auth.js (fine for Google-only, weak for passwords), Clerk (hosted, user data on a
third party), Supabase (ruled out). Pinned to `1.7.9` because that release was published the
same day it was installed.

## Login only for guardians; Check / Drill / Helper stay public (15 Oct 2026)
**Why:** the primary user is an elder who has just received a frightening message — a login wall
at that moment means they give up. NN/g research: login walls are justified only where personal or
shared data lives. The Family dashboard is the shared data, so only it is protected.

## Elders get no account; guardians share a revocable family link (planned, M3)
**Why:** older users often change phones and email addresses, so password recovery is a known pain
point; no account means nothing to recover. Adjacent family-sharing designs agree on explicit
opt-in and revocation that ends access immediately.
**Threat model:** the link lets its holder *send* alerts to a guardian, never *read* them. Reading
requires the guardian's login.

## Reuse the existing Postgres pool for auth (15 Oct 2026)
**Why:** `lib/db.ts` already handles Neon's SSL requirement; a second pool would duplicate that and
open extra connections. **Trade-off:** with no `DATABASE_URL`, auth gets an empty pool so the build
still passes, but sign-in fails at runtime. Documented in a `shortcut:` comment in `lib/auth.ts`.

## Upgrade Next.js to 14.2.35, not to 15 or 16 (15 Oct 2026)
**Why:** npm flagged 14.2.15 as vulnerable. The official advisory names **14.2.35** as the fix for
the 14.x line (CVE-2025-55184, high-severity denial of service on App Router endpoints; there is no
workaround). 14.2.34 is also flagged — it carried the first, incomplete fix — so "the newest patch"
had to be checked, not assumed.
**Considered:** jumping to Next 15/16 — a major upgrade with breaking changes, out of scope for a
security fix. `eslint-config-next` was bumped to the same version to stay matched.

## Motion and anime.js, each with its own job (15 Oct 2026)
**Why:** the team asked for both. Two animation libraries are only sensible if they never overlap,
so the rule is **one element, one library**: Motion for anything tied to React state (entrances,
gestures, exit animations); anime.js for SVG line drawing and timelines. Both on one element would
fight over `transform` and stutter.

## Measure on one section before applying everywhere (15 Oct 2026)
**Why:** if every page were redesigned first, a slowdown would be buried under many changes.
Measuring the first section caught a **+47 kB** regression immediately.

## Import `m` from `motion/react-m`, never from `motion/react` (15 Oct 2026)
**Why:** measured. Importing `m` from the `motion/react` barrel pulled in Motion's layout and
AnimatePresence engine (~45 KB) even inside `LazyMotion`, because the bundler cannot tree-shake
that entry point. Switching the import took the landing page from **168 kB to 139 kB**.
`LazyMotion` is set to `strict`, so using the heavy `motion` component inside it throws.

## Circuit trace is desktop-only and loads anime.js on demand (15 Oct 2026)
**Why:** its three nodes line up over a three-column grid, which only exists on wide screens. On
phones the SVG is `display:none`, so it never intersects the viewport and **anime.js is never
downloaded** — verified. On desktop, `import("animejs")` runs only when the trace scrolls into view.

## Robotics palette: graphite steel, lime kept (15 Oct 2026)
**Why:** purple-indigo read as "web3" (the original reference was a web3 site). Graphite steel reads
as machinery; lime stays as the single "power on" signal and matches the logo. Every text/background
pair was checked against WCAG AA (all pass; muted text on cards is 7.9:1).

## Boot intro: once per session, landing page only, skippable (15 Oct 2026)
**Why:** the team asked for an animated logo that moves into the header. The primary user may be
anxious about a scam, so the intro is ~2s, skippable (tap, Skip, Escape), shown once per session,
landing page only, and never with reduced motion.
**How it avoids a flash:** a pre-paint inline script sets `data-intro="on"` on `<html>` before React
loads. **Failsafe:** CSS hides the overlay after 5s even if JavaScript never runs.
**Precision:** the intro logo is laid out at exactly 2.5x the header logo, so scaling by the
measured ratio lands it within 1px (verified at 1280px and 390px).

## Scroll-progress bar in CSS, not Motion (15 Oct 2026)
**Why:** measured. A Motion version in the header put Motion's runtime on **every** page —
`/family` and `/benchmark` grew ~20 kB each for a 2px bar. CSS scroll-driven animations
(`animation-timeline: scroll()`) do it with zero JavaScript; unsupported browsers just omit it.

## Split Hindi text with Intl.Segmenter (15 Oct 2026)
**Why:** `Array.from("सुरक्षित")` yields 8 pieces with floating vowel signs; the segmenter yields the
4 characters a reader sees. Letter-by-letter animation needs the latter.

## Accuracy page written for ordinary people, in both languages (15 Oct 2026)
**Why:** the page read like a research paper ("exact-label accuracy", "corpora") and ignored the
Hindi toggle. It is now plain language in English and Hindi, with every number taken from
`public/benchmark.json` so the sentences stay true if the test is re-run. The honest caveats stay,
reworded; the developer command is a small footnote.

## Hindi labels keep normal letter-spacing (15 Oct 2026)
**Why:** Devanagari letters join along a continuous top line (shirorekha). The wide spacing that
gives English labels their robotic look tears Hindi words apart. `html[lang="hi"] .telemetry`
resets it, which required `<html lang>` to actually follow the toggle.

## Configurable `distDir` for verification builds (15 Oct 2026)
**Why:** a verification build deleted `.next` while the developer's `next dev` was using it,
crashing the dev server. `next.config.mjs` now reads `NEXT_DIST_DIR`, so verification builds go to
`.next-verify`. Unset on Vercel, so production still uses `.next`. `tsconfig.json` permanently lists
`.next-verify/types`, because Next rewrites the whole file whenever that entry is missing.

## `--legacy-peer-deps` for one install (15 Oct 2026)
**Why:** `better-auth` lists SvelteKit as an optional peer; SvelteKit 3 requires Vite 8, Vitest 2
uses Vite 5. Kavach does not use SvelteKit. **Verified** that plain `npm install` and `npm ci`
both succeed afterwards, so no project-wide `.npmrc` override was added — that would have hidden
genuine peer conflicts in future.
